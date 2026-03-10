"""
Fix script: Convert amenities from list format to VenueAmenities dict format
for all new city venues (Mumbai, Bangalore, Hyderabad, Chennai, Chandigarh)
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv()

NEW_CITY_SLUGS = ["mumbai", "bangalore", "hyderabad", "chennai", "chandigarh"]

# Mapping: list-based amenity string → VenueAmenities field
AMENITY_MAP = {
    "parking":     "parking",
    "valet":       "valet",
    "ac":          "ac",
    "wifi":        "wifi",
    "catering":    "catering_inhouse",
    "bar":         "alcohol_allowed",
    "bridal_suite": None,          # no matching field; skip
    "dj":          "dj_allowed",
    "sound_system": "sound_system",
    "projector":   None,           # no matching field; skip
    "backup_power": "generator_backup",
    "decoration":  "decor_inhouse",
    "outdoor_space": None,         # no matching field; skip
    "pool":        None,           # no matching field; skip
    "spa":         None,           # no matching field; skip
    "rooftop":     None,           # no matching field; skip
}

AMENITY_DEFAULTS = {
    "parking": False, "valet": False, "alcohol_allowed": False,
    "rooms_available": 0, "ac": False, "catering_inhouse": False,
    "catering_outside_allowed": False, "decor_inhouse": False,
    "sound_system": False, "dj_allowed": False, "wifi": False,
    "generator_backup": False,
}


def convert_amenities(amenity_list: list) -> dict:
    result = dict(AMENITY_DEFAULTS)
    for item in amenity_list:
        key = AMENITY_MAP.get(item)
        if key and key in result:
            if isinstance(result[key], bool):
                result[key] = True
    return result


async def fix():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    # Find venues where amenities is a list (not a dict)
    cursor = db.venues.find({"city_slug": {"$in": NEW_CITY_SLUGS}})
    venues = await cursor.to_list(100)

    fixed = 0
    skipped = 0
    for v in venues:
        amenities = v.get("amenities")
        if isinstance(amenities, list):
            new_amenities = convert_amenities(amenities)
            await db.venues.update_one(
                {"venue_id": v["venue_id"]},
                {"$set": {"amenities": new_amenities}}
            )
            print(f"  Fixed: {v['name']} → {new_amenities}")
            fixed += 1
        elif isinstance(amenities, dict):
            skipped += 1
        else:
            print(f"  Unknown amenities format for {v['name']}: {type(amenities)}")

    print(f"\nDone! Fixed {fixed} venues, skipped {skipped} (already correct format)")
    client.close()


if __name__ == "__main__":
    asyncio.run(fix())
