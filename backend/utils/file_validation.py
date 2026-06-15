"""
[H2] File upload validation: extension, size limit, and real image magic bytes.
"""
from pathlib import Path
from typing import Set

from fastapi import HTTPException, UploadFile

# Known image signatures. WebP needs an extra "WEBP" check at bytes 8..11.
_IMAGE_MAGIC: dict[bytes, str] = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"RIFF": "image/webp",
    b"GIF87a": "image/gif",
    b"GIF89a": "image/gif",
    b"BM": "image/bmp",
}

ALLOWED_IMAGE_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
MAX_IMAGE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
_IMAGE_HEADER_BYTES = 12


def _detect_mime(header: bytes) -> str | None:
    """Detect the real MIME type from magic bytes."""
    for magic, mime in _IMAGE_MAGIC.items():
        if header[: len(magic)] == magic:
            if mime == "image/webp":
                if len(header) >= 12 and header[8:12] == b"WEBP":
                    return "image/webp"
                return None
            return mime
    return None


def _validate_extension(filename: str | None, allowed_extensions: Set[str]) -> str:
    if not filename:
        raise HTTPException(status_code=400, detail="Tên file không hợp lệ")

    ext = Path(filename).suffix.lower()
    if ext not in allowed_extensions:
        allowed = ", ".join(sorted(allowed_extensions))
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng file không được hỗ trợ. Chỉ nhận: {allowed}",
        )
    return ext


def _ensure_valid_image_content(header: bytes) -> None:
    if len(header) == 0:
        raise HTTPException(status_code=400, detail="File trống")

    if _detect_mime(header[:_IMAGE_HEADER_BYTES]) is None:
        raise HTTPException(
            status_code=400,
            detail="File không phải ảnh hợp lệ (kiểm tra nội dung thất bại)",
        )


def validate_image_upload_sync(
    file: UploadFile,
    allowed_extensions: Set[str] = ALLOWED_IMAGE_EXTENSIONS,
    max_size_bytes: int = MAX_IMAGE_SIZE_BYTES,
) -> None:
    """
    Sync validator for stream-copy upload flows.

    It validates extension, size, and magic bytes, then restores the original
    stream position so callers can keep using shutil.copyfileobj().
    """
    _validate_extension(file.filename, allowed_extensions)

    stream = file.file
    try:
        original_position = stream.tell()
    except (AttributeError, OSError, ValueError):
        original_position = 0

    try:
        stream.seek(0)
        header = stream.read(_IMAGE_HEADER_BYTES)
        _ensure_valid_image_content(header)

        total_size = len(header)
        while True:
            chunk = stream.read(1024 * 1024)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > max_size_bytes:
                raise HTTPException(
                    status_code=400,
                    detail=f"File quá lớn. Kích thước tối đa: {max_size_bytes // (1024 * 1024)} MB",
                )
    finally:
        stream.seek(original_position)


async def validate_image_upload(
    file: UploadFile,
    allowed_extensions: Set[str] = ALLOWED_IMAGE_EXTENSIONS,
    max_size_bytes: int = MAX_IMAGE_SIZE_BYTES,
) -> bytes:
    """
    Validate upload file:
    1. Check extension.
    2. Read the whole content (bounded by max_size_bytes).
    3. Check magic bytes.

    Returns file bytes so async callers can write them to disk directly.
    """
    _validate_extension(file.filename, allowed_extensions)

    content = await file.read(max_size_bytes + 1)
    if len(content) > max_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File quá lớn. Kích thước tối đa: {max_size_bytes // (1024 * 1024)} MB",
        )

    _ensure_valid_image_content(content[:_IMAGE_HEADER_BYTES])
    return content
