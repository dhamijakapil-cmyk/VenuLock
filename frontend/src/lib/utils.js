import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format number in Indian numbering system
export const formatIndianCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹ --';
  
  const num = parseFloat(amount);
  if (isNaN(num)) return '₹ --';
  
  if (num < 1000) {
    return `₹ ${num.toFixed(0)}`;
  } else if (num < 100000) {
    return `₹ ${(num / 1000).toFixed(1)}K`;
  } else if (num < 10000000) {
    return `₹ ${(num / 100000).toFixed(1)}L`;
  } else {
    return `₹ ${(num / 10000000).toFixed(1)}Cr`;
  }
};

// Format full Indian currency
export const formatIndianCurrencyFull = (amount) => {
  if (!amount && amount !== 0) return '₹ --';
  
  const num = parseFloat(amount);
  if (isNaN(num)) return '₹ --';
  
  return `₹ ${num.toLocaleString('en-IN')}`;
};

// Format date
export const formatDate = (dateString) => {
  if (!dateString) return '--';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// Format datetime
export const formatDateTime = (dateString) => {
  if (!dateString) return '--';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Lead stages (Updated for Managed Concierge Platform)
export const LEAD_STAGES = [
  { value: 'new', label: 'New Client Case', color: 'bg-blue-500' },
  { value: 'contacted', label: 'Contacted', color: 'bg-cyan-500' },
  { value: 'requirement_understood', label: 'Requirement Understood', color: 'bg-indigo-500' },
  { value: 'shortlisted', label: 'Venues Shortlisted', color: 'bg-purple-500' },
  { value: 'site_visit', label: 'Site Visit', color: 'bg-amber-500' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
  { value: 'booking_confirmed', label: 'Event Secured', color: 'bg-green-600' },
  { value: 'lost', label: 'Closed – Not Proceeding', color: 'bg-slate-500' },
];

// Event types
export const EVENT_TYPES = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'reception', label: 'Reception' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'mehendi', label: 'Mehendi' },
  { value: 'sangeet', label: 'Sangeet' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'corporate', label: 'Corporate Event' },
  { value: 'conference', label: 'Conference' },
  { value: 'product_launch', label: 'Product Launch' },
  { value: 'cocktail', label: 'Cocktail Party' },
  { value: 'exhibition', label: 'Exhibition' },
];

// Venue types
export const VENUE_TYPES = [
  { value: 'banquet_hall', label: 'Banquet Hall' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'farmhouse', label: 'Farmhouse' },
  { value: 'resort', label: 'Resort' },
  { value: 'convention_center', label: 'Convention Centre' },
  { value: 'rooftop', label: 'Rooftop' },
  { value: 'garden', label: 'Garden/Lawn' },
  { value: 'heritage', label: 'Heritage Property' },
];

// Indoor/Outdoor options
export const INDOOR_OUTDOOR = [
  { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'both', label: 'Both' },
];

// Guest count options for search
export const GUEST_COUNT_OPTIONS = [
  { value: '0-50', label: 'Up to 50 guests', min: 0, max: 50 },
  { value: '50-100', label: '50 – 100 guests', min: 50, max: 100 },
  { value: '100-300', label: '100 – 300 guests', min: 100, max: 300 },
  { value: '300-500', label: '300 – 500 guests', min: 300, max: 500 },
  { value: '500-1000', label: '500 – 1000 guests', min: 500, max: 1000 },
  { value: '1000+', label: '1000+ guests', min: 1000, max: null },
];

// Radius options for location search
export const RADIUS_OPTIONS = [
  { value: '1', label: '1 km', km: 1 },
  { value: '3', label: '3 km', km: 3 },
  { value: '5', label: '5 km', km: 5 },
  { value: '10', label: '10 km', km: 10 },
  { value: '25', label: '25 km', km: 25 },
  { value: '50', label: '50 km', km: 50 },
];

// City center coordinates for radius search
export const CITY_COORDINATES = {
  'Delhi': { lat: 28.6139, lng: 77.2090 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Gurgaon': { lat: 28.4595, lng: 77.0266 },
  'Noida': { lat: 28.5355, lng: 77.3910 },
  'Hyderabad': { lat: 17.3850, lng: 78.4867 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Pune': { lat: 18.5204, lng: 73.8567 },
  'Kolkata': { lat: 22.5726, lng: 88.3639 },
  'Jaipur': { lat: 26.9124, lng: 75.7873 },
};

// Amenities list
export const AMENITIES = [
  { key: 'parking', label: 'Parking', icon: 'Car' },
  { key: 'valet', label: 'Valet Parking', icon: 'Key' },
  { key: 'alcohol_allowed', label: 'Alcohol Allowed', icon: 'Wine' },
  { key: 'rooms_available', label: 'Rooms Available', icon: 'Bed' },
  { key: 'ac', label: 'Air Conditioning', icon: 'Snowflake' },
  { key: 'catering_inhouse', label: 'In-house Catering', icon: 'ChefHat' },
  { key: 'catering_outside_allowed', label: 'Outside Catering', icon: 'Truck' },
  { key: 'decor_inhouse', label: 'In-house Decor', icon: 'Flower2' },
  { key: 'sound_system', label: 'Sound System', icon: 'Speaker' },
  { key: 'dj_allowed', label: 'DJ Allowed', icon: 'Music' },
  { key: 'wifi', label: 'WiFi', icon: 'Wifi' },
  { key: 'generator_backup', label: 'Generator Backup', icon: 'Zap' },
];

// Sort options
export const SORT_OPTIONS = [
  { value: 'popular', label: 'Recommended' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Rating: High to Low' },
  { value: 'distance', label: 'Distance: Nearest', requiresRadius: true },
];

// User roles
export const USER_ROLES = {
  customer: { label: 'Customer', dashboard: '/my-enquiries' },
  rm: { label: 'Relationship Manager', dashboard: '/rm/dashboard' },
  venue_owner: { label: 'Venue Owner', dashboard: '/venue-owner/dashboard' },
  event_planner: { label: 'Event Planner', dashboard: '/planner/dashboard' },
  admin: { label: 'Admin', dashboard: '/admin/dashboard' },
};

// Get stage badge class
export const getStageBadgeClass = (stage) => {
  const stageData = LEAD_STAGES.find(s => s.value === stage);
  return stageData ? stageData.color : 'bg-gray-500';
};

// Get stage label
export const getStageLabel = (stage) => {
  const stageData = LEAD_STAGES.find(s => s.value === stage);
  return stageData ? stageData.label : stage;
};

// Calculate distance
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
