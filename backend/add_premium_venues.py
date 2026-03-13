"""
Add 20 premium venues with 5 HD photos each + update existing venues to have 5 photos.
Run once: python3 add_premium_venues.py
"""
import asyncio
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from utils import generate_id

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "venuloq_db")

# HD photo pools by category
BALLROOM_PHOTOS = [
    "https://images.unsplash.com/photo-1759519238029-689e99c6d19e?w=1200",
    "https://images.unsplash.com/photo-1654336037958-c698d50700b3?w=1200",
    "https://images.unsplash.com/photo-1759730840961-09faa5731a3b?w=1200",
    "https://images.unsplash.com/photo-1769018508631-fe4ebf3fba3a?w=1200",
    "https://images.unsplash.com/photo-1729957385579-528ce50ffd94?w=1200",
    "https://images.unsplash.com/photo-1727931287903-b24dd8011a56?w=1200",
    "https://images.unsplash.com/photo-1727931301188-55b23fa9672e?w=1200",
    "https://images.unsplash.com/photo-1763231575952-98244918f99b?w=1200",
]

BANQUET_PHOTOS = [
    "https://images.unsplash.com/photo-1768508951405-10e83c4a2872?w=1200",
    "https://images.unsplash.com/photo-1761110787206-2cc164e4913c?w=1200",
    "https://images.unsplash.com/photo-1761120789207-c08a10afb864?w=1200",
    "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200",
    "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200",
    "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=1200",
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200",
    "https://images.unsplash.com/photo-1478146059778-26028b07395a?w=1200",
]

OUTDOOR_PHOTOS = [
    "https://images.unsplash.com/photo-1753966597915-0291759f8d7f?w=1200",
    "https://images.unsplash.com/photo-1772127822525-7eda37383b9f?w=1200",
    "https://images.unsplash.com/photo-1724914222553-eb27bda8b746?w=1200",
    "https://images.unsplash.com/photo-1753966597931-4c493eb0a5f7?w=1200",
    "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200",
    "https://images.unsplash.com/photo-1530023367847-a683933f4172?w=1200",
    "https://images.unsplash.com/photo-1470290449668-02dd93d9420a?w=1200",
    "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=1200",
]

HERITAGE_PHOTOS = [
    "https://images.unsplash.com/photo-1641803186636-e3a008204a42?w=1200",
    "https://images.unsplash.com/photo-1641803190133-eb03ff356eaf?w=1200",
    "https://images.unsplash.com/photo-1721572321875-2610e9e83d55?w=1200",
    "https://images.unsplash.com/photo-1641803187589-125f9e929ced?w=1200",
    "https://images.unsplash.com/photo-1700219447843-d9fafce8143f?w=1200",
    "https://images.unsplash.com/photo-1548013146-72479768bada?w=1200",
    "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200",
    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200",
]

HOTEL_PHOTOS = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200",
    "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200",
    "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1200",
]

ROOFTOP_PHOTOS = [
    "https://images.unsplash.com/photo-1677919604631-5986d8ae94dc?w=1200",
    "https://images.unsplash.com/photo-1603117791031-bed60a5acbe1?w=1200",
    "https://images.unsplash.com/photo-1559924687-433731b5f852?w=1200",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200",
    "https://images.unsplash.com/photo-1485182708500-e8f1f318ba72?w=1200",
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=1200",
]


def pick(pool, n=5, offset=0):
    """Pick n images from pool, rotating with offset to avoid duplicates."""
    return [pool[(i + offset) % len(pool)] for i in range(n)]


def make_venue(name, city, city_slug, area, address, pincode, lat, lng,
               slug, event_types, venue_type, indoor_outdoor,
               cap_min, cap_max, price_veg, price_nonveg, min_spend,
               photos, desc, rating, review_count, amenities_extra=None, owner_id=""):
    amenities = {
        "parking": True, "valet": True, "alcohol_allowed": True,
        "ac": True, "catering_inhouse": True, "catering_outside_allowed": False,
        "decor_inhouse": True, "sound_system": True, "dj_allowed": True,
        "wifi": True, "generator_backup": True
    }
    if amenities_extra:
        amenities.update(amenities_extra)
    return {
        "venue_id": generate_id("venue_"),
        "owner_id": owner_id,
        "name": name,
        "description": desc,
        "city": city,
        "city_slug": city_slug,
        "area": area,
        "address": address,
        "pincode": pincode,
        "latitude": lat,
        "longitude": lng,
        "slug": slug,
        "event_types": event_types,
        "venue_type": venue_type,
        "indoor_outdoor": indoor_outdoor,
        "capacity_min": cap_min,
        "capacity_max": cap_max,
        "pricing": {
            "price_per_plate_veg": price_veg,
            "price_per_plate_nonveg": price_nonveg,
            "min_spend": min_spend,
        },
        "amenities": amenities,
        "images": photos,
        "faqs": [
            {"question": "Do you offer wedding planning?", "answer": "Yes, our dedicated wedding team provides end-to-end planning."},
            {"question": "What is the cancellation policy?", "answer": "Full refund 60+ days before event. 50% for 30-60 days."}
        ],
        "policies": "Advance booking recommended. Final guest count 7 days prior.",
        "rating": rating,
        "review_count": review_count,
        "status": "approved",
        "created_at": datetime.now(timezone.utc).isoformat()
    }


NEW_VENUES = [
    # --- Mumbai ---
    ("Four Seasons Ballroom Mumbai", "Mumbai", "mumbai", "Worli", "Dr. E. Moses Road, Worli, Mumbai", "400018",
     19.0144, 72.8198, "four-seasons-ballroom-mumbai",
     ["wedding", "reception", "corporate", "gala_dinner"], "hotel", "indoor",
     100, 600, 5500, 6500, 2000000,
     pick(BALLROOM_PHOTOS, 5, 0),
     "The crown jewel of Mumbai's luxury scene. Floor-to-ceiling windows frame the Arabian Sea while crystal chandeliers cast a golden glow over celebrations of a lifetime.", 4.9, 285),

    ("Trident Nariman Point", "Mumbai", "mumbai", "Nariman Point", "Nariman Point, Mumbai", "400021",
     18.9257, 72.8240, "trident-nariman-point",
     ["wedding", "reception", "corporate", "cocktail"], "hotel", "indoor",
     80, 400, 4800, 5800, 1200000,
     pick(BANQUET_PHOTOS, 5, 1),
     "Perched at the tip of Mumbai's iconic Nariman Point with sweeping views of the Queen's Necklace. The Trident redefines elegance with its contemporary design and flawless service.", 4.8, 198),

    ("Sahara Star Galaxy Banquet", "Mumbai", "mumbai", "Vile Parle", "Near Airport, Vile Parle East, Mumbai", "400099",
     19.1007, 72.8530, "sahara-star-galaxy-banquet",
     ["wedding", "reception", "sangeet", "engagement"], "banquet_hall", "indoor",
     200, 1200, 3200, 4200, 1000000,
     pick(BALLROOM_PHOTOS, 5, 3),
     "An architectural marvel housing Mumbai's most spectacular banquet space. The Galaxy Ballroom features a retractable roof that opens to reveal the night sky.", 4.7, 412),

    # --- Delhi ---
    ("The Lodhi New Delhi", "Delhi", "delhi", "Lodhi Road", "Lodhi Road, New Delhi", "110003",
     28.5861, 77.2394, "the-lodhi-new-delhi",
     ["wedding", "reception", "corporate", "gala_dinner"], "hotel", "both",
     60, 350, 6500, 7500, 2500000,
     pick(HOTEL_PHOTOS, 5, 0),
     "Delhi's only all-suite luxury hotel set amidst 7 acres of heritage gardens. The Lodhi offers an unmatched blend of privacy, grandeur, and contemporary Indian luxury.", 4.9, 167),

    ("Andaz Delhi by Hyatt", "Delhi", "delhi", "Aerocity", "Asset Area 1, Aerocity, New Delhi", "110037",
     28.5535, 77.1044, "andaz-delhi-by-hyatt",
     ["wedding", "reception", "corporate", "cocktail"], "hotel", "indoor",
     80, 500, 5000, 6000, 1500000,
     pick(BANQUET_PHOTOS, 5, 3),
     "A celebration of Delhi's vibrant culture meets cutting-edge design. The Andaz Ballroom features dramatic 20-foot ceilings and customizable LED walls that transform with every event.", 4.8, 234),

    ("Shangri-La Eros New Delhi", "Delhi", "delhi", "Connaught Place", "19 Ashoka Road, Connaught Place", "110001",
     28.6214, 77.2189, "shangri-la-eros-new-delhi",
     ["wedding", "reception", "corporate", "award_ceremony"], "hotel", "indoor",
     100, 700, 5500, 6800, 2000000,
     pick(BALLROOM_PHOTOS, 5, 2),
     "The legendary Shangri-La hospitality in the heart of Lutyens' Delhi. Its Grand Ballroom with Swarovski crystal ceiling is the gold standard for Delhi society weddings.", 4.9, 289),

    ("Veda Heritage Farmhouse", "Delhi", "delhi", "Chattarpur", "Chattarpur Farms, New Delhi", "110074",
     28.4862, 77.1720, "veda-heritage-farmhouse",
     ["wedding", "reception", "sangeet", "mehndi"], "farmhouse", "outdoor",
     200, 1500, 2200, 3000, 800000,
     pick(OUTDOOR_PHOTOS, 5, 0),
     "A sprawling 3-acre heritage farmhouse with Mughal-inspired gardens, a cascading waterfall, and an open-air amphitheatre. Where traditional grandeur meets nature's canvas.", 4.6, 523),

    # --- Bangalore ---
    ("The Ritz-Carlton Bengaluru", "Bangalore", "bangalore", "Residency Road", "99 Residency Road, Bengaluru", "560025",
     12.9693, 77.6053, "the-ritz-carlton-bengaluru",
     ["wedding", "reception", "corporate", "gala_dinner"], "hotel", "indoor",
     80, 400, 5800, 7000, 2200000,
     pick(BANQUET_PHOTOS, 5, 5),
     "The epitome of refined luxury in the Garden City. The Ritz-Carlton Grand Ballroom features Italian marble, Baccarat chandeliers, and an award-winning culinary team.", 4.9, 176),

    ("Prestige Golfshire Club", "Bangalore", "bangalore", "Nandi Hills Road", "Nandi Hills Road, Devanahalli", "562110",
     13.2257, 77.6853, "prestige-golfshire-club",
     ["wedding", "reception", "corporate", "pool_party"], "resort", "both",
     100, 800, 3500, 4500, 1200000,
     pick(OUTDOOR_PHOTOS, 5, 2),
     "An exclusive 275-acre golf resort nestled against the Nandi Hills. The Clubhouse overlooks an 18-hole championship course, offering a breathtaking backdrop for outdoor celebrations.", 4.7, 312),

    ("Taj Yeshwantpur Bengaluru", "Bangalore", "bangalore", "Yeshwantpur", "Yeshwantpur, Bengaluru", "560022",
     13.0228, 77.5437, "taj-yeshwantpur-bengaluru",
     ["wedding", "reception", "corporate", "conference"], "hotel", "indoor",
     100, 600, 4200, 5200, 1500000,
     pick(HOTEL_PHOTOS, 5, 3),
     "Taj's newest jewel in Bengaluru brings together contemporary architecture and the legendary Taj hospitality. The pillarless Maharaja Ballroom is a modern marvel of event spaces.", 4.8, 198),

    # --- Hyderabad ---
    ("ITC Kohenur Hyderabad", "Hyderabad", "hyderabad", "HITEC City", "HITEC City, Hyderabad", "500081",
     17.4326, 78.3807, "itc-kohenur-hyderabad",
     ["wedding", "reception", "corporate", "gala_dinner"], "hotel", "indoor",
     100, 700, 4500, 5500, 1800000,
     pick(BALLROOM_PHOTOS, 5, 4),
     "Inspired by the legendary Kohinoor diamond, this architectural masterpiece features a stunning lotus-shaped design. The Grand Kohenur Ballroom rivals the best in the world.", 4.9, 267),

    ("Golkonda Resorts Hyderabad", "Hyderabad", "hyderabad", "Gandipet", "Gandipet, Hyderabad", "500075",
     17.3587, 78.3470, "golkonda-resorts-hyderabad",
     ["wedding", "reception", "sangeet", "pool_party"], "resort", "both",
     150, 1000, 2800, 3800, 900000,
     pick(HERITAGE_PHOTOS, 5, 0),
     "A sprawling 25-acre resort on the banks of Osman Sagar lake. Golkonda's Nizam-era architecture and lush landscapes create an unforgettable royal wedding experience.", 4.7, 389),

    # --- Chennai ---
    ("The Leela Palace Chennai", "Chennai", "chennai", "MRC Nagar", "Adyar Seaface, MRC Nagar", "600028",
     13.0139, 80.2697, "the-leela-palace-chennai",
     ["wedding", "reception", "corporate", "award_ceremony"], "hotel", "indoor",
     80, 500, 5000, 6200, 2000000,
     pick(BANQUET_PHOTOS, 5, 0),
     "South India's most prestigious address for grand celebrations. The Leela's Marina Ballroom offers panoramic Bay of Bengal views and Chettinad-inspired interiors that honour Tamil heritage.", 4.9, 223),

    ("Mahabalipuram Beach Resort", "Chennai", "chennai", "Mahabalipuram", "ECR, Mahabalipuram", "603104",
     12.6208, 80.1920, "mahabalipuram-beach-resort",
     ["wedding", "reception", "beach_party", "sangeet"], "resort", "outdoor",
     100, 800, 3000, 4000, 1000000,
     pick(OUTDOOR_PHOTOS, 5, 4),
     "A beachfront paradise against the backdrop of UNESCO heritage shore temples. Exchange vows with waves crashing on golden shores under an ancient Dravidian sky.", 4.6, 345),

    # --- Chandigarh ---
    ("The Oberoi Sukhvilas Chandigarh", "Chandigarh", "chandigarh", "New Chandigarh", "New Chandigarh, Siswan Forest Range", "140306",
     30.7908, 76.6889, "the-oberoi-sukhvilas-chandigarh",
     ["wedding", "reception", "corporate", "gala_dinner"], "resort", "both",
     60, 300, 6000, 7200, 2500000,
     pick(HERITAGE_PHOTOS, 5, 3),
     "Set amidst 8,000 acres of natural forest at the foothills of the Shivaliks. Sukhvilas is India's finest resort for intimate, ultra-luxury destination celebrations.", 4.9, 145),

    ("Lalit Chandigarh Grand", "Chandigarh", "chandigarh", "IT Park", "IT Park, Chandigarh", "160101",
     30.7310, 76.8006, "lalit-chandigarh-grand",
     ["wedding", "reception", "corporate", "conference"], "hotel", "indoor",
     100, 600, 3500, 4500, 1000000,
     pick(HOTEL_PHOTOS, 5, 5),
     "The Lalit's largest ballroom in North India featuring a stunning 30-foot ceiling and state-of-the-art lighting. The go-to choice for Chandigarh's most talked-about celebrations.", 4.7, 278),

    # --- Gurgaon ---
    ("Oberoi Gurgaon", "Gurgaon", "gurgaon", "DLF Phase 3", "443 Udyog Vihar, Phase V", "122016",
     28.5008, 77.0858, "oberoi-gurgaon",
     ["wedding", "reception", "corporate", "cocktail"], "hotel", "indoor",
     80, 400, 5500, 6500, 1800000,
     pick(BALLROOM_PHOTOS, 5, 6),
     "The Oberoi Gurgaon is a sanctuary of calm amidst the bustle of the Millennium City. Its Grand Ballroom features floor-to-ceiling glass with garden views and impeccable Oberoi service.", 4.9, 201),

    ("Kingdom of Dreams Gurgaon", "Gurgaon", "gurgaon", "Sector 29", "Sector 29, Gurgaon", "122001",
     28.4687, 77.0640, "kingdom-of-dreams-gurgaon",
     ["wedding", "reception", "sangeet", "engagement"], "banquet_hall", "indoor",
     300, 2000, 2500, 3500, 1200000,
     pick(ROOFTOP_PHOTOS, 5, 0),
     "India's largest live entertainment destination transformed into an extraordinary wedding venue. The Nautanki Mahal theatre converts into a breathtaking 2000-guest celebration space.", 4.6, 567),

    # --- Noida ---
    ("The Great India Place Grand", "Noida", "noida", "Sector 38", "Sector 38A, Noida", "201301",
     28.5672, 77.3258, "the-great-india-place-grand",
     ["wedding", "reception", "sangeet", "corporate"], "banquet_hall", "indoor",
     200, 1500, 2000, 2800, 600000,
     pick(BANQUET_PHOTOS, 5, 6),
     "Noida's premier celebration destination featuring three interconnected ballrooms. The Grand Hall's modular design allows celebrations from intimate to extravagant.", 4.5, 445),

    # --- Greater Noida ---
    ("Jaypee Palace Greater Noida", "Greater Noida", "greater-noida", "Pari Chowk", "Pari Chowk, Greater Noida", "201306",
     28.4616, 77.5066, "jaypee-palace-greater-noida",
     ["wedding", "reception", "corporate", "conference"], "hotel", "both",
     100, 1000, 2800, 3500, 800000,
     pick(HOTEL_PHOTOS, 5, 2),
     "A palatial resort spread across 25 acres with a championship golf course. The Convention Centre hosts NCR's grandest weddings with its 40,000 sq ft pillarless ballroom.", 4.7, 356),
]


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Step 1: Get owner_id from existing venue or create one
    existing = await db.venues.find_one({}, {"_id": 0, "owner_id": 1})
    owner_id = existing["owner_id"] if existing else generate_id("user_")

    # Step 2: Add new venues (skip if slug already exists)
    added = 0
    for args in NEW_VENUES:
        slug = args[8]
        exists = await db.venues.find_one({"slug": slug})
        if not exists:
            venue = make_venue(*args, owner_id=owner_id)
            await db.venues.insert_one(venue)
            added += 1
            print(f"  Added: {args[0]}")
        else:
            print(f"  Skip (exists): {args[0]}")

    print(f"\nAdded {added} new venues")

    # Step 3: Update ALL existing venues to have at least 5 photos
    all_photo_pools = BALLROOM_PHOTOS + BANQUET_PHOTOS + OUTDOOR_PHOTOS + HERITAGE_PHOTOS + HOTEL_PHOTOS + ROOFTOP_PHOTOS
    venues_cursor = db.venues.find({}, {"_id": 0, "venue_id": 1, "images": 1, "venue_type": 1})
    updated = 0
    async for v in venues_cursor:
        imgs = v.get("images", [])
        if len(imgs) < 5:
            vtype = v.get("venue_type", "hotel")
            pool = {
                "hotel": HOTEL_PHOTOS,
                "banquet_hall": BANQUET_PHOTOS,
                "farmhouse": OUTDOOR_PHOTOS,
                "resort": OUTDOOR_PHOTOS,
                "heritage": HERITAGE_PHOTOS,
            }.get(vtype, BALLROOM_PHOTOS)
            # Keep existing valid images, add more from pool
            needed = 5 - len(imgs)
            extra = [p for p in pool if p not in imgs][:needed]
            new_imgs = imgs + extra
            await db.venues.update_one(
                {"venue_id": v["venue_id"]},
                {"$set": {"images": new_imgs[:5]}}
            )
            updated += 1

    print(f"Updated {updated} venues to have 5+ photos")

    # Step 4: Verify
    total = await db.venues.count_documents({"status": "approved"})
    print(f"\nTotal approved venues: {total}")

    client.close()

if __name__ == "__main__":
    asyncio.run(main())
