import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, api } from '@/context/AuthContext';
import { FolderHeart, Plus, Trash2, Share2, Globe, Lock, Loader2, ArrowLeft, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const CollectionsPage = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { navigate('/auth'); return; }
    fetchCollections();
  }, [isAuthenticated, authLoading, navigate]);

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

  const createCollection = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const res = await api.post('/collections', { name });
      setCollections(prev => [res.data.collection, ...prev]);
      setNewName('');
      setCreating(false);
      toast.success(`"${name}" created`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not create');
    } finally {
      setSaving(false);
    }
  };

  const deleteCollection = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/collections/${id}`);
      setCollections(prev => prev.filter(c => c.collection_id !== id));
      toast.success(`"${name}" deleted`);
    } catch {
      toast.error('Could not delete');
    }
    setMenuOpen(null);
  };

  const togglePublic = async (collection) => {
    try {
      const res = await api.put(`/collections/${collection.collection_id}`, {
        is_public: !collection.is_public
      });
      setCollections(prev => prev.map(c =>
        c.collection_id === collection.collection_id ? { ...c, ...res.data.collection } : c
      ));
      toast.success(collection.is_public ? 'Made private' : 'Now shareable!');
    } catch {
      toast.error('Could not update');
    }
    setMenuOpen(null);
  };

  const shareCollection = (collection) => {
    if (!collection.is_public) {
      toast.error('Make it public first to share');
      return;
    }
    const url = `${window.location.origin}/collections/shared/${collection.share_token}`;
    if (navigator.share) {
      navigator.share({ title: collection.name, text: `Check out my venue collection: ${collection.name}`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
    setMenuOpen(null);
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

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#F4F1EC]">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-white/50" data-testid="collections-back-btn">
                <ArrowLeft className="w-5 h-5 text-[#0B0B0D]" />
              </button>
              <div>
                <h1 className="text-[20px] font-bold text-[#0B0B0D] tracking-tight" style={sans}>My Collections</h1>
                <p className="text-[12px] text-[#9CA3AF]" style={sans}>{collections.length} collection{collections.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0B0B0D] text-white text-[11px] font-bold uppercase tracking-wider"
              style={sans}
              data-testid="create-collection-top-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>

          {/* Create inline */}
          {creating && (
            <div className="flex items-center gap-2 mb-4 bg-white rounded-xl p-3 shadow-sm">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createCollection()}
                placeholder="Collection name..."
                className="flex-1 text-[13px] px-3 py-2 rounded-lg border border-[#E5E0D8] focus:outline-none focus:border-[#D4B36A]"
                style={sans}
                data-testid="collections-page-new-input"
              />
              <button
                onClick={createCollection}
                disabled={!newName.trim() || saving}
                className="px-4 py-2 rounded-lg bg-[#D4B36A] text-[#0B0B0D] text-[12px] font-bold disabled:opacity-40"
                style={sans}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </button>
              <button onClick={() => { setCreating(false); setNewName(''); }}>
                <span className="text-[#9CA3AF] text-[12px]">Cancel</span>
              </button>
            </div>
          )}

          {/* Collection cards */}
          {collections.length === 0 ? (
            <div className="text-center py-16">
              <FolderHeart className="w-12 h-12 text-[#E5E0D8] mx-auto mb-3" />
              <h2 className="text-[16px] font-bold text-[#0B0B0D] mb-1" style={sans}>No collections yet</h2>
              <p className="text-[13px] text-[#9CA3AF] mb-4" style={sans}>
                Save venues while browsing to organize your search
              </p>
              <button
                onClick={() => setCreating(true)}
                className="px-5 py-2.5 rounded-xl bg-[#0B0B0D] text-white text-[12px] font-bold"
                style={sans}
              >
                Create Your First Collection
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {collections.map(c => (
                <div key={c.collection_id} className="relative group">
                  <Link
                    to={`/collections/${c.collection_id}`}
                    className="block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    data-testid={`collection-card-${c.collection_id}`}
                  >
                    {/* Cover image */}
                    <div className="relative h-[120px] bg-[#E5E0D8]">
                      {c.cover_image ? (
                        <img
                          src={c.cover_image}
                          alt={c.name}
                          className="w-full h-full object-cover"
                          style={{ filter: 'brightness(1.05) saturate(1.15)' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FolderHeart className="w-8 h-8 text-[#CBD5E1]" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-2 left-2.5 right-2.5">
                        <p className="text-[13px] font-bold text-white leading-tight truncate" style={sans}>{c.name}</p>
                        <p className="text-[10px] text-white/70" style={sans}>{c.venue_count || 0} venue{c.venue_count !== 1 ? 's' : ''}</p>
                      </div>
                      {/* Public/Private badge */}
                      <div className="absolute top-2 left-2">
                        {c.is_public ? (
                          <span className="flex items-center gap-0.5 bg-[#D4B36A]/90 text-[#0B0B0D] text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            <Globe className="w-2.5 h-2.5" /> Public
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 bg-black/40 backdrop-blur-sm text-white/80 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            <Lock className="w-2.5 h-2.5" /> Private
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Menu button */}
                  <button
                    onClick={() => setMenuOpen(menuOpen === c.collection_id ? null : c.collection_id)}
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white/80 z-10"
                    data-testid={`collection-menu-${c.collection_id}`}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>

                  {/* Dropdown menu */}
                  {menuOpen === c.collection_id && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(null)} />
                      <div className="absolute top-9 right-2 z-30 bg-white rounded-xl shadow-lg border border-[#E5E0D8] py-1 min-w-[140px]" data-testid={`collection-dropdown-${c.collection_id}`}>
                        <button
                          onClick={() => togglePublic(c)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#0B0B0D] hover:bg-[#F4F1EC] text-left"
                          style={sans}
                        >
                          {c.is_public ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                          {c.is_public ? 'Make Private' : 'Make Public'}
                        </button>
                        {c.is_public && (
                          <button
                            onClick={() => shareCollection(c)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#0B0B0D] hover:bg-[#F4F1EC] text-left"
                            style={sans}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            Share Link
                          </button>
                        )}
                        <button
                          onClick={() => deleteCollection(c.collection_id, c.name)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-500 hover:bg-red-50 text-left"
                          style={sans}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CollectionsPage;
