"""
Train freshness classifier for small datasets with staged fine-tuning.

Example:
python train_freshness.py ^
  --train-dir C:\\data\\freshness\\train ^
  --valid-dir C:\\data\\freshness\\valid ^
  --output-dir C:\\data\\freshness\\artifacts ^
  --frontend-labels C:\\repo\\test1\\frontend\\public\\tfjs_model\\labels.json ^
  --input-size 224 ^
  --epochs-head 18 ^
  --epochs-ft 24 ^
  --unfreeze-layers 80
"""

from __future__ import annotations

import argparse
import json
import math
import os
from pathlib import Path
from typing import Dict, List, Tuple

import tensorflow as tf
from tensorflow.keras import callbacks, layers, models, regularizers
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train food freshness model")
    parser.add_argument("--train-dir", required=True, help="Directory with train class folders")
    parser.add_argument("--valid-dir", help="Directory with validation class folders")
    parser.add_argument("--output-dir", required=True, help="Artifacts output directory")
    parser.add_argument(
        "--frontend-labels",
        default="",
        help="Path to frontend labels.json to keep inference labels aligned",
    )
    parser.add_argument("--input-size", type=int, default=224)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--epochs-head", type=int, default=15)
    parser.add_argument("--epochs-ft", type=int, default=20)
    parser.add_argument("--unfreeze-layers", type=int, default=80)
    parser.add_argument("--dropout-head", type=float, default=0.5)
    parser.add_argument("--dropout-mid", type=float, default=0.35)
    parser.add_argument("--confidence-threshold", type=float, default=70.0)
    return parser.parse_args()


def make_generators(
    train_dir: str,
    valid_dir: str | None,
    input_size: int,
    batch_size: int,
):
    train_datagen = ImageDataGenerator(
        rescale=1.0 / 255.0,
        rotation_range=30,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.25,
        brightness_range=[0.75, 1.25],
        channel_shift_range=20.0,
        horizontal_flip=True,
        fill_mode="nearest",
        validation_split=0.2 if not valid_dir else 0.0,
    )

    valid_datagen = ImageDataGenerator(rescale=1.0 / 255.0)

    if valid_dir:
        train_gen = train_datagen.flow_from_directory(
            train_dir,
            target_size=(input_size, input_size),
            batch_size=batch_size,
            class_mode="categorical",
            shuffle=True,
        )
        valid_gen = valid_datagen.flow_from_directory(
            valid_dir,
            target_size=(input_size, input_size),
            batch_size=batch_size,
            class_mode="categorical",
            shuffle=False,
        )
    else:
        train_gen = train_datagen.flow_from_directory(
            train_dir,
            target_size=(input_size, input_size),
            batch_size=batch_size,
            class_mode="categorical",
            shuffle=True,
            subset="training",
        )
        valid_gen = valid_datagen.flow_from_directory(
            train_dir,
            target_size=(input_size, input_size),
            batch_size=batch_size,
            class_mode="categorical",
            shuffle=False,
            subset="validation",
        )

    return train_gen, valid_gen


def compute_class_weights(train_gen) -> Dict[int, float]:
    counts: Dict[int, int] = {}
    for class_id in train_gen.classes:
        counts[class_id] = counts.get(class_id, 0) + 1

    total = sum(counts.values())
    num_classes = len(counts)
    class_weights = {}
    for class_id, count in counts.items():
        class_weights[class_id] = total / (num_classes * max(count, 1))
    return class_weights


def build_model(num_classes: int, input_size: int, dropout_head: float, dropout_mid: float):
    base_model = MobileNetV2(
        weights="imagenet",
        include_top=False,
        input_shape=(input_size, input_size, 3),
    )
    base_model.trainable = False

    model = models.Sequential(
        [
            base_model,
            layers.GlobalAveragePooling2D(),
            layers.Dense(
                512,
                activation="relu",
                kernel_regularizer=regularizers.l2(1e-3),
            ),
            layers.Dropout(dropout_head),
            layers.Dense(256, activation="relu"),
            layers.Dropout(dropout_mid),
            layers.Dense(num_classes, activation="softmax"),
        ]
    )
    return model, base_model


def freeze_batch_norm(base_model):
    for layer in base_model.layers:
        if isinstance(layer, layers.BatchNormalization):
            layer.trainable = False


def unfreeze_top_layers(base_model, unfreeze_layers: int):
    base_model.trainable = True
    total_layers = len(base_model.layers)
    cut_idx = max(total_layers - unfreeze_layers, 0)
    for idx, layer in enumerate(base_model.layers):
        layer.trainable = idx >= cut_idx
    freeze_batch_norm(base_model)


def export_labels_json(
    labels: List[str],
    input_size: int,
    confidence_threshold: float,
    output_path: Path,
):
    display_names = {
        "apples": "Tao",
        "banana": "Chuoi",
        "cucumber": "Dua chuot",
        "meat": "Thit",
        "potato": "Khoai tay",
        "tomato": "Ca chua",
    }
    payload = {
        "model_version": "mobilenetv2-freshness-v2",
        "input_size": [input_size, input_size],
        "confidence_threshold": float(confidence_threshold),
        "labels": labels,
        "display_names": display_names,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def save_train_summary(output_dir: Path, history_head, history_ft):
    summary = {
        "head_train": history_head.history,
        "fine_tune_train": history_ft.history if history_ft else {},
    }
    (output_dir / "history.json").write_text(
        json.dumps(summary, indent=2),
        encoding="utf-8",
    )


def main():
    args = parse_args()
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
    tf.random.set_seed(42)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    train_gen, valid_gen = make_generators(
        train_dir=args.train_dir,
        valid_dir=args.valid_dir,
        input_size=args.input_size,
        batch_size=args.batch_size,
    )
    num_classes = len(train_gen.class_indices)
    labels = [None] * num_classes
    for label, index in train_gen.class_indices.items():
        labels[index] = label

    class_weights = compute_class_weights(train_gen)
    print("Class weights:", class_weights)
    print("Labels:", labels)

    model, base_model = build_model(
        num_classes=num_classes,
        input_size=args.input_size,
        dropout_head=args.dropout_head,
        dropout_mid=args.dropout_mid,
    )

    checkpoint_path = output_dir / "best_model.keras"
    callback_list = [
        callbacks.ModelCheckpoint(
            filepath=str(checkpoint_path),
            monitor="val_accuracy",
            mode="max",
            save_best_only=True,
            verbose=1,
        ),
        callbacks.EarlyStopping(
            monitor="val_accuracy",
            mode="max",
            patience=8,
            restore_best_weights=True,
            verbose=1,
        ),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            mode="min",
            factor=0.2,
            patience=3,
            min_lr=1e-7,
            verbose=1,
        ),
    ]

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=0.05),
        metrics=["accuracy"],
    )
    print("\n=== Stage 1: train classifier head ===")
    history_head = model.fit(
        train_gen,
        validation_data=valid_gen,
        epochs=args.epochs_head,
        callbacks=callback_list,
        class_weight=class_weights,
        verbose=1,
    )

    print("\n=== Stage 2: fine-tune backbone top layers ===")
    unfreeze_top_layers(base_model, args.unfreeze_layers)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=0.03),
        metrics=["accuracy"],
    )
    history_ft = model.fit(
        train_gen,
        validation_data=valid_gen,
        epochs=args.epochs_ft,
        callbacks=callback_list,
        class_weight=class_weights,
        verbose=1,
    )

    best_model = tf.keras.models.load_model(checkpoint_path)
    eval_loss, eval_acc = best_model.evaluate(valid_gen, verbose=0)
    print(f"Validation accuracy: {eval_acc:.4f}, loss: {eval_loss:.4f}")

    save_train_summary(output_dir, history_head, history_ft)

    labels_output = output_dir / "labels.json"
    export_labels_json(
        labels=labels,
        input_size=args.input_size,
        confidence_threshold=args.confidence_threshold,
        output_path=labels_output,
    )
    print(f"Saved labels config: {labels_output}")

    if args.frontend_labels:
        frontend_labels_path = Path(args.frontend_labels)
        export_labels_json(
            labels=labels,
            input_size=args.input_size,
            confidence_threshold=args.confidence_threshold,
            output_path=frontend_labels_path,
        )
        print(f"Updated frontend labels config: {frontend_labels_path}")

    # Optional export for tfjs conversion workflow.
    saved_model_dir = output_dir / "saved_model"
    best_model.export(saved_model_dir)
    print(f"SavedModel exported at: {saved_model_dir}")

    print(
        "\nNext step (if tensorflowjs_converter is installed):\n"
        f"tensorflowjs_converter --input_format=tf_saved_model --output_format=tfjs_graph_model "
        f"\"{saved_model_dir}\" \"{Path(args.frontend_labels).parent if args.frontend_labels else 'tfjs_model_out'}\""
    )


if __name__ == "__main__":
    main()
