"""
Premium venues seed data for Delhi NCR region.
20+ high-class venues with premium photos.
"""
from datetime import datetime, timezone
from utils import generate_id

def get_premium_venues(owner_id: str) -> list:
    """Return list of 20+ premium Delhi NCR venues."""
    return [
        # 1. Luxury 5-Star Hotels
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "The Imperial Ballroom",
            "description": "Experience unparalleled luxury at Delhi's most prestigious 5-star hotel. The Imperial Ballroom features crystal chandeliers, Italian marble flooring, and world-class service that has hosted royalty and dignitaries for over a century.",
            "city": "Delhi",
            "city_slug": "delhi",
            "area": "Connaught Place",
            "address": "Janpath, Connaught Place, New Delhi",
            "pincode": "110001",
            "latitude": 28.6258,
            "longitude": 77.2195,
            "slug": "the-imperial-ballroom",
            "event_types": ["wedding", "reception", "corporate", "gala_dinner", "award_ceremony"],
            "venue_type": "hotel",
            "indoor_outdoor": "indoor",
            "capacity_min": 100,
            "capacity_max": 800,
            "pricing": {
                "price_per_plate_veg": 4500,
                "price_per_plate_nonveg": 5500,
                "min_spend": 1500000,
                "packages": [
                    {"name": "Royal Wedding", "price": 2500000, "guests": 500},
                    {"name": "Grand Celebration", "price": 1800000, "guests": 300}
                ]
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 235, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": False, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1758714919725-d2740fc99f14?w=1200",
                "https://images.unsplash.com/photo-1763553113332-800519753e40?w=1200",
                "https://images.unsplash.com/photo-1672045812086-41887feb030b?w=1200"
            ],
            "faqs": [
                {"question": "Do you offer wedding planning services?", "answer": "Yes, our dedicated wedding team provides end-to-end planning including decor, catering, and guest coordination."},
                {"question": "What is the cancellation policy?", "answer": "Full refund for cancellations 60+ days before the event. 50% refund for 30-60 days. No refund within 30 days."}
            ],
            "policies": "Minimum booking of 50 rooms required for wedding functions. Advance booking of 6 months recommended.",
            "rating": 4.9,
            "review_count": 312,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 2. The Oberoi
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "The Oberoi Grand Banquet",
            "description": "Synonymous with luxury, The Oberoi's grand banquet hall offers an intimate yet opulent setting. Floor-to-ceiling windows overlook manicured gardens, while the interiors showcase contemporary elegance.",
            "city": "Delhi",
            "city_slug": "delhi",
            "area": "Dr Zakir Hussain Marg",
            "address": "Dr Zakir Hussain Marg, Delhi Golf Club, New Delhi",
            "pincode": "110003",
            "latitude": 28.6057,
            "longitude": 77.2315,
            "slug": "the-oberoi-grand-banquet",
            "event_types": ["wedding", "reception", "corporate", "cocktail", "engagement"],
            "venue_type": "hotel",
            "indoor_outdoor": "both",
            "capacity_min": 50,
            "capacity_max": 500,
            "pricing": {
                "price_per_plate_veg": 5000,
                "price_per_plate_nonveg": 6000,
                "min_spend": 2000000,
                "packages": []
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 220, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": False, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1654336037958-c698d50700b3?w=1200",
                "https://images.unsplash.com/photo-1759519238029-689e99c6d19e?w=1200"
            ],
            "policies": "Premium venue with personalized service. Requires advance booking.",
            "rating": 4.9,
            "review_count": 245,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 3. Taj Palace
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Taj Palace Convention Centre",
            "description": "The epitome of Indian hospitality, Taj Palace offers multiple stunning venues from intimate chambers to grand ballrooms. Experience the legendary Taj service with modern amenities.",
            "city": "Delhi",
            "city_slug": "delhi",
            "area": "Diplomatic Enclave",
            "address": "2 Sardar Patel Marg, Diplomatic Enclave, New Delhi",
            "pincode": "110021",
            "latitude": 28.5997,
            "longitude": 77.1740,
            "slug": "taj-palace-convention-centre",
            "event_types": ["wedding", "reception", "corporate", "conference", "exhibition"],
            "venue_type": "hotel",
            "indoor_outdoor": "both",
            "capacity_min": 100,
            "capacity_max": 1500,
            "pricing": {
                "price_per_plate_veg": 4000,
                "price_per_plate_nonveg": 5000,
                "min_spend": 1200000,
                "packages": [
                    {"name": "Signature Wedding", "price": 3500000, "guests": 800},
                    {"name": "Corporate Summit", "price": 800000, "guests": 400}
                ]
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 403, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": False, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1761472606347-bfebc5a3e546?w=1200",
                "https://images.unsplash.com/photo-1747040762931-d1c96be72798?w=1200"
            ],
            "policies": "Multiple venue options available. Customized packages on request.",
            "rating": 4.8,
            "review_count": 456,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 4. ITC Maurya
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "ITC Maurya Royal Ballroom",
            "description": "Home to the legendary Bukhara restaurant, ITC Maurya's Royal Ballroom is a masterpiece of Indian craftsmanship. The venue showcases traditional Mauryan architecture with contemporary luxury.",
            "city": "Delhi",
            "city_slug": "delhi",
            "area": "Diplomatic Enclave",
            "address": "Sardar Patel Marg, Diplomatic Enclave, New Delhi",
            "pincode": "110021",
            "latitude": 28.5967,
            "longitude": 77.1756,
            "slug": "itc-maurya-royal-ballroom",
            "event_types": ["wedding", "reception", "corporate", "gala_dinner"],
            "venue_type": "hotel",
            "indoor_outdoor": "indoor",
            "capacity_min": 80,
            "capacity_max": 600,
            "pricing": {
                "price_per_plate_veg": 4200,
                "price_per_plate_nonveg": 5200,
                "min_spend": 1400000,
                "packages": []
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 440, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": False, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1601482441062-b9f13131f33a?w=1200",
                "https://images.unsplash.com/photo-1747041807213-197ed4037279?w=1200"
            ],
            "policies": "Award-winning culinary experience included. Premium packages available.",
            "rating": 4.8,
            "review_count": 389,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 5. Heritage Venue - Haveli
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Haveli Dharampura",
            "description": "Step back in time at this meticulously restored 150-year-old haveli in Old Delhi. Original frescoes, intricate jharokhas, and traditional courtyards create an unmatched heritage ambiance for intimate celebrations.",
            "city": "Delhi",
            "city_slug": "delhi",
            "area": "Chandni Chowk",
            "address": "2293, Gali Guliyan, Chandni Chowk, Old Delhi",
            "pincode": "110006",
            "latitude": 28.6562,
            "longitude": 77.2295,
            "slug": "haveli-dharampura",
            "event_types": ["wedding", "mehendi", "sangeet", "engagement", "birthday"],
            "venue_type": "heritage",
            "indoor_outdoor": "both",
            "capacity_min": 30,
            "capacity_max": 200,
            "pricing": {
                "price_per_plate_veg": 2800,
                "price_per_plate_nonveg": 3500,
                "min_spend": 400000,
                "packages": [
                    {"name": "Heritage Celebration", "price": 600000, "guests": 150}
                ]
            },
            "amenities": {
                "parking": False, "valet": True, "alcohol_allowed": True,
                "rooms_available": 14, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": True, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": False, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1761472606347-bfebc5a3e546?w=1200"
            ],
            "faqs": [
                {"question": "Is this venue suitable for a traditional Indian wedding?", "answer": "Absolutely! Our heritage setting is perfect for traditional ceremonies with authentic Mughal-era architecture."}
            ],
            "policies": "Sound restrictions apply after 10 PM. Traditional dress code encouraged.",
            "rating": 4.7,
            "review_count": 167,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 6. Premium Farmhouse - Gurgaon
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "The Roseate Gardens",
            "description": "Spread across 8 acres of landscaped gardens, The Roseate Gardens offers a serene escape from the city. Multiple lawns, a stunning poolside area, and modern indoor spaces make it perfect for grand celebrations.",
            "city": "Gurgaon",
            "city_slug": "gurgaon",
            "area": "Sohna Road",
            "address": "NH-8, Near Ambience Mall, Sohna Road, Gurgaon",
            "pincode": "122001",
            "latitude": 28.4189,
            "longitude": 77.0536,
            "slug": "the-roseate-gardens",
            "event_types": ["wedding", "reception", "mehendi", "sangeet", "cocktail"],
            "venue_type": "farmhouse",
            "indoor_outdoor": "both",
            "capacity_min": 200,
            "capacity_max": 2500,
            "pricing": {
                "price_per_plate_veg": 1800,
                "price_per_plate_nonveg": 2200,
                "min_spend": 800000,
                "packages": [
                    {"name": "Grand Wedding", "price": 2000000, "guests": 1000},
                    {"name": "Intimate Affair", "price": 1000000, "guests": 400}
                ]
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 40, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": True, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1729673766571-2409a89a3f64?w=1200",
                "https://images.unsplash.com/photo-1556442150-6fb9899702ae?w=1200",
                "https://images.unsplash.com/photo-1761121575313-04109e79d9b2?w=1200"
            ],
            "policies": "No sound restrictions. Multiple event setups possible in a single day.",
            "rating": 4.6,
            "review_count": 234,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 7. Luxury Banquet Hall - South Delhi
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "The Grand Pavilion",
            "description": "South Delhi's most sought-after banquet venue features a pillarless hall spanning 15,000 sq ft, adorned with Swarovski crystal chandeliers and Italian marble. Perfect for lavish weddings and corporate galas.",
            "city": "Delhi",
            "city_slug": "delhi",
            "area": "Greater Kailash",
            "address": "M-Block Market, Greater Kailash Part 1, New Delhi",
            "pincode": "110048",
            "latitude": 28.5494,
            "longitude": 77.2400,
            "slug": "the-grand-pavilion",
            "event_types": ["wedding", "reception", "corporate", "award_ceremony", "product_launch"],
            "venue_type": "banquet_hall",
            "indoor_outdoor": "indoor",
            "capacity_min": 150,
            "capacity_max": 1200,
            "pricing": {
                "price_per_plate_veg": 2200,
                "price_per_plate_nonveg": 2800,
                "min_spend": 600000,
                "packages": [
                    {"name": "Premium", "price": 1200000, "guests": 500},
                    {"name": "Signature", "price": 1800000, "guests": 800}
                ]
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 0, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": False, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1747040762931-d1c96be72798?w=1200",
                "https://images.unsplash.com/photo-1601482441062-b9f13131f33a?w=1200"
            ],
            "policies": "Pillarless hall. LED walls and premium AV equipment included.",
            "rating": 4.7,
            "review_count": 198,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 8. Rooftop Venue - Gurgaon
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Sky Lounge by Leela",
            "description": "Gurgaon's most exclusive rooftop venue with breathtaking 360-degree views of the city skyline. The contemporary design, infinity pool, and open-air bar create a magical setting for evening celebrations.",
            "city": "Gurgaon",
            "city_slug": "gurgaon",
            "area": "Cyber City",
            "address": "DLF Cyber City, Phase 3, Gurgaon",
            "pincode": "122002",
            "latitude": 28.4957,
            "longitude": 77.0896,
            "slug": "sky-lounge-by-leela",
            "event_types": ["cocktail", "engagement", "birthday", "corporate", "anniversary"],
            "venue_type": "rooftop",
            "indoor_outdoor": "outdoor",
            "capacity_min": 50,
            "capacity_max": 250,
            "pricing": {
                "price_per_plate_veg": 2500,
                "price_per_plate_nonveg": 3200,
                "min_spend": 500000,
                "packages": []
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 0, "ac": False, "catering_inhouse": True,
                "catering_outside_allowed": False, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1757706561621-64c21c071db0?w=1200",
                "https://images.unsplash.com/photo-1619915176670-6703e524eec1?w=1200"
            ],
            "policies": "Weather-dependent venue. Indoor backup available. Music allowed until 12 AM.",
            "rating": 4.8,
            "review_count": 145,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 9. Resort - Greater Noida
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Jaypee Greens Golf Resort",
            "description": "Nestled within an 18-hole Greg Norman-designed golf course, this sprawling resort offers multiple venues from intimate gazebos to grand lawns. The perfect blend of nature and luxury.",
            "city": "Noida",
            "city_slug": "noida",
            "area": "Greater Noida",
            "address": "Surajpur Kasna Road, Greater Noida",
            "pincode": "201306",
            "latitude": 28.4683,
            "longitude": 77.5074,
            "slug": "jaypee-greens-golf-resort",
            "event_types": ["wedding", "reception", "corporate", "team_building", "destination_wedding"],
            "venue_type": "resort",
            "indoor_outdoor": "both",
            "capacity_min": 100,
            "capacity_max": 3000,
            "pricing": {
                "price_per_plate_veg": 2000,
                "price_per_plate_nonveg": 2500,
                "min_spend": 1000000,
                "packages": [
                    {"name": "Destination Wedding", "price": 5000000, "guests": 1500},
                    {"name": "Corporate Retreat", "price": 500000, "guests": 200}
                ]
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 170, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": True, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1711110065918-388182f86e00?w=1200",
                "https://images.unsplash.com/photo-1764593821339-6be7cb85e7f6?w=1200",
                "https://images.unsplash.com/photo-1770824906466-6254ca2cdc14?w=1200"
            ],
            "policies": "Golf course access for guests. Multiple day packages available.",
            "rating": 4.6,
            "review_count": 287,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 10. Convention Center - Noida
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "India Expo Centre & Mart",
            "description": "NCR's largest convention facility featuring state-of-the-art infrastructure across 57,000 sqm. Ideal for large-scale corporate events, exhibitions, and grand celebrations.",
            "city": "Noida",
            "city_slug": "noida",
            "area": "Greater Noida",
            "address": "Plot No. 23-25, Knowledge Park II, Greater Noida",
            "pincode": "201306",
            "latitude": 28.4748,
            "longitude": 77.5036,
            "slug": "india-expo-centre-mart",
            "event_types": ["conference", "exhibition", "corporate", "product_launch", "wedding"],
            "venue_type": "convention_center",
            "indoor_outdoor": "indoor",
            "capacity_min": 500,
            "capacity_max": 10000,
            "pricing": {
                "price_per_plate_veg": 1200,
                "price_per_plate_nonveg": 1500,
                "min_spend": 500000,
                "packages": [
                    {"name": "Exhibition Hall", "price": 800000, "hours": 8},
                    {"name": "Full Venue", "price": 2500000, "hours": 12}
                ]
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": False,
                "rooms_available": 0, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": True, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1772112334844-2eed0111e690?w=1200",
                "https://images.unsplash.com/photo-1771147372627-7fffe86cf00b?w=1200"
            ],
            "policies": "Modular spaces. Professional AV support included.",
            "rating": 4.4,
            "review_count": 156,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 11. Boutique Wedding Venue - Delhi
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "The Manor",
            "description": "An intimate boutique property in the heart of South Delhi, The Manor offers refined elegance and personalized service. The lush garden setting is perfect for exclusive celebrations.",
            "city": "Delhi",
            "city_slug": "delhi",
            "area": "Friends Colony",
            "address": "77, Friends Colony West, New Delhi",
            "pincode": "110065",
            "latitude": 28.5675,
            "longitude": 77.2631,
            "slug": "the-manor",
            "event_types": ["wedding", "engagement", "cocktail", "birthday", "anniversary"],
            "venue_type": "boutique",
            "indoor_outdoor": "both",
            "capacity_min": 30,
            "capacity_max": 150,
            "pricing": {
                "price_per_plate_veg": 3500,
                "price_per_plate_nonveg": 4500,
                "min_spend": 500000,
                "packages": []
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 16, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": False, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1770824906466-6254ca2cdc14?w=1200"
            ],
            "policies": "Intimate venue for exclusive events. Personalized menus available.",
            "rating": 4.8,
            "review_count": 89,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 12. Wedding Lawn - Gurgaon
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "The Umrao",
            "description": "Set amidst 4 acres of manicured gardens, The Umrao offers a royal setting with its white-washed colonial architecture and pristine lawns. A favorite for traditional Indian weddings.",
            "city": "Gurgaon",
            "city_slug": "gurgaon",
            "area": "NH-8",
            "address": "National Highway 8, Sector 31, Gurgaon",
            "pincode": "122001",
            "latitude": 28.4389,
            "longitude": 77.0236,
            "slug": "the-umrao",
            "event_types": ["wedding", "reception", "mehendi", "sangeet", "engagement"],
            "venue_type": "lawn",
            "indoor_outdoor": "outdoor",
            "capacity_min": 200,
            "capacity_max": 1500,
            "pricing": {
                "price_per_plate_veg": 2200,
                "price_per_plate_nonveg": 2700,
                "min_spend": 700000,
                "packages": [
                    {"name": "Wedding Package", "price": 1500000, "guests": 800}
                ]
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 46, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": True, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1754869592902-c717e0cd0c34?w=1200",
                "https://images.unsplash.com/photo-1761121575313-04109e79d9b2?w=1200"
            ],
            "policies": "Colonial architecture backdrop. Night weddings preferred.",
            "rating": 4.7,
            "review_count": 312,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 13. Club Venue - Delhi
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Delhi Gymkhana Club",
            "description": "One of Delhi's most prestigious members-only clubs, the Delhi Gymkhana offers colonial-era elegance with modern amenities. The sprawling lawns and heritage building create a distinguished setting.",
            "city": "Delhi",
            "city_slug": "delhi",
            "area": "Central Delhi",
            "address": "2, Safdarjung Road, New Delhi",
            "pincode": "110011",
            "latitude": 28.5969,
            "longitude": 77.2010,
            "slug": "delhi-gymkhana-club",
            "event_types": ["wedding", "reception", "corporate", "birthday", "anniversary"],
            "venue_type": "club",
            "indoor_outdoor": "both",
            "capacity_min": 100,
            "capacity_max": 600,
            "pricing": {
                "price_per_plate_veg": 2500,
                "price_per_plate_nonveg": 3000,
                "min_spend": 600000,
                "packages": []
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 0, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": False, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": False, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1764593821339-6be7cb85e7f6?w=1200"
            ],
            "policies": "Members/referrals only. Classic dress code required.",
            "rating": 4.6,
            "review_count": 145,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 14. Premium Banquet - Noida
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Crown Plaza Okhla",
            "description": "Located in the heart of Noida's business district, Crowne Plaza offers sleek, modern venues perfect for corporate events and contemporary celebrations.",
            "city": "Noida",
            "city_slug": "noida",
            "area": "Sector 18",
            "address": "Plot No. 12, Sector 18, Noida",
            "pincode": "201301",
            "latitude": 28.5700,
            "longitude": 77.3219,
            "slug": "crown-plaza-okhla",
            "event_types": ["corporate", "conference", "wedding", "reception", "product_launch"],
            "venue_type": "hotel",
            "indoor_outdoor": "indoor",
            "capacity_min": 50,
            "capacity_max": 400,
            "pricing": {
                "price_per_plate_veg": 2000,
                "price_per_plate_nonveg": 2500,
                "min_spend": 400000,
                "packages": [
                    {"name": "Corporate Day Package", "price": 250000, "hours": 8}
                ]
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 195, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": False, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1772112334844-2eed0111e690?w=1200"
            ],
            "policies": "Business-friendly location. Metro accessible.",
            "rating": 4.5,
            "review_count": 178,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 15. Destination Wedding Venue
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "The Leela Ambience",
            "description": "An urban oasis in Gurgaon, The Leela Ambience combines world-class hospitality with stunning venues. The grand ballroom and outdoor spaces are designed for unforgettable celebrations.",
            "city": "Gurgaon",
            "city_slug": "gurgaon",
            "area": "NH-8",
            "address": "Ambience Island, National Highway 8, Gurgaon",
            "pincode": "122002",
            "latitude": 28.5057,
            "longitude": 77.0996,
            "slug": "the-leela-ambience",
            "event_types": ["wedding", "reception", "corporate", "gala_dinner", "product_launch"],
            "venue_type": "hotel",
            "indoor_outdoor": "both",
            "capacity_min": 100,
            "capacity_max": 1000,
            "pricing": {
                "price_per_plate_veg": 4000,
                "price_per_plate_nonveg": 5000,
                "min_spend": 1500000,
                "packages": [
                    {"name": "Royal Wedding", "price": 3000000, "guests": 600}
                ]
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 322, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": False, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1759519238029-689e99c6d19e?w=1200",
                "https://images.unsplash.com/photo-1769018508631-fe4ebf3fba3a?w=1200"
            ],
            "policies": "Spa and wellness facilities for guests. Helipad available.",
            "rating": 4.8,
            "review_count": 267,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 16. Heritage Mansion - Delhi
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Bikaner House",
            "description": "A stunning 1940s palace originally built for the Maharaja of Bikaner. The Art Deco interiors and sprawling lawns offer a unique heritage setting in the heart of Lutyens Delhi.",
            "city": "Delhi",
            "city_slug": "delhi",
            "area": "India Gate",
            "address": "Pandara Road, Near India Gate, New Delhi",
            "pincode": "110003",
            "latitude": 28.6129,
            "longitude": 77.2295,
            "slug": "bikaner-house",
            "event_types": ["wedding", "reception", "corporate", "art_exhibition", "fashion_show"],
            "venue_type": "heritage",
            "indoor_outdoor": "both",
            "capacity_min": 100,
            "capacity_max": 800,
            "pricing": {
                "price_per_plate_veg": 2500,
                "price_per_plate_nonveg": 3200,
                "min_spend": 800000,
                "packages": []
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 0, "ac": True, "catering_inhouse": False,
                "catering_outside_allowed": True, "decor_inhouse": False,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1761472606347-bfebc5a3e546?w=1200"
            ],
            "policies": "Heritage property - special permits may apply. Outside caterers only.",
            "rating": 4.7,
            "review_count": 134,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 17. Modern Event Space - Gurgaon
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "32nd Milestone",
            "description": "A contemporary event space featuring clean lines and minimalist design. Multiple indoor and outdoor areas can be customized for any occasion, from weddings to corporate launches.",
            "city": "Gurgaon",
            "city_slug": "gurgaon",
            "area": "Sohna Road",
            "address": "32nd Milestone, Sohna Road, Gurgaon",
            "pincode": "122018",
            "latitude": 28.3989,
            "longitude": 77.0636,
            "slug": "32nd-milestone",
            "event_types": ["wedding", "corporate", "product_launch", "exhibition", "concert"],
            "venue_type": "event_space",
            "indoor_outdoor": "both",
            "capacity_min": 100,
            "capacity_max": 2000,
            "pricing": {
                "price_per_plate_veg": 1500,
                "price_per_plate_nonveg": 2000,
                "min_spend": 500000,
                "packages": [
                    {"name": "Day Event", "price": 400000, "hours": 6},
                    {"name": "Full Event", "price": 700000, "hours": 12}
                ]
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 0, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": True, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1522855669585-e23121251ba1?w=1200",
                "https://images.unsplash.com/photo-1754869592902-c717e0cd0c34?w=1200"
            ],
            "policies": "Fully customizable spaces. Multiple events possible.",
            "rating": 4.5,
            "review_count": 198,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 18. Luxury Farmhouse - Chattarpur
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "The Grand Farmhouse",
            "description": "Chattarpur's most opulent farmhouse venue featuring Mediterranean architecture, a stunning pool area, and acres of landscaped gardens. No sound restrictions make it perfect for celebrations.",
            "city": "Delhi",
            "city_slug": "delhi",
            "area": "Chattarpur",
            "address": "Chattarpur Farms, Mehrauli, New Delhi",
            "pincode": "110074",
            "latitude": 28.5005,
            "longitude": 77.1755,
            "slug": "the-grand-farmhouse",
            "event_types": ["wedding", "reception", "mehendi", "sangeet", "birthday"],
            "venue_type": "farmhouse",
            "indoor_outdoor": "both",
            "capacity_min": 200,
            "capacity_max": 3000,
            "pricing": {
                "price_per_plate_veg": 1400,
                "price_per_plate_nonveg": 1800,
                "min_spend": 600000,
                "packages": [
                    {"name": "Complete Wedding", "price": 2500000, "guests": 1500}
                ]
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 12, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": True, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1729673766571-2409a89a3f64?w=1200",
                "https://images.unsplash.com/photo-1556442150-6fb9899702ae?w=1200"
            ],
            "policies": "No sound restrictions. Pool parties allowed. Fireworks permitted with prior approval.",
            "rating": 4.6,
            "review_count": 345,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 19. Temple Wedding Venue
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "ISKCON Dwarka",
            "description": "Experience a sacred wedding at one of Delhi's most beautiful temples. The serene atmosphere and traditional architecture create a divine setting for Hindu ceremonies.",
            "city": "Delhi",
            "city_slug": "delhi",
            "area": "Dwarka",
            "address": "Sector 13, Dwarka, New Delhi",
            "pincode": "110078",
            "latitude": 28.5818,
            "longitude": 77.0480,
            "slug": "iskcon-dwarka",
            "event_types": ["wedding", "engagement", "religious_ceremony"],
            "venue_type": "temple",
            "indoor_outdoor": "indoor",
            "capacity_min": 50,
            "capacity_max": 500,
            "pricing": {
                "price_per_plate_veg": 800,
                "price_per_plate_nonveg": 0,
                "min_spend": 150000,
                "packages": [
                    {"name": "Traditional Wedding", "price": 200000, "guests": 300}
                ]
            },
            "amenities": {
                "parking": True, "valet": False, "alcohol_allowed": False,
                "rooms_available": 0, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": False, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": False, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1761472606347-bfebc5a3e546?w=1200"
            ],
            "policies": "Vegetarian venue only. Traditional dress code required. No loud music.",
            "rating": 4.9,
            "review_count": 234,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 20. Luxury Pool Villa - Noida
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Villa Magnolia",
            "description": "An exclusive private villa in Greater Noida featuring a stunning infinity pool, landscaped gardens, and contemporary architecture. Perfect for intimate luxury celebrations.",
            "city": "Noida",
            "city_slug": "noida",
            "area": "Greater Noida",
            "address": "Alpha 2, Greater Noida",
            "pincode": "201310",
            "latitude": 28.4783,
            "longitude": 77.5174,
            "slug": "villa-magnolia",
            "event_types": ["wedding", "engagement", "birthday", "bachelor_party", "corporate_retreat"],
            "venue_type": "villa",
            "indoor_outdoor": "both",
            "capacity_min": 30,
            "capacity_max": 200,
            "pricing": {
                "price_per_plate_veg": 2000,
                "price_per_plate_nonveg": 2500,
                "min_spend": 300000,
                "packages": []
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 8, "ac": True, "catering_inhouse": False,
                "catering_outside_allowed": True, "decor_inhouse": False,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1711110065918-388182f86e00?w=1200",
                "https://images.unsplash.com/photo-1731502956283-80e068d7d9fb?w=1200"
            ],
            "policies": "Private property. Full venue rental only. Pool parties allowed.",
            "rating": 4.7,
            "review_count": 67,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 21. Hyatt Regency
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Hyatt Regency Delhi",
            "description": "A landmark hotel in the heart of Delhi, Hyatt Regency offers sophisticated venues with impeccable service. The Regency Ballroom is renowned for grand celebrations.",
            "city": "Delhi",
            "city_slug": "delhi",
            "area": "Ring Road",
            "address": "Bhikaji Cama Place, Ring Road, New Delhi",
            "pincode": "110066",
            "latitude": 28.5683,
            "longitude": 77.1858,
            "slug": "hyatt-regency-delhi",
            "event_types": ["wedding", "reception", "corporate", "gala_dinner", "award_ceremony"],
            "venue_type": "hotel",
            "indoor_outdoor": "indoor",
            "capacity_min": 100,
            "capacity_max": 800,
            "pricing": {
                "price_per_plate_veg": 3500,
                "price_per_plate_nonveg": 4200,
                "min_spend": 1000000,
                "packages": []
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 518, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": False, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1654336037958-c698d50700b3?w=1200",
                "https://images.unsplash.com/photo-1764776709859-09e142936d1c?w=1200"
            ],
            "policies": "Central location. Complimentary breakfast for wedding guests.",
            "rating": 4.7,
            "review_count": 289,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 22. Outdoor Garden Venue
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Garden of Five Senses",
            "description": "A unique cultural venue in South Delhi featuring 20 acres of themed gardens. The amphitheater and multiple garden spaces offer a one-of-a-kind setting for celebrations.",
            "city": "Delhi",
            "city_slug": "delhi",
            "area": "Saket",
            "address": "Mehrauli-Badarpur Road, Said-ul-Ajaib, New Delhi",
            "pincode": "110030",
            "latitude": 28.5128,
            "longitude": 77.1978,
            "slug": "garden-of-five-senses",
            "event_types": ["wedding", "reception", "corporate", "fashion_show", "music_concert"],
            "venue_type": "garden",
            "indoor_outdoor": "outdoor",
            "capacity_min": 200,
            "capacity_max": 5000,
            "pricing": {
                "price_per_plate_veg": 1200,
                "price_per_plate_nonveg": 1600,
                "min_spend": 500000,
                "packages": []
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 0, "ac": False, "catering_inhouse": False,
                "catering_outside_allowed": True, "decor_inhouse": False,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1770824906466-6254ca2cdc14?w=1200",
                "https://images.unsplash.com/photo-1761121575313-04109e79d9b2?w=1200"
            ],
            "policies": "Government property. Permits required. Weather-dependent venue.",
            "rating": 4.5,
            "review_count": 178,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # 23. The Pullman
        {
            "venue_id": generate_id("venue_"),
            "owner_id": owner_id,
            "name": "Pullman New Delhi Aerocity",
            "description": "A contemporary hotel near the airport featuring the stunning Magnifique ballroom. Modern design meets French elegance for sophisticated celebrations.",
            "city": "Delhi",
            "city_slug": "delhi",
            "area": "Aerocity",
            "address": "Asset 2, Hospitality District, IGI Airport, New Delhi",
            "pincode": "110037",
            "latitude": 28.5545,
            "longitude": 77.1120,
            "slug": "pullman-new-delhi-aerocity",
            "event_types": ["wedding", "reception", "corporate", "conference", "cocktail"],
            "venue_type": "hotel",
            "indoor_outdoor": "indoor",
            "capacity_min": 50,
            "capacity_max": 500,
            "pricing": {
                "price_per_plate_veg": 3000,
                "price_per_plate_nonveg": 3800,
                "min_spend": 800000,
                "packages": []
            },
            "amenities": {
                "parking": True, "valet": True, "alcohol_allowed": True,
                "rooms_available": 670, "ac": True, "catering_inhouse": True,
                "catering_outside_allowed": False, "decor_inhouse": True,
                "sound_system": True, "dj_allowed": True, "wifi": True, "generator_backup": True
            },
            "images": [
                "https://images.unsplash.com/photo-1769018508631-fe4ebf3fba3a?w=1200"
            ],
            "policies": "Airport proximity. Ideal for destination weddings.",
            "rating": 4.6,
            "review_count": 167,
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
