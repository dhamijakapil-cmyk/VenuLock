"""
Application configuration and database connection.
"""
import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend configuration
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is required")
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 168  # 7 days

# Razorpay Configuration (Test Mode)
# Google OAuth Configuration (custom VenuLoQ GCP project)
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')

RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_demo')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', 'demo_secret')
RAZORPAY_WEBHOOK_SECRET = os.environ.get('RAZORPAY_WEBHOOK_SECRET', 'webhook_secret')

# Commission Configuration
DEFAULT_COMMISSION_RATE = float(os.environ.get('DEFAULT_COMMISSION_RATE', '10'))
DEFAULT_MIN_ADVANCE_PERCENT = float(os.environ.get('DEFAULT_MIN_ADVANCE_PERCENT', '10'))
MAX_ADVANCE_PERCENT_CAP = float(os.environ.get('MAX_ADVANCE_PERCENT_CAP', '50'))

# Lead Pipeline Stages
LEAD_STAGES = [
    "new",
    "contacted",
    "requirement_understood",
    "shortlisted",
    "site_visit",
    "negotiation",
    "date_locked",
    "deposit_made",
    "final_checks",
    "event_executed",
    "booking_confirmed",
    "lost"
]

# Commission Status Lifecycle
COMMISSION_STATUSES = [
    "projected",
    "confirmed",
    "earned",
    "collected"
]

# Payment Status Lifecycle
PAYMENT_STATUSES = [
    "pending",
    "awaiting_advance",
    "advance_paid",
    "payment_released",
    "payment_failed",
    "refunded"
]

# Availability Statuses
AVAILABILITY_STATUSES = [
    "available",
    "tentative",
    "blocked",
    "booked"
]
