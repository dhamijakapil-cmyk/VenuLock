"""
Script to update all venues with 5 HD photos each.
Images are categorized by venue type for realistic presentation.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# HD Image pools by venue type (all w=1200 for HD quality)
HOTEL_IMAGES = [
    "https://images.unsplash.com/photo-1759519238029-689e99c6d19e?w=1200",   # Grand ballroom chandelier
    "https://images.unsplash.com/photo-1758193783649-13371d7fb8dd?w=1200",   # Modern hotel lobby
    "https://images.unsplash.com/photo-1758194190679-198a77cba84f?w=1200",   # Marble lobby contemporary
    "https://images.unsplash.com/photo-1758194090785-8e09b7288199?w=1200",   # Plush lobby seating
    "https://images.unsplash.com/photo-1764148716678-40a4b8c5b812?w=1200",   # Elegant staircase red carpet
    "https://images.unsplash.com/photo-1763553113332-800519753e40?w=1200",   # Wedding reception tables floral
    "https://images.unsplash.com/photo-1763553113391-a659bee36e06?w=1200",   # Elegant reception decor
    "https://images.unsplash.com/photo-1738669469338-801b4e9dbccf?w=1200",   # Formal dinner setup
    "https://images.unsplash.com/photo-1763231575952-98244918f99b?w=1200",   # Elegant ballroom ornate ceiling
    "https://images.unsplash.com/photo-1761110787206-2cc164e4913c?w=1200",   # Dining room chandeliers
    "https://images.unsplash.com/photo-1746044159277-ced38bb9ae58?w=1200",   # Floral wedding backdrop candles
    "https://images.unsplash.com/photo-1746044159252-ed0ccafd7b46?w=1200",   # Decorated indoor event space
    "https://images.unsplash.com/photo-1746044159204-1c0dc41802ea?w=1200",   # Floral decoration lights
    "https://images.unsplash.com/photo-1574756833527-c36597404865?w=1200",   # Pink white roses
]

BANQUET_IMAGES = [
    "https://images.unsplash.com/photo-1763231575952-98244918f99b?w=1200",   # Elegant ballroom ornate ceiling
    "https://images.unsplash.com/photo-1769812343590-485512e27838?w=1200",   # Event tables white flowers
    "https://images.unsplash.com/photo-1768851142314-c4ebf49ad45b?w=1200",   # Gold chairs blue napkins
    "https://images.unsplash.com/photo-1761110787206-2cc164e4913c?w=1200",   # Chandeliers dining room
    "https://images.unsplash.com/photo-1746044159252-ed0ccafd7b46?w=1200",   # Decorated indoor event space
    "https://images.unsplash.com/photo-1763553113332-800519753e40?w=1200",   # Wedding reception tables
    "https://images.unsplash.com/photo-1746044159204-1c0dc41802ea?w=1200",   # Floral decoration lights
    "https://images.unsplash.com/photo-1759519238029-689e99c6d19e?w=1200",   # Grand ballroom chandelier
    "https://images.unsplash.com/photo-1574756833527-c36597404865?w=1200",   # Pink roses
    "https://images.unsplash.com/photo-1738669469338-801b4e9dbccf?w=1200",   # Formal dinner
]

FARMHOUSE_IMAGES = [
    "https://images.unsplash.com/photo-1692166927778-056466153552?w=1200",   # Outdoor tent event
    "https://images.unsplash.com/photo-1729603370273-facc0600d259?w=1200",   # Barn venue seating
    "https://images.unsplash.com/photo-1670336423329-3dfbcd081b16?w=1200",   # White chairs garden
    "https://images.unsplash.com/photo-1729603370373-bf46f17a9d06?w=1200",   # Barn with wreaths decor
    "https://images.unsplash.com/photo-1763836215279-444c94da6bb6?w=1200",   # String lights leafy
    "https://images.unsplash.com/photo-1747041807585-f38b14c04704?w=1200",   # Outdoor event chairs tables
    "https://images.unsplash.com/photo-1767961054378-4092dbeb7c3b?w=1200",   # Seaside table setup
    "https://images.unsplash.com/photo-1763553113391-a659bee36e06?w=1200",   # Elegant reception decor
]

ROOFTOP_IMAGES = [
    "https://images.unsplash.com/photo-1757706561621-64c21c071db0?w=1200",   # String lights buildings night
    "https://images.unsplash.com/photo-1576359944404-2899f3b634ae?w=1200",   # String lights building
    "https://images.unsplash.com/photo-1563138216-8ff2e182ccbd?w=1200",      # Outdoor restaurant lights
    "https://images.unsplash.com/photo-1705774729144-d1aedf917f19?w=1200",   # Rooftop gathering
    "https://images.unsplash.com/photo-1763836215279-444c94da6bb6?w=1200",   # String lights leafy
    "https://images.unsplash.com/photo-1746044159252-ed0ccafd7b46?w=1200",   # Indoor event space
]

RESORT_IMAGES = [
    "https://images.unsplash.com/photo-1747041807585-f38b14c04704?w=1200",   # Outdoor event pool
    "https://images.unsplash.com/photo-1633346785060-5222e2ffe3b3?w=1200",   # Balcony pool view
    "https://images.unsplash.com/photo-1763553113332-800519753e40?w=1200",   # Wedding reception tables
    "https://images.unsplash.com/photo-1670336423329-3dfbcd081b16?w=1200",   # Garden chairs ceremony
    "https://images.unsplash.com/photo-1758193783649-13371d7fb8dd?w=1200",   # Hotel lobby modern
    "https://images.unsplash.com/photo-1763553113391-a659bee36e06?w=1200",   # Elegant reception decor
    "https://images.unsplash.com/photo-1767961054378-4092dbeb7c3b?w=1200",   # Seaside table setting
    "https://images.unsplash.com/photo-1729603370273-facc0600d259?w=1200",   # Outdoor barn venue
]

PALACE_IMAGES = [
    "https://images.unsplash.com/photo-1761472606347-bfebc5a3e546?w=1200",   # Ornate archway entrance
    "https://images.unsplash.com/photo-1707374661682-d804856cee22?w=1200",   # Grand palace room
    "https://images.unsplash.com/photo-1748126916466-32e5bffd4fb6?w=1200",   # Spectacular chandeliers hall
    "https://images.unsplash.com/photo-1759519238029-689e99c6d19e?w=1200",   # Grand ballroom chandelier
    "https://images.unsplash.com/photo-1764148716678-40a4b8c5b812?w=1200",   # Elegant staircase
    "https://images.unsplash.com/photo-1763231575952-98244918f99b?w=1200",   # Ballroom ornate ceiling
]

CONVENTION_IMAGES = [
    "https://images.unsplash.com/photo-1763231575952-98244918f99b?w=1200",   # Elegant ballroom
    "https://images.unsplash.com/photo-1769812343590-485512e27838?w=1200",   # Event tables setup
    "https://images.unsplash.com/photo-1746044159252-ed0ccafd7b46?w=1200",   # Indoor event space
    "https://images.unsplash.com/photo-1761110787206-2cc164e4913c?w=1200",   # Dining chandeliers
    "https://images.unsplash.com/photo-1758193783649-13371d7fb8dd?w=1200",   # Modern lobby
    "https://images.unsplash.com/photo-1768851142314-c4ebf49ad45b?w=1200",   # Gold chairs setup
]

def get_image_pool(venue_type):
    """Get the appropriate image pool based on venue type."""
    vt = venue_type.lower().strip()
    if 'palace' in vt:
        return PALACE_IMAGES
    elif 'convention' in vt:
        return CONVENTION_IMAGES
    elif 'banquet' in vt:
        return BANQUET_IMAGES
    elif 'farmhouse' in vt or 'farm' in vt:
        return FARMHOUSE_IMAGES
    elif 'rooftop' in vt or 'terrace' in vt:
        return ROOFTOP_IMAGES
    elif 'resort' in vt:
        return RESORT_IMAGES
    else:  # hotel and default
        return HOTEL_IMAGES


async def update_venue_images():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    venues = await db.venues.find(
        {}, 
        {'_id': 1, 'venue_id': 1, 'name': 1, 'city': 1, 'venue_type': 1, 'images': 1}
    ).to_list(100)
    
    print(f"Found {len(venues)} venues to update")
    
    # Track which images have been assigned per type to provide variety
    type_counters = {}
    
    updated = 0
    for venue in venues:
        name = venue.get('name', 'Unknown')
        venue_type = venue.get('venue_type', 'hotel')
        current_images = venue.get('images', [])
        
        pool = get_image_pool(venue_type)
        
        # Get a counter for this type to rotate through images
        type_key = venue_type.lower()
        if type_key not in type_counters:
            type_counters[type_key] = 0
        counter = type_counters[type_key]
        
        # Build the new 5-image set
        # Strategy: Pick 5 images from the pool, offset by counter for variety
        new_images = []
        for i in range(5):
            idx = (counter * 3 + i) % len(pool)
            img = pool[idx]
            if img not in new_images:
                new_images.append(img)
            else:
                # Find next unique image
                for j in range(len(pool)):
                    alt_idx = (idx + j + 1) % len(pool)
                    if pool[alt_idx] not in new_images:
                        new_images.append(pool[alt_idx])
                        break
        
        # Ensure exactly 5 images
        while len(new_images) < 5:
            for img in pool:
                if img not in new_images:
                    new_images.append(img)
                    break
            else:
                break
        
        new_images = new_images[:5]
        
        # Update the venue
        result = await db.venues.update_one(
            {'_id': venue['_id']},
            {'$set': {'images': new_images}}
        )
        
        if result.modified_count > 0:
            updated += 1
            print(f"  ✓ {name} ({venue.get('city','?')}) [{venue_type}] - {len(current_images)} → 5 images")
        else:
            print(f"  - {name} ({venue.get('city','?')}) - no change needed")
        
        type_counters[type_key] = counter + 1
    
    print(f"\nDone! Updated {updated}/{len(venues)} venues to 5 HD images each.")
    client.close()


if __name__ == "__main__":
    asyncio.run(update_venue_images())
