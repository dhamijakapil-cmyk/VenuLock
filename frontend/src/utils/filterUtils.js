/**
 * Filter utilities for VenuLoQ venue search.
 * Handles cleaning, validation, chip labels, and client-side filtering for offline fallback.
 */

export const DEFAULT_FILTERS = {
  city: '',
  area: '',
  event_type: '',
  venue_type: '',
  venue_types: [],
  indoor_outdoor: '',
  guest_min: '',
  guest_max: '',
  price_min: '',
  price_max: '',
  rating_min: '',
  sort_by: 'popular',
  radius: '',
  parking: false,
  alcohol: false,
  valet: false,
  ac: false,
  catering_inhouse: false,
  catering_outside: false,
  decor: false,
  sound: false,
};

/**
 * Build URLSearchParams from filters, omitting empty/false/default values.
 */
export function cleanFilters(filters) {
  const params = new URLSearchParams();
  const skip = new Set(['sort_by']); // always sent separately

  Object.entries(filters).forEach(([key, value]) => {
    if (skip.has(key)) return;
    if (key === 'venue_types') {
      if (Array.isArray(value) && value.length > 0) {
        params.set('venue_types', value.join(','));
      }
      return;
    }
    if (value === '' || value === null || value === undefined || value === false) return;
    params.set(key, String(value));
  });

  if (filters.sort_by && filters.sort_by !== 'popular') {
    params.set('sort_by', filters.sort_by);
  }

  return params;
}

/**
 * Validate filter form values. Returns { valid: boolean, errors: {} }.
 */
export function validateFilters(filters) {
  const errors = {};

  const guestMin = filters.guest_min !== '' ? parseInt(filters.guest_min, 10) : null;
  const guestMax = filters.guest_max !== '' ? parseInt(filters.guest_max, 10) : null;
  const priceMin = filters.price_min !== '' ? parseFloat(filters.price_min) : null;
  const priceMax = filters.price_max !== '' ? parseFloat(filters.price_max) : null;

  if (guestMin !== null && isNaN(guestMin)) errors.guest_min = 'Enter a valid number';
  if (guestMax !== null && isNaN(guestMax)) errors.guest_max = 'Enter a valid number';
  if (priceMin !== null && isNaN(priceMin)) errors.price_min = 'Enter a valid amount';
  if (priceMax !== null && isNaN(priceMax)) errors.price_max = 'Enter a valid amount';

  if (guestMin !== null && guestMax !== null && !isNaN(guestMin) && !isNaN(guestMax) && guestMin > guestMax) {
    errors.guest_min = 'Min must be ≤ max';
  }
  if (priceMin !== null && priceMax !== null && !isNaN(priceMin) && !isNaN(priceMax) && priceMin > priceMax) {
    errors.price_min = 'Min must be ≤ max';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Build human-readable active filter chips from current filters.
 * Returns array of { key, label, onRemove } objects.
 */
export function buildFilterChips(filters, EVENT_TYPES, VENUE_TYPE_OPTIONS, onRemove) {
  const chips = [];

  if (filters.city) chips.push({ key: 'city', label: filters.city, onRemove: () => onRemove('city', '') });

  if (filters.event_type) {
    const label = EVENT_TYPES.find(e => e.value === filters.event_type)?.label || filters.event_type;
    chips.push({ key: 'event_type', label, onRemove: () => onRemove('event_type', '') });
  }

  if (filters.venue_type) {
    const label = VENUE_TYPE_OPTIONS.find(v => v.value === filters.venue_type)?.label || filters.venue_type;
    chips.push({ key: 'venue_type', label, onRemove: () => onRemove('venue_type', '') });
  }

  if (filters.venue_types?.length > 0) {
    filters.venue_types.forEach(vt => {
      const label = VENUE_TYPE_OPTIONS.find(v => v.value === vt)?.label || vt;
      chips.push({ key: `venue_types_${vt}`, label, onRemove: () => onRemove('venue_types_remove', vt) });
    });
  }

  if (filters.indoor_outdoor) {
    chips.push({ key: 'indoor_outdoor', label: filters.indoor_outdoor === 'indoor' ? 'Indoor' : 'Outdoor', onRemove: () => onRemove('indoor_outdoor', '') });
  }

  if (filters.guest_min && filters.guest_max) {
    chips.push({ key: 'guests', label: `${filters.guest_min}–${filters.guest_max} guests`, onRemove: () => { onRemove('guest_min', ''); onRemove('guest_max', ''); } });
  } else if (filters.guest_min) {
    chips.push({ key: 'guest_min', label: `${filters.guest_min}+ guests`, onRemove: () => onRemove('guest_min', '') });
  } else if (filters.guest_max) {
    chips.push({ key: 'guest_max', label: `Up to ${filters.guest_max} guests`, onRemove: () => onRemove('guest_max', '') });
  }

  if (filters.price_min && filters.price_max) {
    chips.push({ key: 'price', label: `₹${Number(filters.price_min).toLocaleString('en-IN')}–₹${Number(filters.price_max).toLocaleString('en-IN')}/plate`, onRemove: () => { onRemove('price_min', ''); onRemove('price_max', ''); } });
  } else if (filters.price_min) {
    chips.push({ key: 'price_min', label: `From ₹${Number(filters.price_min).toLocaleString('en-IN')}/plate`, onRemove: () => onRemove('price_min', '') });
  } else if (filters.price_max) {
    chips.push({ key: 'price_max', label: `Up to ₹${Number(filters.price_max).toLocaleString('en-IN')}/plate`, onRemove: () => onRemove('price_max', '') });
  }

  if (filters.parking) chips.push({ key: 'parking', label: 'Parking', onRemove: () => onRemove('parking', false) });
  if (filters.alcohol) chips.push({ key: 'alcohol', label: 'Alcohol Allowed', onRemove: () => onRemove('alcohol', false) });
  if (filters.valet) chips.push({ key: 'valet', label: 'Valet', onRemove: () => onRemove('valet', false) });
  if (filters.ac) chips.push({ key: 'ac', label: 'AC', onRemove: () => onRemove('ac', false) });

  return chips;
}

/**
 * Client-side filter for offline/mock mode.
 */
export function applyClientFilters(venues, filters) {
  return venues.filter(v => {
    if (filters.city && v.city?.toLowerCase() !== filters.city.toLowerCase()) return false;
    if (filters.event_type && !v.event_types?.includes(filters.event_type)) return false;
    if (filters.venue_type && v.venue_type !== filters.venue_type) return false;
    if (filters.venue_types?.length > 0 && !filters.venue_types.includes(v.venue_type)) return false;
    if (filters.indoor_outdoor && v.indoor_outdoor !== filters.indoor_outdoor) return false;

    const guestMin = filters.guest_min ? parseInt(filters.guest_min) : null;
    const guestMax = filters.guest_max ? parseInt(filters.guest_max) : null;
    if (guestMin && v.capacity_max < guestMin) return false;
    if (guestMax && v.capacity_min > guestMax) return false;

    const priceMin = filters.price_min ? parseFloat(filters.price_min) : null;
    const priceMax = filters.price_max ? parseFloat(filters.price_max) : null;
    const price = v.pricing?.price_per_plate_veg || 0;
    if (priceMin && price < priceMin) return false;
    if (priceMax && price > priceMax) return false;

    if (filters.parking && !v.amenities?.parking) return false;
    if (filters.alcohol && !v.amenities?.alcohol_allowed) return false;

    return true;
  });
}
