import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/context/AuthContext';

const FAVORITES_KEY = 'favoriteVenues';
const FavoritesContext = createContext(null);

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
};

export const FavoritesProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Load favorites on mount and auth change
  useEffect(() => {
    const load = async () => {
      if (isAuthenticated) {
        try {
          // Merge localStorage favorites on login
          const local = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
          if (local.length > 0) {
            const res = await api.post('/favorites/merge', { venue_ids: local });
            setFavoriteIds(res.data.venue_ids || []);
            localStorage.removeItem(FAVORITES_KEY);
          } else {
            const res = await api.get('/favorites');
            setFavoriteIds(res.data.venue_ids || []);
          }
        } catch {
          // Fallback to localStorage
          setFavoriteIds(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'));
        }
      } else {
        setFavoriteIds(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'));
      }
      setLoaded(true);
    };
    load();
  }, [isAuthenticated, user]);

  const isFavorite = useCallback((venueId) => {
    return favoriteIds.includes(venueId);
  }, [favoriteIds]);

  const toggleFavorite = useCallback(async (venueId) => {
    const isFav = favoriteIds.includes(venueId);

    if (isAuthenticated) {
      try {
        if (isFav) {
          await api.delete(`/favorites/${venueId}`);
          setFavoriteIds(prev => prev.filter(id => id !== venueId));
        } else {
          await api.post('/favorites', { venue_id: venueId });
          setFavoriteIds(prev => [...prev, venueId]);
        }
      } catch {
        // Optimistic update even on error
      }
    } else {
      // Not logged in - store in localStorage
      const next = isFav
        ? favoriteIds.filter(id => id !== venueId)
        : [...favoriteIds, venueId];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      setFavoriteIds(next);
    }
  }, [favoriteIds, isAuthenticated]);

  const clearAll = useCallback(async () => {
    if (isAuthenticated) {
      try {
        await api.delete('/favorites');
      } catch {}
    }
    localStorage.removeItem(FAVORITES_KEY);
    setFavoriteIds([]);
  }, [isAuthenticated]);

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorite, toggleFavorite, clearAll, loaded }}>
      {children}
    </FavoritesContext.Provider>
  );
};
