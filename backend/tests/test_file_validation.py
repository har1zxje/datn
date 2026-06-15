from io import BytesIO
from pathlib import Path
import os
import sys

import pytest
from fastapi import HTTPException, UploadFile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DATABASE_URL", "sqlite:///./freshfood_test.db")

from utils.file_validation import validate_image_upload_sync


def _upload(filename: str, content: bytes) -> UploadFile:
    return UploadFile(file=BytesIO(content), filename=filename)


def test_validate_image_upload_sync_accepts_valid_png_and_restores_stream_position():
    content = b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\rIHDR" + (b"\x00" * 32)
    upload = _upload("product.png", content)
    upload.file.seek(7)

    validate_image_upload_sync(upload, allowed_extensions={".png"})

    assert upload.file.tell() == 7
    assert upload.file.read() == content[7:]


def test_validate_image_upload_sync_rejects_spoofed_extension():
    upload = _upload("spoofed.png", b"not really an image")

    with pytest.raises(HTTPException) as exc_info:
        validate_image_upload_sync(upload, allowed_extensions={".png"})

    assert exc_info.value.status_code == 400
    assert "không phải ảnh hợp lệ" in exc_info.value.detail
