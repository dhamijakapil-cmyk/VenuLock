/**
 * FilterBottomSheet — Premium mobile-first filter bottom sheet for VenuLoQ.
 * Features: slide-up animation, swipe to dismiss, backdrop blur,
 * body scroll lock, sticky footer with Clear/Apply, inline validation.
 */
import React, { useEffect, useRef, useState } from 'react';
import { X, Check, Heart, Briefcase, PartyPopper, Gift, Sparkles, MessageSquare, Users, Building2, Home, Mountain, Tent, ChefHat, UtensilsCrossed, Sun, Moon, Car, Wine, Snowflake, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateFilters, DEFAULT_FILTERS } from '@/utils/filterUtils';

const EVENT_TYPE_OPTIONS = [
  { value: 'wedding', label: 'Wedding / Reception', icon: Heart },
  { value: 'engagement', label: 'Engagement', icon: Sparkles },
  { value: 'corporate', label: 'Corporate', icon: Briefcase },
  { value: 'birthday', label: 'Birthday / Anniversary', icon: Gift },
  { value: 'cocktail', label: 'Cocktail / Sangeet', icon: PartyPopper },
  { value: 'conference', label: 'Conference', icon: MessageSquare },
  { value: 'other', label: 'Other', icon: Sparkles },
];

const VENUE_TYPE_OPTIONS = [
  { value: 'banquet_hall', label: 'Banquet Hall', icon: Building2 },
  { value: 'farmhouse', label: 'Farmhouse', icon: Home },
  { value: 'hotel', label: 'Hotel', icon: Building2 },
  { value: 'rooftop', label: 'Rooftop', icon: Sun },
  { value: 'convention_center', label: 'Convention Centre', icon: Building2 },
  { value: 'resort', label: 'Resort', icon: Mountain },
  { value: 'clubhouse', label: 'Clubhouse', icon: Tent },
  { value: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
];

const AMENITY_OPTIONS = [
  { key: 'parking', label: 'Parking', icon: Car },
  { key: 'alcohol', label: 'Alcohol Allowed', icon: Wine },
  { key: 'valet', label: 'Valet', icon: Car },
  { key: 'ac', label: 'Air Conditioned', icon: Snowflake },
  { key: 'catering_inhouse', label: 'In-house Catering', icon: ChefHat },
  { key: 'decor', label: 'Decor Included', icon: Palette },
];

const SETTING_OPTIONS = [
  { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' },
];

const VIBE_OPTIONS = [
  { value: 'Royal', label: 'Royal' },
  { value: 'Modern', label: 'Modern' },
  { value: 'Garden', label: 'Garden' },
  { value: 'Poolside', label: 'Poolside' },
  { value: 'Heritage', label: 'Heritage' },
  { value: 'Intimate', label: 'Intimate' },
  { value: 'Grand Ballroom', label: 'Grand Ballroom' },
];

const inputCls = "w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#D4B36A]/40 bg-white transition-colors";
const errorCls = "text-red-500 text-[11px] mt-1";

export default function FilterBottomSheet({ open, onClose, filters: appliedFilters, onApply, cities = [] }) {
  // Local draft state — only committed on Apply
  const [draft, setDraft] = useState({ ...appliedFilters });
  const [errors, setErrors] = useState({});
  const sheetRef = useRef(null);
  const touchStartY = useRef(null);
  const touchMoveY = useRef(null);

  // Sync draft when sheet opens
  useEffect(() => {
    if (open) {
      setDraft({ ...appliedFilters });
      setErrors({});
    }
  }, [open, appliedFilters]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Swipe down to close
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e) => {
    touchMoveY.current = e.touches[0].clientY;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${Math.min(delta, 200)}px)`;
    }
  };
  const handleTouchEnd = () => {
    const delta = (touchMoveY.current || 0) - (touchStartY.current || 0);
    if (sheetRef.current) sheetRef.current.style.transform = '';
    if (delta > 80) onClose();
    touchStartY.current = null;
    touchMoveY.current = null;
  };

  const set = (key, value) => setDraft(d => ({ ...d, [key]: value }));

  const toggleVenueType = (vt) => {
    setDraft(d => {
      const current = d.venue_types || [];
      return {
        ...d,
        venue_types: current.includes(vt) ? current.filter(x => x !== vt) : [...current, vt],
      };
    });
  };

  const handleApply = () => {
    const { valid, errors: errs } = validateFilters(draft);
    if (!valid) { setErrors(errs); return; }
    onApply(draft);
    onClose();
  };

  const handleClear = () => {
    setDraft({ ...DEFAULT_FILTERS });
    setErrors({});
  };

  const activeCount = [
    draft.event_type, draft.venue_type, draft.indoor_outdoor, draft.vibe,
    draft.guest_min, draft.guest_max, draft.price_min, draft.price_max,
    draft.parking, draft.alcohol,
  ].filter(Boolean).length + (draft.venue_types?.length || 0);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
        data-testid="filter-backdrop"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-[9999] bg-white flex flex-col transition-transform duration-300 ease-out"
        style={{ borderRadius: '16px 16px 0 0', maxHeight: '85vh' }}
        data-testid="filter-bottom-sheet"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle + Header */}
        <div className="flex-shrink-0">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-[#D1D5DB]" />
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#F3F4F6]">
            <h2 className="font-bold text-[#0B0B0D] text-base" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Filters {activeCount > 0 && (
                <span className="ml-2 text-[10px] font-bold bg-[#D4B36A] text-[#0B0B0D] px-2 py-0.5 rounded-full">{activeCount}</span>
              )}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F3F4F6] transition-colors"
              data-testid="filter-sheet-close"
            >
              <X className="w-4 h-4 text-[#64748B]" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* City */}
          {cities.length > 0 && (
            <Section title="City">
              <div className="flex flex-wrap gap-2">
                <Pill active={!draft.city} onClick={() => set('city', '')}>All Cities</Pill>
                {cities.map(c => (
                  <Pill key={c.city || c} active={draft.city === (c.city || c)} onClick={() => set('city', c.city || c)}>
                    {c.city || c}
                  </Pill>
                ))}
              </div>
            </Section>
          )}

          {/* Event Type */}
          <Section title="Event Type">
            <div className="flex flex-wrap gap-2">
              <Pill active={!draft.event_type} onClick={() => set('event_type', '')}>Any Event</Pill>
              {EVENT_TYPE_OPTIONS.map(opt => (
                <Pill key={opt.value} active={draft.event_type === opt.value} onClick={() => set('event_type', opt.value)} icon={opt.icon}>
                  {opt.label}
                </Pill>
              ))}
            </div>
          </Section>

          {/* Venue Type */}
          <Section title="Venue Type">
            <div className="flex flex-wrap gap-2">
              {VENUE_TYPE_OPTIONS.map(opt => {
                const isSelected = draft.venue_types?.includes(opt.value);
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleVenueType(opt.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all",
                      isSelected
                        ? "bg-[#0B0B0D] text-white border-[#0B0B0D]"
                        : "bg-white text-[#374151] border-[#E5E7EB] hover:border-[#D4B36A]"
                    )}
                    data-testid={`filter-vtype-${opt.value}`}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {isSelected && <Check className="w-3 h-3" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Setting */}
          <Section title="Setting">
            <div className="flex gap-2">
              <Pill active={!draft.indoor_outdoor} onClick={() => set('indoor_outdoor', '')}>Any</Pill>
              {SETTING_OPTIONS.map(opt => (
                <Pill key={opt.value} active={draft.indoor_outdoor === opt.value} onClick={() => set('indoor_outdoor', opt.value)}>
                  {opt.label}
                </Pill>
              ))}
            </div>
          </Section>

          {/* Vibe / Style */}
          <Section title="Vibe / Style">
            <div className="flex flex-wrap gap-2">
              <Pill active={!draft.vibe} onClick={() => set('vibe', '')}>Any</Pill>
              {VIBE_OPTIONS.map(opt => (
                <Pill key={opt.value} active={draft.vibe === opt.value} onClick={() => set('vibe', opt.value)}>
                  {opt.label}
                </Pill>
              ))}
            </div>
          </Section>

          {/* Guest Count */}
          <Section title="Guest Count">
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>Minimum</label>
                <input
                  type="number"
                  value={draft.guest_min}
                  onChange={e => { set('guest_min', e.target.value); setErrors(er => ({ ...er, guest_min: '' })); }}
                  placeholder="e.g. 50"
                  className={cn(inputCls, errors.guest_min ? 'border-red-400 focus:ring-red-300' : 'border-[#E5E7EB]')}
                  data-testid="filter-guest-min"
                />
                {errors.guest_min && <p className={errorCls}>{errors.guest_min}</p>}
              </div>
              <span className="text-[#CBD5E1] mt-7 text-lg font-light">—</span>
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>Maximum</label>
                <input
                  type="number"
                  value={draft.guest_max}
                  onChange={e => { set('guest_max', e.target.value); setErrors(er => ({ ...er, guest_max: '' })); }}
                  placeholder="e.g. 500"
                  className={cn(inputCls, errors.guest_max ? 'border-red-400 focus:ring-red-300' : 'border-[#E5E7EB]')}
                  data-testid="filter-guest-max"
                />
                {errors.guest_max && <p className={errorCls}>{errors.guest_max}</p>}
              </div>
            </div>
          </Section>

          {/* Price per Plate */}
          <Section title="Price per Plate">
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>Min (₹)</label>
                <input
                  type="number"
                  value={draft.price_min}
                  onChange={e => { set('price_min', e.target.value); setErrors(er => ({ ...er, price_min: '' })); }}
                  placeholder="e.g. 500"
                  className={cn(inputCls, errors.price_min ? 'border-red-400 focus:ring-red-300' : 'border-[#E5E7EB]')}
                  data-testid="filter-price-min"
                />
                {errors.price_min && <p className={errorCls}>{errors.price_min}</p>}
              </div>
              <span className="text-[#CBD5E1] mt-7 text-lg font-light">—</span>
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>Max (₹)</label>
                <input
                  type="number"
                  value={draft.price_max}
                  onChange={e => { set('price_max', e.target.value); setErrors(er => ({ ...er, price_max: '' })); }}
                  placeholder="e.g. 5000"
                  className={cn(inputCls, errors.price_max ? 'border-red-400 focus:ring-red-300' : 'border-[#E5E7EB]')}
                  data-testid="filter-price-max"
                />
                {errors.price_max && <p className={errorCls}>{errors.price_max}</p>}
              </div>
            </div>
          </Section>

          {/* Amenities */}
          <Section title="Amenities">
            <div className="grid grid-cols-2 gap-2">
              {AMENITY_OPTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => set(key, !draft[key])}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium transition-all text-left",
                    draft[key]
                      ? "border-[#0B0B0D] bg-[#0B0B0D]/[0.04] text-[#0B0B0D]"
                      : "border-[#E5E7EB] text-[#374151] hover:border-[#D4B36A]"
                  )}
                  data-testid={`filter-amenity-${key}`}
                >
                  <Icon className={cn("w-4 h-4 flex-shrink-0", draft[key] ? "text-[#D4B36A]" : "text-[#9CA3AF]")} strokeWidth={1.5} />
                  <span className="flex-1 text-[13px]">{label}</span>
                  <span className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    draft[key] ? "bg-[#0B0B0D] border-[#0B0B0D]" : "border-[#D1D5DB]"
                  )}>
                    {draft[key] && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                </button>
              ))}
            </div>
          </Section>

          {/* Bottom padding for sticky footer */}
          <div className="h-2" />
        </div>

        {/* Sticky Footer */}
        <div className="flex-shrink-0 border-t border-[#F3F4F6] bg-white px-5 py-4 flex gap-3 safe-area-bottom">
          <button
            onClick={handleClear}
            className="flex-1 h-12 rounded-xl border-2 border-[#E5E7EB] text-sm font-semibold text-[#374151] hover:border-[#0B0B0D] transition-colors"
            data-testid="filter-clear-btn"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Clear All
          </button>
          <button
            onClick={handleApply}
            className="flex-[2] h-12 rounded-xl bg-[#0B0B0D] text-white text-sm font-bold hover:bg-[#1a1a1f] transition-colors"
            data-testid="filter-apply-btn"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {activeCount > 0 ? `Apply Filters (${activeCount})` : 'Apply Filters'}
          </button>
        </div>
      </div>
    </>
  );
}

// Sub-components
function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em] mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>{title}</h3>
      {children}
    </div>
  );
}

function Pill({ active, onClick, children, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border transition-all",
        active
          ? "bg-[#0B0B0D] text-white border-[#0B0B0D]"
          : "bg-white text-[#374151] border-[#E5E7EB] hover:border-[#0B0B0D]"
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />}
      {children}
    </button>
  );
}
