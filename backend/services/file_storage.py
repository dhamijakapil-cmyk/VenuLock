"""
File Storage Abstraction for VenuLoQ — Phase 17
Abstracts file storage behind a clean interface.
Currently backed by local filesystem. Ready for drop-in swap to S3/GCS.
Metadata is always stored separately in MongoDB (file_metadata collection).
"""
import os
import uuid
import logging
from datetime import datetime, timezone

logger = logging.getLogger("file_storage")

UPLOAD_BASE = os.environ.get("UPLOAD_BASE", "/app/backend/uploads")
MAX_FILE_SIZE_MB = 25


class FileStorageError(Exception):
    pass


def _ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


async def store_file(db, file_bytes: bytes, filename: str, content_type: str,
                     context_type: str, context_id: str, uploaded_by: str) -> dict:
    """Store a file and record metadata.
    
    Args:
        db: MongoDB database
        file_bytes: Raw file content
        filename: Original filename
        content_type: MIME type
        context_type: 'case_share', 'venue_image', 'proposal', etc.
        context_id: Related entity ID (lead_id, venue_id, etc.)
        uploaded_by: User ID of uploader
    
    Returns:
        dict with file_id, path, size, metadata
    """
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise FileStorageError(f"File too large ({size_mb:.1f}MB). Max: {MAX_FILE_SIZE_MB}MB.")

    file_id = f"file_{uuid.uuid4().hex[:12]}"
    ext = os.path.splitext(filename)[1].lower() if '.' in filename else ''
    stored_name = f"{file_id}{ext}"

    # Store by context type for organization
    store_dir = os.path.join(UPLOAD_BASE, context_type)
    _ensure_dir(store_dir)
    file_path = os.path.join(store_dir, stored_name)

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # Store metadata separately
    metadata = {
        "file_id": file_id,
        "original_name": filename,
        "stored_name": stored_name,
        "content_type": content_type,
        "size_bytes": len(file_bytes),
        "context_type": context_type,
        "context_id": context_id,
        "uploaded_by": uploaded_by,
        "storage_backend": "local",  # 'local' | 's3' | 'gcs' when swapped
        "storage_path": file_path,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.file_metadata.insert_one(metadata)
    metadata.pop("_id", None)

    logger.info(f"Stored file {file_id} ({size_mb:.1f}MB) for {context_type}/{context_id}")
    return metadata


async def get_file_metadata(db, file_id: str) -> dict:
    """Retrieve file metadata by file_id."""
    meta = await db.file_metadata.find_one({"file_id": file_id}, {"_id": 0})
    return meta


async def get_file_path(db, file_id: str) -> str:
    """Get the storage path for serving a file."""
    meta = await get_file_metadata(db, file_id)
    if not meta:
        raise FileStorageError(f"File not found: {file_id}")
    return meta["storage_path"]
