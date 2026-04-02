import asyncio
import json
from datetime import datetime, timezone
from config import db

async def seed():
    now = datetime.now(timezone.utc).isoformat()
    mgr = await db.users.find_one({"role": "venue_manager"}, {"_id": 0})
    spec = await db.users.find_one({"role": "venue_specialist"}, {"_id": 0})

    test_acqs = [
        {
            "acquisition_id": "acq_pub_test_001",
            "status": "owner_onboarding_completed",
            "venue_name": "Grand Heritage Palace",
            "owner_name": "Rajesh Kumar",
            "owner_phone": "+91-9876543210",
            "owner_email": "rajesh@example.com",
            "city": "Delhi",
            "locality": "Connaught Place",
            "address": "12, Janpath Road, Connaught Place, New Delhi",
            "venue_type": "palace",
            "capacity_min": 200,
            "capacity_max": 1500,
            "indoor_outdoor": "both",
            "pricing_band_min": 2500,
            "pricing_band_max": 4500,
            "event_types": ["wedding", "reception", "corporate"],
            "amenity_tags": ["parking", "valet", "ac", "catering_inhouse", "decor", "sound"],
            "vibe_tags": ["royal", "elegant", "grand"],
            "publishable_summary": "A majestic heritage palace in the heart of Delhi, offering regal indoor halls and sprawling outdoor lawns. Perfect for grand weddings and premium corporate events with world-class catering and impeccable service.",
            "notes": "Owner very enthusiastic. Palace has been in family for 3 generations.",
            "meeting_outcome": "positive",
            "owner_interest": "hot",
            "photos": [
                {"filename": "p1.jpg", "url": "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800", "uploaded_at": now},
                {"filename": "p2.jpg", "url": "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800", "uploaded_at": now},
                {"filename": "p3.jpg", "url": "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=800", "uploaded_at": now},
                {"filename": "p4.jpg", "url": "https://images.unsplash.com/photo-1562778612-e1e0cda9915c?w=800", "uploaded_at": now},
            ],
            "onboarding": {"signer_name": "Rajesh Kumar", "accepted_at": now, "terms_version": "1.0.0"},
            "history": [
                {"action": "created", "status": "draft", "by_name": spec.get("name",""), "timestamp": now},
                {"action": "status_change:approved->onboarding_completed", "status": "owner_onboarding_completed", "timestamp": now},
            ],
            "created_by": spec.get("user_id", ""),
            "created_at": now,
            "updated_at": now,
        },
        {
            "acquisition_id": "acq_pub_test_002",
            "status": "owner_onboarding_completed",
            "venue_name": "Sunset Garden Resort",
            "owner_name": "Priya Menon",
            "owner_phone": "+91-9988776655",
            "owner_email": "priya@example.com",
            "city": "Gurgaon",
            "locality": "DLF Phase 3",
            "address": "Plot 42, Sector 24, DLF Phase 3, Gurugram",
            "venue_type": "resort",
            "capacity_min": 100,
            "capacity_max": 800,
            "indoor_outdoor": "outdoor",
            "pricing_band_min": 1800,
            "pricing_band_max": 3200,
            "event_types": ["wedding", "engagement", "birthday"],
            "amenity_tags": ["parking", "ac", "catering_inhouse", "sound", "dj"],
            "vibe_tags": ["garden", "romantic", "sunset"],
            "publishable_summary": "A stunning garden resort with panoramic sunset views. Lush green lawns, elegant pergolas, and a dedicated event team make this the perfect choice for intimate celebrations and grand receptions.",
            "notes": "Beautiful property. Owner recently renovated the garden area.",
            "meeting_outcome": "positive",
            "owner_interest": "hot",
            "photos": [
                {"filename": "p1.jpg", "url": "https://images.unsplash.com/photo-1510076857177-7470076d4098?w=800", "uploaded_at": now},
                {"filename": "p2.jpg", "url": "https://images.unsplash.com/photo-1529543544282-ea99407407c1?w=800", "uploaded_at": now},
                {"filename": "p3.jpg", "url": "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800", "uploaded_at": now},
            ],
            "onboarding": {"signer_name": "Priya Menon", "accepted_at": now, "terms_version": "1.0.0"},
            "history": [],
            "created_by": spec.get("user_id", ""),
            "created_at": now,
            "updated_at": now,
        },
        {
            "acquisition_id": "acq_pub_test_003",
            "status": "owner_onboarding_completed",
            "venue_name": "Skyline Banquet",
            "owner_name": "Amit Shah",
            "owner_phone": "+91-8877665544",
            "city": "Noida",
            "locality": "Sector 18",
            "venue_type": "banquet_hall",
            "capacity_min": 50,
            "capacity_max": 400,
            "pricing_band_min": 1200,
            "pricing_band_max": 2000,
            "publishable_summary": "",
            "photos": [
                {"filename": "p1.jpg", "url": "https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=800", "uploaded_at": now},
            ],
            "onboarding": {"signer_name": "Amit Shah", "accepted_at": now},
            "history": [],
            "created_by": spec.get("user_id", ""),
            "created_at": now,
            "updated_at": now,
        },
    ]

    for acq in test_acqs:
        await db.venue_acquisitions.update_one(
            {"acquisition_id": acq["acquisition_id"]},
            {"$set": acq},
            upsert=True
        )

    count = await db.venue_acquisitions.count_documents({"status": {"$in": ["owner_onboarding_completed", "publish_ready"]}})
    print(f"Seeded {len(test_acqs)} test acquisitions. Publish-eligible: {count}")

asyncio.run(seed())
