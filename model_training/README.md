# Model Upgrade Guide (Small Dataset)

Muc tieu: tang do chinh xac voi dataset it, giu dung chuan labels cho frontend scanner.

Tai lieu danh gia do tuoi theo tieu chuan dinh luong:
- `test1/model_training/QUALITY_EVALUATION_PROTOCOL.md`

## 1) Chuan bi du lieu

Cau truc khuyen nghi:

```text
dataset/
  train/
    freshapples/
    rottenapples/
    ...
  valid/
    freshapples/
    rottenapples/
    ...
```

Neu chua co `valid/`, script se tu tach validation 20% tu `train/`.

## 2) Train + Fine-tune

```bash
cd test1/model_training
python train_freshness.py ^
  --train-dir C:\path\to\dataset\train ^
  --valid-dir C:\path\to\dataset\valid ^
  --output-dir C:\path\to\artifacts ^
  --frontend-labels C:\Users\pc\Desktop\do_an_tot_nghiep\test1\frontend\public\tfjs_model\labels.json ^
  --input-size 224 ^
  --epochs-head 18 ^
  --epochs-ft 24 ^
  --unfreeze-layers 80 ^
  --confidence-threshold 70
```

Script se:
- train stage 1 (head) + stage 2 (fine-tune backbone)
- tu dong can bang class qua `class_weight`
- luu `best_model.keras`, `saved_model/`, `history.json`
- xuat `labels.json` dong bo voi frontend

## 3) Convert sang TensorFlow.js

Sau khi train, chay converter:

```bash
tensorflowjs_converter --input_format=tf_saved_model --output_format=tfjs_graph_model ^
  C:\path\to\artifacts\saved_model ^
  C:\Users\pc\Desktop\do_an_tot_nghiep\test1\frontend\public\tfjs_model
```

## 4) Muc tieu ky thuat voi dataset nho

- Moi class nen co toi thieu 400-800 anh.
- Chup da dieu kien: nhieu anh sang, goc chup, khoang cach, nen.
- Uu tien them du lieu "gan nhau" de model hoc chi tiet:
  - `fresh` vs `halffresh`
  - `halffresh` vs `rotten`
- Dung feedback nguoi dung (scan sai) de tao vong retrain hang tuan.
