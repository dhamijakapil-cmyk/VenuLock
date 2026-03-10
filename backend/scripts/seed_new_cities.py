"""
Seed script: Add Mumbai, Bangalore, Hyderabad, Chennai, Chandigarh
with premium real venues for each city.
Run: python3 -m scripts.seed_new_cities  (from /app/backend)
"""
import asyncio
import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv()

VENUE_IMAGES = {
    "ballroom":  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800",
    "banquet":   "https://images.unsplash.com/photo-1548194771-dedf9ee39de6?w=800",
    "garden":    "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800",
    "exterior":  "https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?w=800",
    "rooftop":   "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800",
    "hall":      "https://images.unsplash.com/photo-1521399252503-e25b03aeda66?w=800",
    "luxury":    "https://images.unsplash.com/photo-1605553426886-c0a99033fda0?w=800",
    "setup":     "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800",
}

AMENITIES_FULL = ["parking", "valet", "ac", "wifi", "catering", "bar", "bridal_suite",
                  "dj", "sound_system", "projector", "backup_power", "decoration",
                  "outdoor_space", "pool", "spa"]

AMENITY_DEFAULTS = {
    "parking": False, "valet": False, "alcohol_allowed": False,
    "rooms_available": 0, "ac": False, "catering_inhouse": False,
    "catering_outside_allowed": False, "decor_inhouse": False,
    "sound_system": False, "dj_allowed": False, "wifi": False,
    "generator_backup": False,
}

AMENITY_MAP = {
    "parking": "parking", "valet": "valet", "ac": "ac", "wifi": "wifi",
    "catering": "catering_inhouse", "bar": "alcohol_allowed", "dj": "dj_allowed",
    "sound_system": "sound_system", "backup_power": "generator_backup",
    "decoration": "decor_inhouse",
}

def amenities_dict(tags: list) -> dict:
    result = dict(AMENITY_DEFAULTS)
    for tag in tags:
        key = AMENITY_MAP.get(tag)
        if key and key in result and isinstance(result[key], bool):
            result[key] = True
    return result

NOW = datetime.now(timezone.utc)

def slug(name):
    import re
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')

def vid(name):
    import hashlib
    return "venue_" + hashlib.md5(name.encode()).hexdigest()[:12]

CITIES = [
    {
        "city_id": "city_mumbai",
        "name": "Mumbai",
        "state": "Maharashtra",
        "areas": [
            {"area_id": "mum_1", "name": "Bandra", "pincode": "400050"},
            {"area_id": "mum_2", "name": "Andheri", "pincode": "400069"},
            {"area_id": "mum_3", "name": "Juhu", "pincode": "400049"},
            {"area_id": "mum_4", "name": "Worli", "pincode": "400018"},
            {"area_id": "mum_5", "name": "Colaba", "pincode": "400005"},
        ],
        "active": True,
    },
    {
        "city_id": "city_bangalore",
        "name": "Bangalore",
        "state": "Karnataka",
        "areas": [
            {"area_id": "blr_1", "name": "Indiranagar", "pincode": "560038"},
            {"area_id": "blr_2", "name": "Koramangala", "pincode": "560034"},
            {"area_id": "blr_3", "name": "Whitefield", "pincode": "560066"},
            {"area_id": "blr_4", "name": "MG Road", "pincode": "560001"},
            {"area_id": "blr_5", "name": "Yelahanka", "pincode": "560064"},
        ],
        "active": True,
    },
    {
        "city_id": "city_hyderabad",
        "name": "Hyderabad",
        "state": "Telangana",
        "areas": [
            {"area_id": "hyd_1", "name": "Banjara Hills", "pincode": "500034"},
            {"area_id": "hyd_2", "name": "Jubilee Hills", "pincode": "500033"},
            {"area_id": "hyd_3", "name": "Hitech City", "pincode": "500081"},
            {"area_id": "hyd_4", "name": "Gachibowli", "pincode": "500032"},
            {"area_id": "hyd_5", "name": "Madhapur", "pincode": "500081"},
        ],
        "active": True,
    },
    {
        "city_id": "city_chennai",
        "name": "Chennai",
        "state": "Tamil Nadu",
        "areas": [
            {"area_id": "che_1", "name": "Anna Salai", "pincode": "600002"},
            {"area_id": "che_2", "name": "Adyar", "pincode": "600020"},
            {"area_id": "che_3", "name": "T Nagar", "pincode": "600017"},
            {"area_id": "che_4", "name": "OMR", "pincode": "600119"},
            {"area_id": "che_5", "name": "Nungambakkam", "pincode": "600034"},
        ],
        "active": True,
    },
    {
        "city_id": "city_chandigarh",
        "name": "Chandigarh",
        "state": "Punjab",
        "areas": [
            {"area_id": "chd_1", "name": "Sector 17", "pincode": "160017"},
            {"area_id": "chd_2", "name": "Sector 35", "pincode": "160035"},
            {"area_id": "chd_3", "name": "Sector 8", "pincode": "160008"},
            {"area_id": "chd_4", "name": "Panchkula", "pincode": "134109"},
            {"area_id": "chd_5", "name": "Mohali", "pincode": "160055"},
        ],
        "active": True,
    },
]

VENUES = [
    # ─── MUMBAI ───────────────────────────────────────────────────────────────
    {
        "name": "Taj Mahal Palace Mumbai",
        "city": "Mumbai", "city_slug": "mumbai",
        "area": "Colaba", "address": "Apollo Bunder, Colaba", "pincode": "400001",
        "description": "Iconic heritage hotel overlooking the Arabian Sea. An unmatched landmark for grand weddings and elite corporate galas.",
        "event_types": ["wedding", "reception", "corporate", "engagement"],
        "venue_type": "Hotel", "indoor_outdoor": "Both",
        "capacity_min": 50, "capacity_max": 1500,
        "pricing": {"price_per_plate_veg": 6500, "price_per_plate_nonveg": 8000, "min_spend": 3000000},
        "amenities": ["parking", "valet", "ac", "wifi", "catering", "bar", "bridal_suite", "dj", "sound_system", "backup_power"],
        "images": [VENUE_IMAGES["luxury"], VENUE_IMAGES["ballroom"], VENUE_IMAGES["exterior"]],
        "rating": 4.9, "review_count": 612,
    },
    {
        "name": "Grand Hyatt Mumbai",
        "city": "Mumbai", "city_slug": "mumbai",
        "area": "Bandra Kurla Complex", "address": "Off Western Express Highway, Santa Cruz East", "pincode": "400055",
        "description": "Contemporary 5-star luxury venue in the heart of Mumbai's business and entertainment district.",
        "event_types": ["wedding", "corporate", "conference", "birthday"],
        "venue_type": "Hotel", "indoor_outdoor": "Both",
        "capacity_min": 30, "capacity_max": 1200,
        "pricing": {"price_per_plate_veg": 5500, "price_per_plate_nonveg": 7000, "min_spend": 2500000},
        "amenities": ["parking", "valet", "ac", "wifi", "catering", "bar", "projector", "backup_power", "pool"],
        "images": [VENUE_IMAGES["banquet"], VENUE_IMAGES["hall"], VENUE_IMAGES["ballroom"]],
        "rating": 4.8, "review_count": 389,
    },
    {
        "name": "ITC Grand Central Mumbai",
        "city": "Mumbai", "city_slug": "mumbai",
        "area": "Parel", "address": "287, Dr Babasaheb Ambedkar Road, Parel", "pincode": "400012",
        "description": "A luxurious heritage retreat in the heart of Mumbai with world-class banqueting facilities.",
        "event_types": ["wedding", "reception", "corporate", "engagement", "birthday"],
        "venue_type": "Hotel", "indoor_outdoor": "Indoor",
        "capacity_min": 50, "capacity_max": 800,
        "pricing": {"price_per_plate_veg": 4800, "price_per_plate_nonveg": 6200, "min_spend": 2000000},
        "amenities": ["parking", "ac", "wifi", "catering", "bar", "bridal_suite", "dj", "backup_power"],
        "images": [VENUE_IMAGES["hall"], VENUE_IMAGES["setup"], VENUE_IMAGES["banquet"]],
        "rating": 4.7, "review_count": 254,
    },
    {
        "name": "The Leela Mumbai",
        "city": "Mumbai", "city_slug": "mumbai",
        "area": "Andheri", "address": "Sahar, Andheri East", "pincode": "400059",
        "description": "Stunning luxury hotel adjacent to Mumbai airport with elegant banqueting halls and immaculate service.",
        "event_types": ["wedding", "reception", "corporate", "conference"],
        "venue_type": "Hotel", "indoor_outdoor": "Both",
        "capacity_min": 50, "capacity_max": 1000,
        "pricing": {"price_per_plate_veg": 5000, "price_per_plate_nonveg": 6500, "min_spend": 2200000},
        "amenities": ["parking", "valet", "ac", "wifi", "catering", "bar", "bridal_suite", "pool", "spa"],
        "images": [VENUE_IMAGES["luxury"], VENUE_IMAGES["garden"], VENUE_IMAGES["ballroom"]],
        "rating": 4.8, "review_count": 441,
    },

    # ─── BANGALORE ────────────────────────────────────────────────────────────
    {
        "name": "The Leela Palace Bengaluru",
        "city": "Bangalore", "city_slug": "bangalore",
        "area": "HAL Airport Road", "address": "23, HAL Airport Road", "pincode": "560008",
        "description": "Opulent royal-inspired venue modelled on Mysore's Vijayanagara architecture. A stunning backdrop for grand celebrations.",
        "event_types": ["wedding", "reception", "corporate", "engagement", "birthday"],
        "venue_type": "Hotel", "indoor_outdoor": "Both",
        "capacity_min": 50, "capacity_max": 1500,
        "pricing": {"price_per_plate_veg": 5000, "price_per_plate_nonveg": 6500, "min_spend": 2000000},
        "amenities": ["parking", "valet", "ac", "wifi", "catering", "bar", "bridal_suite", "pool", "spa", "dj"],
        "images": [VENUE_IMAGES["luxury"], VENUE_IMAGES["ballroom"], VENUE_IMAGES["garden"]],
        "rating": 4.9, "review_count": 528,
    },
    {
        "name": "ITC Gardenia Bengaluru",
        "city": "Bangalore", "city_slug": "bangalore",
        "area": "Residency Road", "address": "1, Residency Road", "pincode": "560025",
        "description": "Award-winning luxury hotel in central Bengaluru with world-class banqueting spanning 22,000 sq ft.",
        "event_types": ["wedding", "corporate", "conference", "reception"],
        "venue_type": "Hotel", "indoor_outdoor": "Indoor",
        "capacity_min": 50, "capacity_max": 1200,
        "pricing": {"price_per_plate_veg": 4500, "price_per_plate_nonveg": 6000, "min_spend": 1800000},
        "amenities": ["parking", "valet", "ac", "wifi", "catering", "bar", "projector", "backup_power", "dj"],
        "images": [VENUE_IMAGES["hall"], VENUE_IMAGES["banquet"], VENUE_IMAGES["setup"]],
        "rating": 4.8, "review_count": 312,
    },
    {
        "name": "Taj West End Bengaluru",
        "city": "Bangalore", "city_slug": "bangalore",
        "area": "Race Course Road", "address": "25, Race Course Road", "pincode": "560001",
        "description": "Sprawling 20-acre garden heritage hotel — Bengaluru's most iconic address for garden weddings and royal receptions.",
        "event_types": ["wedding", "reception", "engagement", "birthday", "corporate"],
        "venue_type": "Hotel", "indoor_outdoor": "Both",
        "capacity_min": 30, "capacity_max": 1000,
        "pricing": {"price_per_plate_veg": 5500, "price_per_plate_nonveg": 7000, "min_spend": 2500000},
        "amenities": ["parking", "valet", "ac", "wifi", "catering", "bar", "bridal_suite", "outdoor_space", "pool"],
        "images": [VENUE_IMAGES["garden"], VENUE_IMAGES["exterior"], VENUE_IMAGES["banquet"]],
        "rating": 4.8, "review_count": 476,
    },
    {
        "name": "The Oberoi Bengaluru",
        "city": "Bangalore", "city_slug": "bangalore",
        "area": "MG Road", "address": "37-39, Mahatma Gandhi Road", "pincode": "560001",
        "description": "Intimate luxury hotel known for refined elegance and personalised service — perfect for exclusive gatherings.",
        "event_types": ["wedding", "corporate", "conference", "engagement"],
        "venue_type": "Hotel", "indoor_outdoor": "Indoor",
        "capacity_min": 20, "capacity_max": 400,
        "pricing": {"price_per_plate_veg": 6000, "price_per_plate_nonveg": 7500, "min_spend": 1500000},
        "amenities": ["parking", "valet", "ac", "wifi", "catering", "bar", "projector", "spa"],
        "images": [VENUE_IMAGES["luxury"], VENUE_IMAGES["hall"], VENUE_IMAGES["ballroom"]],
        "rating": 4.9, "review_count": 287,
    },

    # ─── HYDERABAD ────────────────────────────────────────────────────────────
    {
        "name": "Taj Falaknuma Palace Hyderabad",
        "city": "Hyderabad", "city_slug": "hyderabad",
        "area": "Falaknuma", "address": "Engine Bowli, Falaknuma", "pincode": "500053",
        "description": "A 19th-century palace perched atop a hill overlooking the city. The most regal wedding setting in all of India.",
        "event_types": ["wedding", "reception", "engagement", "birthday"],
        "venue_type": "Palace", "indoor_outdoor": "Both",
        "capacity_min": 50, "capacity_max": 500,
        "pricing": {"price_per_plate_veg": 8000, "price_per_plate_nonveg": 10000, "min_spend": 3500000},
        "amenities": ["parking", "valet", "ac", "wifi", "catering", "bar", "bridal_suite", "pool", "spa", "outdoor_space"],
        "images": [VENUE_IMAGES["luxury"], VENUE_IMAGES["exterior"], VENUE_IMAGES["ballroom"]],
        "rating": 4.9, "review_count": 398,
    },
    {
        "name": "ITC Kakatiya Hyderabad",
        "city": "Hyderabad", "city_slug": "hyderabad",
        "area": "Begumpet", "address": "6-3-1187, Begumpet", "pincode": "500016",
        "description": "Grand 5-star hotel inspired by the Kakatiya dynasty, offering magnificent pillarless banquet halls.",
        "event_types": ["wedding", "corporate", "conference", "reception", "engagement"],
        "venue_type": "Hotel", "indoor_outdoor": "Both",
        "capacity_min": 50, "capacity_max": 1200,
        "pricing": {"price_per_plate_veg": 4200, "price_per_plate_nonveg": 5500, "min_spend": 1800000},
        "amenities": ["parking", "valet", "ac", "wifi", "catering", "bar", "bridal_suite", "pool", "dj"],
        "images": [VENUE_IMAGES["hall"], VENUE_IMAGES["banquet"], VENUE_IMAGES["setup"]],
        "rating": 4.7, "review_count": 334,
    },
    {
        "name": "Novotel Hyderabad Convention Centre",
        "city": "Hyderabad", "city_slug": "hyderabad",
        "area": "Hitech City", "address": "Near Hitech City, Cyberabad", "pincode": "500081",
        "description": "India's largest convention and exhibition complex — ideal for large-scale corporate events, conferences and weddings.",
        "event_types": ["conference", "corporate", "wedding", "reception"],
        "venue_type": "Convention Centre", "indoor_outdoor": "Indoor",
        "capacity_min": 100, "capacity_max": 5000,
        "pricing": {"price_per_plate_veg": 3500, "price_per_plate_nonveg": 4500, "min_spend": 2000000},
        "amenities": ["parking", "ac", "wifi", "catering", "bar", "projector", "sound_system", "backup_power"],
        "images": [VENUE_IMAGES["hall"], VENUE_IMAGES["ballroom"], VENUE_IMAGES["exterior"]],
        "rating": 4.6, "review_count": 256,
    },
    {
        "name": "The Park Hyderabad",
        "city": "Hyderabad", "city_slug": "hyderabad",
        "area": "Somajiguda", "address": "22, Raj Bhavan Road, Somajiguda", "pincode": "500082",
        "description": "Boutique luxury hotel with chic design and vibrant energy — ideal for stylish weddings and creative corporate events.",
        "event_types": ["wedding", "birthday", "corporate", "reception", "engagement"],
        "venue_type": "Hotel", "indoor_outdoor": "Both",
        "capacity_min": 30, "capacity_max": 600,
        "pricing": {"price_per_plate_veg": 3800, "price_per_plate_nonveg": 5000, "min_spend": 1200000},
        "amenities": ["parking", "ac", "wifi", "catering", "bar", "dj", "pool", "rooftop"],
        "images": [VENUE_IMAGES["rooftop"], VENUE_IMAGES["banquet"], VENUE_IMAGES["setup"]],
        "rating": 4.6, "review_count": 201,
    },

    # ─── CHENNAI ──────────────────────────────────────────────────────────────
    {
        "name": "ITC Grand Chola Chennai",
        "city": "Chennai", "city_slug": "chennai",
        "area": "Mount Road", "address": "63, Mount Road, Anna Salai", "pincode": "600002",
        "description": "South India's grandest luxury hotel inspired by Chola dynasty architecture. India's largest hotel with breathtaking ballrooms.",
        "event_types": ["wedding", "reception", "corporate", "conference", "engagement"],
        "venue_type": "Hotel", "indoor_outdoor": "Both",
        "capacity_min": 50, "capacity_max": 2500,
        "pricing": {"price_per_plate_veg": 4800, "price_per_plate_nonveg": 6000, "min_spend": 2500000},
        "amenities": ["parking", "valet", "ac", "wifi", "catering", "bar", "bridal_suite", "pool", "spa", "dj", "backup_power"],
        "images": [VENUE_IMAGES["luxury"], VENUE_IMAGES["ballroom"], VENUE_IMAGES["banquet"]],
        "rating": 4.9, "review_count": 487,
    },
    {
        "name": "Taj Coromandel Chennai",
        "city": "Chennai", "city_slug": "chennai",
        "area": "Nungambakkam", "address": "37, Mahatma Gandhi Road, Nungambakkam", "pincode": "600034",
        "description": "Chennai's most prestigious address for five decades, known for impeccable service and elegant venues.",
        "event_types": ["wedding", "reception", "corporate", "engagement"],
        "venue_type": "Hotel", "indoor_outdoor": "Indoor",
        "capacity_min": 30, "capacity_max": 800,
        "pricing": {"price_per_plate_veg": 5500, "price_per_plate_nonveg": 7000, "min_spend": 2000000},
        "amenities": ["parking", "valet", "ac", "wifi", "catering", "bar", "bridal_suite", "pool"],
        "images": [VENUE_IMAGES["hall"], VENUE_IMAGES["exterior"], VENUE_IMAGES["banquet"]],
        "rating": 4.8, "review_count": 362,
    },
    {
        "name": "Hyatt Regency Chennai",
        "city": "Chennai", "city_slug": "chennai",
        "area": "Anna Salai", "address": "365, Anna Salai", "pincode": "600035",
        "description": "Modern luxury hotel with striking architecture in central Chennai. Ideal for large weddings and corporate galas.",
        "event_types": ["wedding", "corporate", "conference", "reception", "birthday"],
        "venue_type": "Hotel", "indoor_outdoor": "Both",
        "capacity_min": 50, "capacity_max": 1200,
        "pricing": {"price_per_plate_veg": 4500, "price_per_plate_nonveg": 5800, "min_spend": 1800000},
        "amenities": ["parking", "valet", "ac", "wifi", "catering", "bar", "projector", "dj", "backup_power"],
        "images": [VENUE_IMAGES["ballroom"], VENUE_IMAGES["setup"], VENUE_IMAGES["hall"]],
        "rating": 4.7, "review_count": 289,
    },
    {
        "name": "The Leela Palace Chennai",
        "city": "Chennai", "city_slug": "chennai",
        "area": "Adyar", "address": "MRC Nagar, Raja Annamalai Puram", "pincode": "600028",
        "description": "Pristine beachside luxury, combining Chennai's cultural heritage with contemporary elegance for unforgettable events.",
        "event_types": ["wedding", "reception", "engagement", "corporate"],
        "venue_type": "Hotel", "indoor_outdoor": "Both",
        "capacity_min": 50, "capacity_max": 1000,
        "pricing": {"price_per_plate_veg": 5000, "price_per_plate_nonveg": 6500, "min_spend": 2200000},
        "amenities": ["parking", "valet", "ac", "wifi", "catering", "bar", "bridal_suite", "pool", "spa", "outdoor_space"],
        "images": [VENUE_IMAGES["garden"], VENUE_IMAGES["luxury"], VENUE_IMAGES["banquet"]],
        "rating": 4.8, "review_count": 321,
    },

    # ─── CHANDIGARH ───────────────────────────────────────────────────────────
    {
        "name": "Taj Chandigarh",
        "city": "Chandigarh", "city_slug": "chandigarh",
        "area": "Sector 17", "address": "Sector 17A, Chandigarh", "pincode": "160017",
        "description": "Elegant luxury hotel in the heart of the City Beautiful. A premium choice for weddings, receptions and corporate events.",
        "event_types": ["wedding", "reception", "corporate", "engagement", "birthday"],
        "venue_type": "Hotel", "indoor_outdoor": "Both",
        "capacity_min": 30, "capacity_max": 800,
        "pricing": {"price_per_plate_veg": 3500, "price_per_plate_nonveg": 4500, "min_spend": 1200000},
        "amenities": ["parking", "valet", "ac", "wifi", "catering", "bar", "bridal_suite", "pool", "dj"],
        "images": [VENUE_IMAGES["luxury"], VENUE_IMAGES["ballroom"], VENUE_IMAGES["banquet"]],
        "rating": 4.8, "review_count": 278,
    },
    {
        "name": "JW Marriott Chandigarh",
        "city": "Chandigarh", "city_slug": "chandigarh",
        "area": "Sector 35", "address": "Plot No. 6, Madhya Marg, Sector 35B", "pincode": "160022",
        "description": "Contemporary luxury hotel with state-of-the-art banquet facilities across 10,000 sq ft of event space.",
        "event_types": ["wedding", "corporate", "conference", "reception", "engagement"],
        "venue_type": "Hotel", "indoor_outdoor": "Both",
        "capacity_min": 50, "capacity_max": 1000,
        "pricing": {"price_per_plate_veg": 4000, "price_per_plate_nonveg": 5200, "min_spend": 1500000},
        "amenities": ["parking", "valet", "ac", "wifi", "catering", "bar", "projector", "dj", "pool", "spa"],
        "images": [VENUE_IMAGES["hall"], VENUE_IMAGES["exterior"], VENUE_IMAGES["setup"]],
        "rating": 4.8, "review_count": 312,
    },
    {
        "name": "The Lalit Chandigarh",
        "city": "Chandigarh", "city_slug": "chandigarh",
        "area": "Rajiv Gandhi IT Park", "address": "Rajiv Gandhi IT Park, Phase-1, Chandigarh", "pincode": "160101",
        "description": "Vibrant luxury hotel in the IT corridor, featuring modern banquet halls perfect for tech-era corporate events and modern weddings.",
        "event_types": ["wedding", "corporate", "conference", "birthday", "reception"],
        "venue_type": "Hotel", "indoor_outdoor": "Indoor",
        "capacity_min": 30, "capacity_max": 600,
        "pricing": {"price_per_plate_veg": 3200, "price_per_plate_nonveg": 4200, "min_spend": 1000000},
        "amenities": ["parking", "ac", "wifi", "catering", "bar", "dj", "sound_system", "backup_power"],
        "images": [VENUE_IMAGES["banquet"], VENUE_IMAGES["hall"], VENUE_IMAGES["setup"]],
        "rating": 4.6, "review_count": 189,
    },
    {
        "name": "Hyatt Regency Chandigarh",
        "city": "Chandigarh", "city_slug": "chandigarh",
        "area": "Sector 17", "address": "Sector 17A, Near City Centre", "pincode": "160017",
        "description": "Sophisticated contemporary hotel offering premium event spaces with panoramic city views in the heart of Chandigarh.",
        "event_types": ["wedding", "reception", "corporate", "engagement"],
        "venue_type": "Hotel", "indoor_outdoor": "Both",
        "capacity_min": 40, "capacity_max": 700,
        "pricing": {"price_per_plate_veg": 3800, "price_per_plate_nonveg": 4800, "min_spend": 1300000},
        "amenities": ["parking", "valet", "ac", "wifi", "catering", "bar", "bridal_suite", "pool"],
        "images": [VENUE_IMAGES["rooftop"], VENUE_IMAGES["ballroom"], VENUE_IMAGES["banquet"]],
        "rating": 4.7, "review_count": 223,
    },
]


async def seed():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    # ── 1. Upsert cities ──────────────────────────────────────────────────────
    print("Seeding cities...")
    for city in CITIES:
        result = await db.cities.update_one(
            {"name": city["name"]},
            {"$set": city},
            upsert=True,
        )
        status = "inserted" if result.upserted_id else "updated"
        print(f"  {city['name']}: {status}")

    # ── 2. Upsert venues ──────────────────────────────────────────────────────
    print("\nSeeding venues...")
    for v in VENUES:
        venue_doc = {
            **v,
            "venue_id": vid(v["name"]),
            "slug": slug(v["name"]),
            "owner_id": "system",
            "status": "approved",
            "created_at": NOW.isoformat(),
            "latitude": 0.0,
            "longitude": 0.0,
            "policies": "Outside catering not allowed. Music allowed till 10 PM.",
            "amenities": amenities_dict(v.get("amenities", [])),
        }
        result = await db.venues.update_one(
            {"name": v["name"], "city": v["city"]},
            {"$set": venue_doc},
            upsert=True,
        )
        status = "inserted" if result.upserted_id else "updated"
        print(f"  [{v['city']}] {v['name']}: {status}")

    # ── 3. Verify ─────────────────────────────────────────────────────────────
    print("\nFinal city counts:")
    pipeline = [
        {"$match": {"status": "approved"}},
        {"$group": {"_id": "$city", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    counts = await db.venues.aggregate(pipeline).to_list(50)
    for c in counts:
        print(f"  {c['_id']}: {c['count']} venues")

    client.close()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(seed())
