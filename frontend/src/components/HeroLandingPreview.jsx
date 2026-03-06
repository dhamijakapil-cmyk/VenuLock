import React, { useEffect, useMemo, useState } from "react";
import { Search, Sparkles, ShieldCheck, Star, ArrowRight } from "lucide-react";

const DEFAULT_SLIDES = [
  {
    label: "Weddings",
    img: "https://images.unsplash.com/photo-1772127822525-7eda37383b9f?w=1920&q=80",
  },
  {
    label: "Banquets",
    img: "https://images.unsplash.com/photo-1768851142314-c4ebf49ad45b?w=1920&q=80",
  },
  {
    label: "Corporate",
    img: "https://images.unsplash.com/photo-1646215993365-125e6428e1dc?w=1920&q=80",
  },
  {
    label: "Destination",
    img: "https://images.unsplash.com/photo-1768488292726-9c850289925a?w=1920&q=80",
  },
];

const EVENT_TYPES = [
  "Wedding / Reception",
  "Engagement / Roka",
  "Birthday / Party",
  "Corporate / Conference",
  "Cocktail / Sangeet",
  "Other",
];

export default function HeroLandingPreview({
  slides = DEFAULT_SLIDES,
  onSearch,
}) {
  const [active, setActive] = useState(0);
  const [city, setCity] = useState("");
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [guests, setGuests] = useState("");

  const activeSlide = useMemo(() => slides[active] ?? slides[0], [slides, active]);

  // Auto-rotate background (premium, subtle)
  useEffect(() => {
    const t = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, 6500);
    return () => clearInterval(t);
  }, [slides.length]);

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { city: city.trim(), eventType, guests: guests.trim() };
    if (onSearch) onSearch(payload);
    else console.log("Search payload:", payload);
  }

  return (
    <div className="min-h-screen bg-[#070B12] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070B12]/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#F5C84C] to-[#F2D58A] p-[1px]">
              <div className="h-full w-full rounded-xl bg-[#0B1220] flex items-center justify-center">
                <span className="font-semibold tracking-wide">BMV</span>
              </div>
            </div>
            <div className="leading-tight">
              <div className="font-semibold tracking-wide">VenuLock</div>
              <div className="text-xs text-white/60">Smart booking for events</div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-white/80 md:flex">
            <a className="hover:text-white" href="#how">How it works</a>
            <a className="hover:text-white" href="#venues">Venues</a>
            <a className="hover:text-white" href="#trust">Trust</a>
          </nav>

          <div className="flex items-center gap-2">
            <button className="hidden rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:border-white/30 hover:text-white md:inline-flex">
              Login
            </button>
            <button className="rounded-xl bg-[#F5C84C] px-4 py-2 text-sm font-semibold text-[#0B1220] hover:brightness-110">
              Get Expert Help
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <main>
        <section className="relative overflow-hidden">
          {/* Background image */}
          <div className="absolute inset-0">
            <div
              className="h-full w-full bg-cover bg-center transition-opacity duration-700"
              style={{ backgroundImage: `url(${activeSlide.img})` }}
            />
            {/* Premium overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#070B12]/35 via-[#070B12]/70 to-[#070B12]" />
            {/* Subtle glow */}
            <div className="absolute -top-32 left-1/2 h-80 w-[46rem] -translate-x-1/2 rounded-full bg-[#F5C84C]/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-16 md:pb-20 md:pt-24">
            {/* Slide label pills */}
            <div className="mb-8 flex flex-wrap items-center gap-2">
              {slides.map((s, idx) => (
                <button
                  key={s.label}
                  onClick={() => setActive(idx)}
                  className={[
                    "rounded-full border px-3 py-1 text-xs transition",
                    idx === active
                      ? "border-[#F5C84C]/60 bg-[#F5C84C]/15 text-white"
                      : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white",
                  ].join(" ")}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="grid gap-10 md:grid-cols-12 md:items-center">
              {/* Left: Copy */}
              <div className="md:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
                  <Sparkles className="h-4 w-4 text-[#F2D58A]" />
                  Premium venues + smart comparison in minutes
                </div>

                <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
                  Book the perfect venue.
                  <span className="block text-white/90">Without the chaos.</span>
                </h1>

                <p className="mt-4 max-w-xl text-base text-white/75 md:text-lg">
                  Weddings, corporate events, celebrations — compare verified venues,
                  transparent pricing, and availability like a pro.
                </p>

                {/* Trust line */}
                <div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-white/75">
                  <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <ShieldCheck className="h-4 w-4 text-[#F2D58A]" />
                    Verified Venues
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <Star className="h-4 w-4 text-[#F2D58A]" />
                    Ratings & Reviews
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    Transparent Pricing
                  </div>
                </div>
              </div>

              {/* Right: Search Card */}
              <div className="md:col-span-5">
                <div className="rounded-2xl border border-white/15 bg-[#0B1220]/70 p-5 shadow-2xl backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">
                        Find venues instantly
                      </div>
                      <div className="text-xs text-white/60">
                        {activeSlide.label} • Delhi NCR, Mumbai, Bengaluru…
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                      <span className="text-[#F2D58A]">Live</span> availability
                    </div>
                  </div>

                  <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
                    <div>
                      <label className="mb-1 block text-xs text-white/60">
                        City / Location
                      </label>
                      <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g., Delhi, Gurgaon, Noida"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/35 focus:border-[#F5C84C]/60"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-white/60">
                        Event Type
                      </label>
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-[#F5C84C]/60"
                      >
                        {EVENT_TYPES.map((t) => (
                          <option key={t} value={t} className="bg-[#0B1220]">
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-white/60">
                        Guests
                      </label>
                      <input
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                        placeholder="e.g., 200"
                        inputMode="numeric"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/35 focus:border-[#F5C84C]/60"
                      />
                    </div>

                    <button
                      type="submit"
                      className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5C84C] px-4 py-3 text-sm font-semibold text-[#0B1220] hover:brightness-110"
                    >
                      <Search className="h-4 w-4" />
                      Explore Venues
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    <div className="flex items-center justify-between pt-1 text-xs text-white/60">
                      <span>Compare multiple venues in one sheet</span>
                      <a className="text-[#F2D58A] hover:underline" href="#venues">
                        See featured
                      </a>
                    </div>
                  </form>
                </div>

                {/* Micro social proof */}
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white/85">Why people trust BMV</span>
                    <span className="text-[#F2D58A]">4.8★ avg</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                    <div className="rounded-xl border border-white/10 bg-[#0B1220]/40 p-3">
                      <div className="font-semibold text-white/85">Verified</div>
                      <div className="mt-1 text-white/55">Photos & details</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#0B1220]/40 p-3">
                      <div className="font-semibold text-white/85">Transparent</div>
                      <div className="mt-1 text-white/55">Pricing signals</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#0B1220]/40 p-3">
                      <div className="font-semibold text-white/85">Assisted</div>
                      <div className="mt-1 text-white/55">RM expert help</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom fade */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#070B12] to-transparent" />
          </div>
        </section>

        {/* Below fold anchors */}
        <section id="how" className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: "Tell us your event", desc: "City, guests, vibe. Done." },
              { title: "Compare smartly", desc: "Pricing, availability, amenities." },
              { title: "Book confidently", desc: "Verified venues + expert support." },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="text-base font-semibold">{c.title}</div>
                <div className="mt-2 text-sm text-white/65">{c.desc}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
