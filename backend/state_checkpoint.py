from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent.parent
CHECKPOINTS_DIR = PROJECT_ROOT / "checkpoints_db"
LATEST_FILE = CHECKPOINTS_DIR / "LATEST.txt"

DB_FILE = BACKEND_DIR / "freshfood.db"
UPLOADS_DIR = BACKEND_DIR / "uploads"


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _copy_tree(src: Path, dst: Path) -> None:
    if not src.exists():
        return
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)


def save_checkpoint(name: str | None = None) -> Path:
    CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)

    checkpoint_name = name or f"state_{_timestamp()}"
    checkpoint_dir = CHECKPOINTS_DIR / checkpoint_name
    checkpoint_dir.mkdir(parents=True, exist_ok=True)

    if not DB_FILE.exists():
        raise FileNotFoundError(f"Database not found: {DB_FILE}")

    shutil.copy2(DB_FILE, checkpoint_dir / "freshfood.db")
    _copy_tree(UPLOADS_DIR, checkpoint_dir / "uploads")

    manifest = {
        "checkpoint_name": checkpoint_name,
        "created_at": datetime.now().isoformat(),
        "db_file": str(DB_FILE),
        "uploads_dir": str(UPLOADS_DIR),
    }
    (checkpoint_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    LATEST_FILE.write_text(checkpoint_name, encoding="utf-8")
    return checkpoint_dir


def restore_checkpoint(name: str | None = None) -> Path:
    if name:
        checkpoint_name = name
    else:
        if not LATEST_FILE.exists():
            raise FileNotFoundError(
                f"Latest checkpoint marker not found: {LATEST_FILE}. "
                "Run save first."
            )
        checkpoint_name = LATEST_FILE.read_text(encoding="utf-8").strip()

    checkpoint_dir = CHECKPOINTS_DIR / checkpoint_name
    db_backup = checkpoint_dir / "freshfood.db"
    uploads_backup = checkpoint_dir / "uploads"

    if not checkpoint_dir.exists():
        raise FileNotFoundError(f"Checkpoint not found: {checkpoint_dir}")
    if not db_backup.exists():
        raise FileNotFoundError(f"Backup DB not found: {db_backup}")

    shutil.copy2(db_backup, DB_FILE)
    _copy_tree(uploads_backup, UPLOADS_DIR)
    return checkpoint_dir


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Save/restore local state checkpoint (DB + uploads)."
    )
    parser.add_argument(
        "action",
        nargs="?",
        default="save",
        choices=["save", "restore"],
        help="Action to perform. Default: save",
    )
    parser.add_argument(
        "--name",
        default=None,
        help="Checkpoint name. For restore without --name, latest checkpoint is used.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.action == "save":
        checkpoint_dir = save_checkpoint(args.name)
        print(f"Saved checkpoint: {checkpoint_dir}")
        print(f"Latest marker: {LATEST_FILE}")
        return

    checkpoint_dir = restore_checkpoint(args.name)
    print(f"Restored checkpoint: {checkpoint_dir}")


if __name__ == "__main__":
    main()

