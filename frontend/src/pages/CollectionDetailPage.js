import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth, api } from '@/context/AuthContext';
import { ArrowLeft, Share2, Globe, Lock, Trash2, Star, MapPin, Loader2 } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import Header from '@/components/Header';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const CollectionDetailPage = () => {
  const { collectionId } = useParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { navigate('/auth'); return; }
    fetchCollection();
  }, [collectionId, isAuthenticated, authLoading, navigate]);

  const fetchCollection = async () => {
    try {
      const res = await api.get(`/collections/${collectionId}`);
      setCollection(res.data.collection);
    } catch {
      toast.error('Collection not found');
      navigate('/collections');
    } finally {
      setLoading(false);
    }
  };

  const removeVenue = async (venueId) => {
    try {
      await api.delete(`/collections/${collectionId}/venues/${venueId}`);
      setCollection(prev => ({
        ...prev,
        venues: prev.venues.filter(v => v.venue_id !== venueId),
        venue_count: prev.venue_count - 1,
      }));
      toast.success('Venue removed');
    } catch {
      toast.error('Could not remove');
    }
  };

  const togglePublic = async () => {
    try {
      const res = await api.put(`/collections/${collectionId}`, {
        is_public: !collection.is_public
      });
      setCollection(prev => ({ ...prev, ...res.data.collection }));
      toast.success(collection.is_public ? 'Made private' : 'Now shareable!');
    } catch {
      toast.error('Could not update');
    }
  };

  const share = () => {
    if (!collection.is_public) {
      toast.error('Make it public first');
      return;
    }
    const url = `${window.location.origin}/collections/shared/${collection.share_token}`;
    if (navigator.share) {
      navigator.share({ title: collection.name, text: `Check out my venue collection!`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#F4F1EC] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#D4B36A]" />
        </div>
      </>
    );
  }

  if (!collection) return null;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#F4F1EC]">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/collections')} className="p-1.5 rounded-full hover:bg-white/50" data-testid="collection-detail-back">
                <ArrowLeft className="w-5 h-5 text-[#0B0B0D]" />
              </button>
              <div>
                <h1 className="text-[18px] font-bold text-[#0B0B0D] tracking-tight" style={sans}>{collection.name}</h1>
                <p className="text-[12px] text-[#9CA3AF]" style={sans}>{collection.venue_count} venue{collection.venue_count !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={togglePublic}
                className={`p-2 rounded-lg transition-colors ${collection.is_public ? 'bg-[#D4B36A]/10 text-[#D4B36A]' : 'bg-[#F4F1EC] text-[#9CA3AF]'}`}
                title={collection.is_public ? 'Public — click to make private' : 'Private — click to make public'}
                data-testid="collection-toggle-public"
              >
                {collection.is_public ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </button>
              {collection.is_public && (
                <button
                  onClick={share}
                  className="p-2 rounded-lg bg-[#0B0B0D] text-white"
                  data-testid="collection-share-btn"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Venues */}
          {collection.venues?.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[14px] text-[#9CA3AF] mb-3" style={sans}>This collection is empty</p>
              <Link
                to="/venues/search"
                className="px-5 py-2.5 rounded-xl bg-[#0B0B0D] text-white text-[12px] font-bold inline-block"
                style={sans}
              >
                Browse Venues
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {collection.venues.map(v => (
                <div key={v.venue_id} className="bg-white rounded-xl overflow-hidden shadow-sm flex h-[120px]" data-testid={`collection-venue-${v.venue_id}`}>
                  <Link
                    to={v.city_slug && v.slug ? `/venues/${v.city_slug}/${v.slug}` : `/venues/${v.venue_id}`}
                    className="flex-1 flex min-w-0"
                  >
                    {/* Image */}
                    <div className="relative w-[120px] h-full flex-shrink-0 overflow-hidden">
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
                    {/* Info */}
                    <div className="flex-1 min-w-0 py-3 px-3 flex flex-col justify-between">
                      <div>
                        <h3 className="text-[14px] font-bold text-[#0B0B0D] truncate" style={sans}>{v.name}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#9CA3AF]" />
                          <span className="text-[11px] text-[#9CA3AF] truncate" style={sans}>{v.area ? `${v.area}, ${v.city}` : v.city}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-[15px] font-medium text-[#0B0B0D]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {formatIndianCurrency(v.pricing?.price_per_plate_veg)}
                          </span>
                          <span className="text-[10px] text-[#9CA3AF]" style={sans}>/plate</span>
                        </div>
                        <span className="text-[10px] text-[#9CA3AF]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {v.capacity_min}-{v.capacity_max}
                        </span>
                      </div>
                    </div>
                  </Link>
                  {/* Remove button */}
                  <button
                    onClick={() => removeVenue(v.venue_id)}
                    className="flex-shrink-0 w-10 flex items-center justify-center border-l border-[#F4F1EC] hover:bg-red-50 transition-colors"
                    data-testid={`remove-venue-${v.venue_id}`}
                  >
                    <Trash2 className="w-4 h-4 text-[#CBD5E1] hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CollectionDetailPage;
