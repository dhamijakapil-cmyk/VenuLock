import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Star, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatIndianCurrency } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in webpack/react
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom venue marker icon (gold)
const venueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom anchor marker icon (blue/navy)
const anchorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
  shadowSize: [41, 41]
});

// Component to recenter map when anchor changes
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 12);
    }
  }, [center, zoom, map]);
  
  return null;
};

// Venue popup card content
const VenuePopupCard = ({ venue }) => (
  <div className="min-w-[200px] max-w-[280px]">
    {venue.images?.[0] && (
      <img 
        src={venue.images[0]} 
        alt={venue.name}
        className="w-full h-24 object-cover mb-2"
      />
    )}
    <h3 className="font-semibold text-[#111111] text-sm mb-1 line-clamp-1">
      {venue.name}
    </h3>
    <div className="flex items-center gap-1 text-xs text-[#64748B] mb-2">
      <MapPin className="w-3 h-3" />
      <span>{venue.area}, {venue.city}</span>
    </div>
    <div className="flex items-center justify-between text-xs mb-2">
      <div className="flex items-center gap-1">
        <Star className="w-3 h-3 text-[#D4B36A] fill-current" />
        <span className="font-medium">{venue.rating?.toFixed(1) || 'N/A'}</span>
      </div>
      <div className="flex items-center gap-1 text-[#64748B]">
        <Users className="w-3 h-3" />
        <span>{venue.capacity_min}-{venue.capacity_max}</span>
      </div>
    </div>
    <div className="text-sm font-semibold text-[#111111] mb-2">
      {formatIndianCurrency(venue.pricing?.price_per_plate_veg)}/plate
    </div>
    <Link to={`/venues/${venue.venue_id}`}>
      <Button size="sm" className="w-full bg-[#111111] hover:bg-[#153055] text-xs h-7">
        View Details
      </Button>
    </Link>
  </div>
);

const VenueMap = ({ 
  venues = [], 
  anchor = null,        // { lat, lng, label } - search location or city center
  radiusKm = null,      // radius in kilometers for the circle
  onVenuesMissingLocation = null, // callback with count of venues missing coords
  className = '',
}) => {
  // Filter venues that have valid coordinates
  const { validVenues, missingCount } = useMemo(() => {
    const valid = venues.filter(v => 
      v.latitude && v.longitude && 
      !isNaN(parseFloat(v.latitude)) && 
      !isNaN(parseFloat(v.longitude))
    );
    return {
      validVenues: valid,
      missingCount: venues.length - valid.length
    };
  }, [venues]);

  // Notify parent about missing locations
  useEffect(() => {
    if (onVenuesMissingLocation) {
      onVenuesMissingLocation(missingCount);
    }
  }, [missingCount, onVenuesMissingLocation]);

  // Calculate map center and bounds
  const { center, zoom } = useMemo(() => {
    // If anchor is provided, use it
    if (anchor?.lat && anchor?.lng) {
      let zoomLevel = 12;
      if (radiusKm) {
        // Adjust zoom based on radius
        if (radiusKm <= 1) zoomLevel = 15;
        else if (radiusKm <= 3) zoomLevel = 14;
        else if (radiusKm <= 5) zoomLevel = 13;
        else if (radiusKm <= 10) zoomLevel = 12;
        else if (radiusKm <= 25) zoomLevel = 11;
        else zoomLevel = 10;
      }
      return { center: [anchor.lat, anchor.lng], zoom: zoomLevel };
    }
    
    // Otherwise, fit to venue bounds
    if (validVenues.length > 0) {
      const lats = validVenues.map(v => parseFloat(v.latitude));
      const lngs = validVenues.map(v => parseFloat(v.longitude));
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      return { center: [centerLat, centerLng], zoom: 11 };
    }
    
    // Default: Delhi NCR center
    return { center: [28.6139, 77.2090], zoom: 10 };
  }, [anchor, validVenues, radiusKm]);

  return (
    <div className={`relative ${className}`} data-testid="venue-map">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        style={{ minHeight: '400px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater center={center} zoom={zoom} />
        
        {/* Anchor marker (search location) */}
        {anchor?.lat && anchor?.lng && (
          <Marker 
            position={[anchor.lat, anchor.lng]} 
            icon={anchorIcon}
          >
            <Popup>
              <div className="text-center p-1">
                <div className="font-semibold text-[#111111] text-sm">
                  {anchor.label || 'Search Location'}
                </div>
                {radiusKm && (
                  <div className="text-xs text-[#64748B] mt-1">
                    Searching within {radiusKm}km
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Radius circle */}
        {anchor?.lat && anchor?.lng && radiusKm && (
          <Circle
            center={[anchor.lat, anchor.lng]}
            radius={radiusKm * 1000} // Convert km to meters
            pathOptions={{
              color: '#111111',
              fillColor: '#D4B36A',
              fillOpacity: 0.1,
              weight: 2,
              dashArray: '5, 5'
            }}
          />
        )}
        
        {/* Venue markers */}
        {validVenues.map((venue) => (
          <Marker
            key={venue.venue_id}
            position={[parseFloat(venue.latitude), parseFloat(venue.longitude)]}
            icon={venueIcon}
          >
            <Popup maxWidth={300}>
              <VenuePopupCard venue={venue} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Missing locations warning */}
      {missingCount > 0 && (
        <div className="absolute bottom-4 left-4 bg-amber-100 border border-amber-300 text-amber-800 text-xs px-3 py-2 rounded shadow z-[1000]">
          {missingCount} venue{missingCount > 1 ? 's' : ''} missing map location
        </div>
      )}
    </div>
  );
};

export default VenueMap;
