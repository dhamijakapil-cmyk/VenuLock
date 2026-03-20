"""
VenuLoQ — HR Management API
=============================
HR-specific endpoints for staff verification, onboarding oversight,
document management, and team management. Handles ALL employee types.

ENDPOINTS:
  GET   /hr/dashboard                          — HR dashboard stats
  GET   /hr/staff                              — All staff with verification status
  GET   /hr/pending                            — Employees awaiting verification
  PATCH /hr/verify/{user_id}                   — Approve or reject an employee
  GET   /hr/employee/{user_id}/documents       — Get document checklist for employee
  POST  /hr/employee/{user_id}/documents       — Upload a document for employee
  PATCH /hr/employee/{user_id}/documents/{doc_id} — Mark document verified/unverified
  DELETE /hr/employee/{user_id}/documents/{doc_id} — Delete a document
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone

from config import db
from models import RMVerificationAction
from utils import require_role, generate_id, create_notification

router = APIRouter(prefix="/hr", tags=["hr"])

# All roles HR manages (excludes admin and customer)
MANAGED_ROLES = ["rm", "hr", "venue_owner", "event_planner", "finance", "operations", "marketing", "venue_specialist", "vam"]

# Standard document checklist
DOCUMENT_TYPES = [
    {"key": "id_proof", "label": "ID Proof (Aadhaar / PAN)"},
    {"key": "offer_letter", "label": "Offer Letter (Signed)"},
    {"key": "bank_details", "label": "Bank Details"},
    {"key": "address_proof", "label": "Address Proof"},
    {"key": "emergency_contact", "label": "Emergency Contact Form"},
    {"key": "educational_certs", "label": "Educational Certificates"},
    {"key": "background_verification", "label": "Background Verification"},
]


def _now():
    return datetime.now(timezone.utc).isoformat()


@router.get("/document-types")
async def get_document_types(user: dict = Depends(require_role("hr", "admin"))):
    """Return the standard document checklist template."""
    return {"document_types": DOCUMENT_TYPES}


@router.get("/dashboard")
async def hr_dashboard(user: dict = Depends(require_role("hr", "admin"))):
    """HR dashboard with key stats across all employee types."""
    role_filter = {"role": {"$in": MANAGED_ROLES}}

    total_staff = await db.users.count_documents(role_filter)
    pending = await db.users.count_documents({**role_filter, "verification_status": "pending"})
    verified = await db.users.count_documents({**role_filter, "verification_status": "verified"})
    rejected = await db.users.count_documents({**role_filter, "verification_status": "rejected"})
    profile_incomplete = await db.users.count_documents({**role_filter, "profile_completed": {"$ne": True}})

    # Document stats
    docs_pending = await db.onboarding_documents.count_documents({"status": "pending"})
    docs_verified = await db.onboarding_documents.count_documents({"status": "verified"})

    return {
        "total_staff": total_staff,
        "pending_verifications": pending,
        "verified": verified,
        "rejected": rejected,
        "profile_incomplete": profile_incomplete,
        "docs_pending": docs_pending,
        "docs_verified": docs_verified,
    }


@router.get("/staff")
async def get_all_staff(
    status: str = None,
    role: str = None,
    user: dict = Depends(require_role("hr", "admin")),
):
    """List all managed staff with their verification/profile status."""
    query = {"role": {"$in": MANAGED_ROLES}}
    if status:
        query["verification_status"] = status
    if role:
        query["role"] = role

    staff = await db.users.find(
        query,
        {"_id": 0, "password_hash": 0},
    ).sort("created_at", -1).to_list(200)

    # Attach document counts per employee
    for s in staff:
        doc_count = await db.onboarding_documents.count_documents({"user_id": s["user_id"]})
        verified_count = await db.onboarding_documents.count_documents({"user_id": s["user_id"], "status": "verified"})
        s["docs_uploaded"] = doc_count
        s["docs_verified"] = verified_count
        s["docs_total_required"] = len(DOCUMENT_TYPES)

    return {"staff": staff, "total": len(staff)}


@router.get("/pending")
async def get_pending_verifications(user: dict = Depends(require_role("hr", "admin"))):
    """List employees pending HR verification (profile must be completed)."""
    pending = await db.users.find(
        {"role": {"$in": MANAGED_ROLES}, "verification_status": "pending", "profile_completed": True},
        {"_id": 0, "password_hash": 0},
    ).sort("created_at", -1).to_list(100)

    for s in pending:
        doc_count = await db.onboarding_documents.count_documents({"user_id": s["user_id"]})
        verified_count = await db.onboarding_documents.count_documents({"user_id": s["user_id"], "status": "verified"})
        s["docs_uploaded"] = doc_count
        s["docs_verified"] = verified_count
        s["docs_total_required"] = len(DOCUMENT_TYPES)

    return {"pending": pending, "total": len(pending)}


@router.patch("/verify/{user_id}")
async def verify_employee(
    user_id: str,
    body: RMVerificationAction,
    user: dict = Depends(require_role("hr", "admin")),
):
    """Approve or reject an employee's profile."""
    emp = await db.users.find_one(
        {"user_id": user_id, "role": {"$in": MANAGED_ROLES}},
        {"_id": 0}
    )
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if body.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")

    now = _now()
    new_status = "verified" if body.action == "approve" else "rejected"
    role_label = emp["role"].replace("_", " ").title()

    update = {
        "verification_status": new_status,
        "verified_by": user["user_id"],
        "verified_by_name": user["name"],
        "verified_at": now,
        "updated_at": now,
    }

    if body.action == "approve":
        update["status"] = "active"
    else:
        update["status"] = "inactive"
        if body.notes:
            update["rejection_reason"] = body.notes

    await db.users.update_one({"user_id": user_id}, {"$set": update})

    if body.action == "approve":
        await create_notification(
            user_id,
            "Profile Verified",
            "Your profile has been verified by HR. You can now log in.",
            "verification",
        )
    else:
        reason = f" Reason: {body.notes}" if body.notes else ""
        await create_notification(
            user_id,
            "Profile Verification Update",
            f"Your profile verification was not approved.{reason} Please contact HR.",
            "verification",
        )

    return {
        "message": f"{role_label} {'approved' if body.action == 'approve' else 'rejected'} successfully",
        "user_id": user_id,
        "verification_status": new_status,
    }


# ============== DOCUMENT MANAGEMENT ==============

@router.get("/employee/{user_id}/documents")
async def get_employee_documents(user_id: str, user: dict = Depends(require_role("hr", "admin"))):
    """Get all documents for an employee, mapped against the standard checklist."""
    emp = await db.users.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "role": 1})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    docs = await db.onboarding_documents.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("uploaded_at", -1).to_list(50)

    # Build checklist with status
    checklist = []
    uploaded_keys = {d["doc_type"]: d for d in docs}
    for dt in DOCUMENT_TYPES:
        doc = uploaded_keys.get(dt["key"])
        checklist.append({
            "doc_type": dt["key"],
            "label": dt["label"],
            "uploaded": doc is not None,
            "status": doc["status"] if doc else "missing",
            "document": doc,
        })

    return {
        "user_id": user_id,
        "employee_name": emp.get("name"),
        "employee_role": emp.get("role"),
        "checklist": checklist,
        "total_required": len(DOCUMENT_TYPES),
        "total_uploaded": len(docs),
        "total_verified": sum(1 for d in docs if d.get("status") == "verified"),
    }


@router.post("/employee/{user_id}/documents")
async def upload_document(user_id: str, request: Request, user: dict = Depends(require_role("hr", "admin"))):
    """HR uploads a document for an employee."""
    emp = await db.users.find_one({"user_id": user_id}, {"_id": 0, "user_id": 1})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    body = await request.json()
    doc_type = body.get("doc_type")
    file_name = body.get("file_name", "document")
    file_data = body.get("file_data")  # base64 encoded
    notes = body.get("notes", "")

    valid_types = [dt["key"] for dt in DOCUMENT_TYPES]
    if doc_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid document type. Must be one of: {', '.join(valid_types)}")

    if not file_data:
        raise HTTPException(status_code=400, detail="No file data provided")

    # Check if document of this type already exists — replace it
    existing = await db.onboarding_documents.find_one(
        {"user_id": user_id, "doc_type": doc_type}, {"_id": 0}
    )

    now = _now()
    if existing:
        await db.onboarding_documents.update_one(
            {"doc_id": existing["doc_id"]},
            {"$set": {
                "file_name": file_name,
                "file_data": file_data,
                "status": "pending",
                "notes": notes,
                "uploaded_by": user["user_id"],
                "uploaded_by_name": user["name"],
                "uploaded_at": now,
                "verified_by": None,
                "verified_at": None,
            }}
        )
        doc_id = existing["doc_id"]
    else:
        doc_id = generate_id("doc_")
        doc = {
            "doc_id": doc_id,
            "user_id": user_id,
            "doc_type": doc_type,
            "file_name": file_name,
            "file_data": file_data,
            "status": "pending",
            "notes": notes,
            "uploaded_by": user["user_id"],
            "uploaded_by_name": user["name"],
            "uploaded_at": now,
            "verified_by": None,
            "verified_at": None,
        }
        await db.onboarding_documents.insert_one(doc)

    return {"message": "Document uploaded", "doc_id": doc_id, "doc_type": doc_type}


@router.patch("/employee/{user_id}/documents/{doc_id}")
async def update_document_status(
    user_id: str, doc_id: str, request: Request,
    user: dict = Depends(require_role("hr", "admin")),
):
    """Mark a document as verified or revert to pending."""
    body = await request.json()
    new_status = body.get("status")  # "verified" or "pending"
    if new_status not in ("verified", "pending"):
        raise HTTPException(status_code=400, detail="Status must be 'verified' or 'pending'")

    doc = await db.onboarding_documents.find_one(
        {"doc_id": doc_id, "user_id": user_id}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    now = _now()
    update = {"status": new_status}
    if new_status == "verified":
        update["verified_by"] = user["user_id"]
        update["verified_by_name"] = user["name"]
        update["verified_at"] = now

    await db.onboarding_documents.update_one({"doc_id": doc_id}, {"$set": update})

    return {"message": f"Document marked as {new_status}", "doc_id": doc_id}


@router.delete("/employee/{user_id}/documents/{doc_id}")
async def delete_document(
    user_id: str, doc_id: str,
    user: dict = Depends(require_role("hr", "admin")),
):
    """Delete a document from an employee's record."""
    result = await db.onboarding_documents.delete_one({"doc_id": doc_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted"}
