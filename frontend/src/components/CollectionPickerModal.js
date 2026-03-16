import React, { useState, useEffect } from 'react';
import { X, Plus, FolderHeart, Check, Loader2 } from 'lucide-react';
import { useAuth, api } from '@/context/AuthContext';
import { toast } from 'sonner';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const CollectionPickerModal = ({ venue, onClose }) => {
  const { isAuthenticated } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchCollections();
  }, [isAuthenticated]);

  const fetchCollections = async () => {
    try {
      const res = await api.get('/collections');
      setCollections(res.data.collections || []);
    } catch {
      toast.error('Could not load collections');
    } finally {
      setLoading(false);
    }
  };

  const createAndAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving('new');
    try {
      const res = await api.post('/collections', { name, venue_id: venue.venue_id });
      setCollections(prev => [res.data.collection, ...prev]);
      setNewName('');
      setCreating(false);
      toast.success(`Saved to "${name}"`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not create collection');
    } finally {
      setSaving(null);
    }
  };

  const toggleVenue = async (collection) => {
    const isIn = collection.venue_ids?.includes(venue.venue_id);
    setSaving(collection.collection_id);
    try {
      if (isIn) {
        await api.delete(`/collections/${collection.collection_id}/venues/${venue.venue_id}`);
        setCollections(prev => prev.map(c =>
          c.collection_id === collection.collection_id
            ? { ...c, venue_ids: c.venue_ids.filter(id => id !== venue.venue_id), venue_count: c.venue_count - 1 }
            : c
        ));
        toast.success(`Removed from "${collection.name}"`);
      } else {
        await api.post(`/collections/${collection.collection_id}/venues/${venue.venue_id}`);
        setCollections(prev => prev.map(c =>
          c.collection_id === collection.collection_id
            ? { ...c, venue_ids: [...(c.venue_ids || []), venue.venue_id], venue_count: c.venue_count + 1 }
            : c
        ));
        toast.success(`Saved to "${collection.name}"`);
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[71] bg-white rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.15)] max-h-[70vh] flex flex-col animate-in slide-in-from-bottom" data-testid="collection-picker-modal">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#E5E0D8]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-[#F4F1EC]">
          <h3 className="text-[15px] font-bold text-[#0B0B0D]" style={sans}>Save to Collection</h3>
          <button onClick={onClose} className="p-1" data-testid="collection-picker-close">
            <X className="w-5 h-5 text-[#9CA3AF]" />
          </button>
        </div>

        {/* Venue being saved */}
        <div className="flex items-center gap-3 px-5 py-3 bg-[#FAFAF8]">
          <img
            src={venue.images?.[0]}
            alt={venue.name}
            className="w-12 h-12 rounded-lg object-cover"
          />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#0B0B0D] truncate" style={sans}>{venue.name}</p>
            <p className="text-[11px] text-[#9CA3AF]" style={sans}>{venue.area}, {venue.city}</p>
          </div>
        </div>

        {/* Collections list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-[#D4B36A]" />
            </div>
          ) : (
            <>
              {collections.map(c => {
                const isIn = c.venue_ids?.includes(venue.venue_id);
                const isSaving = saving === c.collection_id;
                return (
                  <button
                    key={c.collection_id}
                    onClick={() => toggleVenue(c)}
                    disabled={isSaving}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                      isIn ? 'bg-[#D4B36A]/10 border border-[#D4B36A]/30' : 'bg-[#F9F9F7] border border-transparent hover:border-[#E5E0D8]'
                    }`}
                    data-testid={`collection-option-${c.collection_id}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isIn ? 'bg-[#D4B36A]' : 'bg-[#E5E0D8]'}`}>
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : isIn ? (
                        <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                      ) : (
                        <FolderHeart className="w-4 h-4 text-[#9CA3AF]" />
                      )}
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[#0B0B0D] truncate" style={sans}>{c.name}</p>
                      <p className="text-[10px] text-[#9CA3AF]" style={sans}>{c.venue_count || 0} venue{c.venue_count !== 1 ? 's' : ''}</p>
                    </div>
                    {isIn && <span className="text-[9px] font-bold text-[#D4B36A] uppercase tracking-wider" style={sans}>Saved</span>}
                  </button>
                );
              })}

              {collections.length === 0 && !creating && (
                <div className="text-center py-6">
                  <FolderHeart className="w-8 h-8 text-[#E5E0D8] mx-auto mb-2" />
                  <p className="text-[13px] text-[#9CA3AF]" style={sans}>No collections yet</p>
                  <p className="text-[11px] text-[#CBD5E1]" style={sans}>Create one to start saving venues</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Create new collection */}
        <div className="px-5 py-3 border-t border-[#F4F1EC]">
          {creating ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createAndAdd()}
                placeholder="e.g. Wedding Venues"
                className="flex-1 text-[13px] px-3 py-2.5 rounded-xl border border-[#E5E0D8] bg-white focus:outline-none focus:border-[#D4B36A] focus:ring-1 focus:ring-[#D4B36A]/30"
                style={sans}
                data-testid="new-collection-input"
              />
              <button
                onClick={createAndAdd}
                disabled={!newName.trim() || saving === 'new'}
                className="px-4 py-2.5 rounded-xl bg-[#0B0B0D] text-white text-[12px] font-bold disabled:opacity-40"
                style={sans}
                data-testid="create-collection-save-btn"
              >
                {saving === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
              <button onClick={() => { setCreating(false); setNewName(''); }} className="p-2">
                <X className="w-4 h-4 text-[#9CA3AF]" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-[#D4B36A]/40 text-[#D4B36A] hover:bg-[#D4B36A]/5 transition-colors"
              data-testid="create-new-collection-btn"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[12px] font-bold uppercase tracking-wider" style={sans}>New Collection</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default CollectionPickerModal;
