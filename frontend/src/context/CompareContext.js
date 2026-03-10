import React, { createContext, useContext, useState, useCallback } from 'react';

const CompareContext = createContext();

export const CompareProvider = ({ children }) => {
  const [compareVenues, setCompareVenues] = useState([]);
  const MAX_COMPARE = 3;

  const addToCompare = useCallback((venue) => {
    setCompareVenues((prev) => {
      if (prev.length >= MAX_COMPARE) return prev;
      if (prev.find((v) => v.venue_id === venue.venue_id)) return prev;
      return [...prev, venue];
    });
  }, []);

  const removeFromCompare = useCallback((venueId) => {
    setCompareVenues((prev) => prev.filter((v) => v.venue_id !== venueId));
  }, []);

  const isInCompare = useCallback(
    (venueId) => compareVenues.some((v) => v.venue_id === venueId),
    [compareVenues]
  );

  const clearCompare = useCallback(() => setCompareVenues([]), []);

  return (
    <CompareContext.Provider value={{ compareVenues, addToCompare, removeFromCompare, isInCompare, clearCompare, MAX_COMPARE }}>
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
};
