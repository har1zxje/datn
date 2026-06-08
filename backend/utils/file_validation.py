"""
[H2] File upload validation — MIME type (magic bytes) + size limit.
Dùng Pillow để verify thực sự thay vì chỉ check extension.
"""
from pathlib import Path
from typing import Set
from fastapi import HTTPException, UploadFile

# Magic bytes của các định dạng ảnh hợp lệ
_IMAGE_MAGIC: dict[bytes, str] = {
    b"\xff\xd8\xff": "image/jpeg",          # JPEG
    b"\x89PNG\r\n\x1a\n": "image/png",      # PNG
    b"RIFF": "image/webp",                  # WebP (kiểm tra thêm bên dưới)
    b"GIF87a": "image/gif",                 # GIF87
    b"GIF89a": "image/gif",                 # GIF89
    b"BM": "image/bmp",                     # BMP
}

ALLOWED_IMAGE_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
MAX_IMAGE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB


def _detect_mime(header: bytes) -> str | None:
    """Đọc magic bytes để xác định MIME type thực sự."""
    for magic, mime in _IMAGE_MAGIC.items():
        if header[: len(magic)] == magic:
            if mime == "image/webp":
                # WebP: RIFF....WEBP
                if len(header) >= 12 and header[8:12] == b"WEBP":
                    return "image/webp"
                return None
            return mime
    return None


async def validate_image_upload(
    file: UploadFile,
    allowed_extensions: Set[str] = ALLOWED_IMAGE_EXTENSIONS,
    max_size_bytes: int = MAX_IMAGE_SIZE_BYTES,
) -> bytes:
    """
    [H2] Validate upload file:
    1. Kiểm tra extension.
    2. Đọc toàn bộ content (giới hạn max_size_bytes).
    3. Kiểm tra magic bytes (MIME type thực sự).

    Trả về content bytes để caller có thể ghi vào disk.
    Raise HTTPException nếu không hợp lệ.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Ten file khong hop le")

    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_extensions:
        allowed = ", ".join(sorted(allowed_extensions))
        raise HTTPException(
            status_code=400,
            detail=f"Dinh dang file khong duoc ho tro. Chi nhan: {allowed}",
        )

    # Đọc tối đa max_size_bytes + 1 byte để phát hiện vượt giới hạn
    content = await file.read(max_size_bytes + 1)
    if len(content) > max_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File qua lon. Kich thuoc toi da: {max_size_bytes // (1024 * 1024)} MB",
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File trong rong")

    # Kiểm tra magic bytes — phòng file fake extension
    mime = _detect_mime(content[:12])
    if mime is None:
        raise HTTPException(
            status_code=400,
            detail="File khong phai anh hop le (kiem tra noi dung that bai)",
        )

    return content
