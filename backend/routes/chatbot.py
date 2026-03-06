"""
AI Customer Support Chatbot - Routes
Uses emergentintegrations with GPT-4o-mini for cost-effective customer support.
"""
import os
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from emergentintegrations.llm.chat import LlmChat, UserMessage
from config import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chatbot", tags=["chatbot"])

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

SYSTEM_PROMPT = """You are VenuLock's AI Concierge — a helpful, friendly, and knowledgeable customer support assistant for a premium venue booking platform.

About VenuLock:
- We are a managed event booking platform where customers find and book venues with the help of dedicated Relationship Managers (RMs).
- We have 500+ verified venues across Delhi NCR, Mumbai, Bangalore, Hyderabad, and other major Indian cities.
- Venue types include: Five Star Hotels, Luxury Banquet Halls, Farmhouses, Resorts, Rooftop Venues.
- Price range: ₹1,200/plate to ₹6,000/plate depending on venue class.
- We offer: Free venue listing, dedicated RM management, transparent pricing, secure escrow payments, side-by-side venue comparisons.

How the platform works:
1. Customer selects their city and browses venues
2. Customer picks a Relationship Manager
3. RM provides structured comparison sheets with venue options
4. Customer books with secure escrow payment

Key features:
- EMI options available through partner banks (Bajaj Finserv, HDFC, ICICI)
- Real-time venue availability
- WhatsApp confirmation for bookings
- Virtual venue tours available

Guidelines:
- Be warm, professional, and concise
- If asked about specific venue pricing, give general ranges and suggest browsing the venue search page
- For booking issues, suggest contacting their assigned RM or using the "Talk to Expert" WhatsApp feature
- Never make up specific venue details — refer them to the search page
- Keep responses under 150 words unless more detail is needed
- If you don't know something, say so honestly and offer to connect them with a human expert"""


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str


# In-memory chat instances (keyed by session_id)
chat_sessions = {}


@router.post("/message", response_model=ChatResponse)
async def chat_message(req: ChatRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    session_id = req.session_id or str(uuid.uuid4())

    try:
        # Get or create chat instance
        if session_id not in chat_sessions:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=session_id,
                system_message=SYSTEM_PROMPT,
            )
            chat.with_model("openai", "gpt-4o-mini")
            chat_sessions[session_id] = chat

        chat = chat_sessions[session_id]
        user_msg = UserMessage(text=req.message)
        response = await chat.send_message(user_msg)

        # Store in DB for analytics
        await db.chat_messages.insert_one({
            "session_id": session_id,
            "user_message": req.message,
            "bot_reply": response,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        return ChatResponse(reply=response, session_id=session_id)

    except Exception as e:
        logger.error(f"Chatbot error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Sorry, I'm having trouble responding right now. Please try again."
        )
