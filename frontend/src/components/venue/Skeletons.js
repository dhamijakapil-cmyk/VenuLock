import React from 'react';

export const VenueCardSkeleton = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="flex gap-3 bg-white p-3 rounded-lg animate-pulse" data-testid="skeleton-venue-compact">
        <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-slate-200" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
          <div className="flex justify-between pt-1">
            <div className="h-3 bg-slate-100 rounded w-16" />
            <div className="h-4 bg-slate-200 rounded w-12" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 animate-pulse" data-testid="skeleton-venue-card">
      <div className="aspect-[16/10] bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 relative overflow-hidden">
        <div className="absolute inset-0 shimmer-effect" />
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-3 bg-slate-100 rounded-full w-16" />
          <div className="h-3 bg-slate-100 rounded-full w-12" />
        </div>
        <div className="h-6 bg-slate-200 rounded-lg w-3/4" />
        <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-4 bg-slate-100 rounded w-24" />
          <div className="h-8 bg-slate-200 rounded w-20" />
        </div>
      </div>
    </div>
  );
};

export const VenueDetailSkeleton = () => (
  <div className="animate-pulse" data-testid="skeleton-venue-detail">
    {/* Hero skeleton */}
    <div className="relative h-[300px] md:h-[400px] lg:h-[500px] bg-slate-200 lg:rounded-2xl overflow-hidden">
      <div className="absolute inset-0 shimmer-effect" />
      <div className="absolute bottom-4 left-4 space-y-2">
        <div className="h-4 bg-white/20 rounded w-20" />
        <div className="h-8 bg-white/20 rounded w-48" />
        <div className="h-3 bg-white/10 rounded w-32" />
      </div>
    </div>
    {/* Content skeleton */}
    <div className="container-main py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <div className="h-6 bg-slate-200 rounded w-2/3" />
            <div className="h-4 bg-slate-100 rounded w-full" />
            <div className="h-4 bg-slate-100 rounded w-4/5" />
          </div>
          <div className="h-10 bg-slate-100 rounded w-full" />
          <div className="bg-white p-5 rounded-xl border border-slate-100 space-y-3">
            <div className="h-5 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-100 rounded w-full" />
            <div className="h-4 bg-slate-100 rounded w-5/6" />
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="bg-slate-900 p-7 space-y-4 rounded-lg">
            <div className="h-3 bg-white/10 rounded w-20" />
            <div className="h-8 bg-white/10 rounded w-32" />
            <div className="h-px bg-white/5 w-full" />
            <div className="h-4 bg-white/10 rounded w-2/3" />
            <div className="h-4 bg-white/10 rounded w-1/2" />
            <div className="h-12 bg-[#D4B36A]/30 rounded w-full" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const SearchPageSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8" data-testid="skeleton-search-grid">
    {Array.from({ length: count }).map((_, i) => (
      <VenueCardSkeleton key={i} />
    ))}
  </div>
);

export const EnquiryCardSkeleton = () => (
  <div className="bg-white rounded-xl p-5 border border-slate-100 animate-pulse" data-testid="skeleton-enquiry">
    <div className="flex justify-between">
      <div className="space-y-3 flex-1">
        <div className="flex items-center gap-3">
          <div className="h-5 bg-slate-200 rounded w-1/3" />
          <div className="h-5 bg-slate-100 rounded-full w-16" />
        </div>
        <div className="h-4 bg-slate-100 rounded w-1/2" />
        <div className="flex gap-4">
          <div className="h-3 bg-slate-100 rounded w-24" />
          <div className="h-3 bg-slate-100 rounded w-20" />
        </div>
      </div>
      <div className="h-6 w-20 bg-slate-100 rounded" />
    </div>
  </div>
);
