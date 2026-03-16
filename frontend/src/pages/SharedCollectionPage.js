import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Star, MapPin, FolderHeart, Loader2 } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import Header from '@/components/Header';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;
const sans = { fontFamily: "'DM Sans', sans-serif" };

const SharedCollectionPage = () => {
  const { shareToken } = useParams();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchShared();
  }, [shareToken]);

  const fetchShared = async () => {
    try {
      const res = await axios.get(`${API}/api/collections/shared/${shareToken}`);
      setCollection(res.data.collection);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#F4F1EC] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#D4B36A]" />
        </div>
      </>
    );
  }

  if (error || !collection) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#F4F1EC] flex items-center justify-center">
          <div className="text-center">
            <FolderHeart className="w-10 h-10 text-[#E5E0D8] mx-auto mb-3" />
            <h2 className="text-[16px] font-bold text-[#0B0B0D] mb-1" style={sans}>Collection not found</h2>
            <p className="text-[13px] text-[#9CA3AF]" style={sans}>This collection may be private or deleted</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#F4F1EC]">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="text-center mb-6 pb-5 border-b border-[#E5E0D8]">
            <FolderHeart className="w-8 h-8 text-[#D4B36A] mx-auto mb-2" />
            <h1 className="text-[20px] font-bold text-[#0B0B0D]" style={sans}>{collection.name}</h1>
            <p className="text-[13px] text-[#9CA3AF] mt-1" style={sans}>
              Curated by {collection.owner_name} &middot; {collection.venue_count} venue{collection.venue_count !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Venues */}
          <div className="space-y-3">
            {collection.venues?.map(v => (
              <Link
                key={v.venue_id}
                to={v.city_slug && v.slug ? `/venues/${v.city_slug}/${v.slug}` : `/venues/${v.venue_id}`}
                className="block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                data-testid={`shared-venue-${v.venue_id}`}
              >
                <div className="flex h-[110px]">
                  <div className="relative w-[110px] h-full flex-shrink-0 overflow-hidden">
                    <img
                      src={v.images?.[0]}
                      alt={v.name}
                      className="w-full h-full object-cover"
                      style={{ filter: 'brightness(1.05) saturate(1.15)' }}
                    />
                    {v.rating && (
                      <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                        <Star className="w-2.5 h-2.5 text-[#D4B36A] fill-[#D4B36A]" />
                        <span className="text-[10px] font-bold text-white">{v.rating}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-3 px-3 flex flex-col justify-between">
                    <div>
                      <h3 className="text-[14px] font-bold text-[#0B0B0D] truncate" style={sans}>{v.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#9CA3AF]" />
                        <span className="text-[11px] text-[#9CA3AF] truncate" style={sans}>{v.city}</span>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-[15px] font-medium text-[#0B0B0D]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {formatIndianCurrency(v.pricing?.price_per_plate_veg)}
                      </span>
                      <span className="text-[10px] text-[#9CA3AF]" style={sans}>/plate</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-8">
            <Link
              to="/venues/search"
              className="inline-block px-6 py-3 rounded-xl bg-[#0B0B0D] text-white text-[12px] font-bold uppercase tracking-wider"
              style={sans}
            >
              Explore All Venues
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default SharedCollectionPage;
