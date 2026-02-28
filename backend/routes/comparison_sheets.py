"""
Comparison Sheet routes for BookMyVenue API.
Handles generation and retrieval of venue comparison sheets.
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from typing import List

from config import db
from utils import require_role, create_audit_log
from services import comparison_sheet_service

router = APIRouter(tags=["comparison-sheets"])


@router.post("/leads/{lead_id}/comparison-sheet")
async def generate_comparison_sheet(
    lead_id: str, 
    venue_ids: List[str],
    request: Request,
    user: dict = Depends(require_role("rm", "admin"))
):
    """Generate venue comparison sheet data for a lead (3-5 venues)."""
    if len(venue_ids) < 3 or len(venue_ids) > 5:
        raise HTTPException(status_code=400, detail="Please select 3-5 venues for comparison")
    
    # Check if lead exists
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Generate comparison sheet
    comparison_sheet = await comparison_sheet_service.generate_comparison_sheet(
        lead_id=lead_id,
        venue_ids=venue_ids,
        user_id=user["user_id"],
        user_name=user["name"]
    )
    
    if not comparison_sheet:
        raise HTTPException(status_code=500, detail="Failed to generate comparison sheet")
    
    # Create audit log
    await create_audit_log("lead", lead_id, "comparison_sheet_generated", user, {
        "venue_count": len(comparison_sheet.get("venues", [])),
        "venue_ids": venue_ids
    }, request)
    
    return comparison_sheet


@router.get("/comparison-sheets/{sheet_id}")
async def get_comparison_sheet(sheet_id: str):
    """Get a previously generated comparison sheet (public for sharing)."""
    sheet = await comparison_sheet_service.get_comparison_sheet_by_id(sheet_id)
    if not sheet:
        raise HTTPException(status_code=404, detail="Comparison sheet not found")
    return sheet
