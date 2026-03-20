import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  Megaphone, Eye, TrendingUp, Users,
  Globe, BarChart3, MapPin,
} from 'lucide-react';

const MarketingDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, leadsRes, venuesRes] = await Promise.all([
          api.get('/admin/stats').catch(() => ({ data: {} })),
          api.get('/admin/leads').catch(() => ({ data: { leads: [] } })),
          api.get('/venues/cities').catch(() => ({ data: [] })),
        ]);
        const stats = statsRes.data || {};
        const leads = leadsRes.data?.leads || leadsRes.data || [];
        const cities = venuesRes.data || [];

        // Source breakdown
        const sourceMap = {};
        if (Array.isArray(leads)) {
          leads.forEach(l => {
            const src = l.source || 'Direct';
            sourceMap[src] = (sourceMap[src] || 0) + 1;
          });
        }
        const topSources = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

        // City breakdown
        const cityMap = {};
        if (Array.isArray(leads)) {
          leads.forEach(l => {
            const c = l.city || 'Unknown';
            cityMap[c] = (cityMap[c] || 0) + 1;
          });
        }
        const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

        setData({
          totalLeads: Array.isArray(leads) ? leads.length : 0,
          totalVenues: stats.total_venues || 0,
          activeCities: cities.length,
          topSources,
          topCities,
        });
      } catch {
        toast.error('Failed to load marketing data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Marketing Dashboard" breadcrumbs={[{ label: 'Marketing' }]}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Marketing Dashboard" breadcrumbs={[{ label: 'Marketing' }]}>
      <div className="max-w-5xl mx-auto" data-testid="marketing-dashboard">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Enquiries', value: data?.totalLeads || 0, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Listed Venues', value: data?.totalVenues || 0, icon: Eye, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Active Cities', value: data?.activeCities || 0, icon: Globe, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4" data-testid={`mkt-stat-${i}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <span className="text-xs text-[#64748B]">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-[#111111]">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Lead Sources */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="lead-sources">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#0B0B0D] flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#D4B36A]" />
                Top Lead Sources
              </h3>
            </div>
            {(data?.topSources || []).length === 0 ? (
              <div className="text-center py-8 text-sm text-[#64748B]">No source data</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.topSources.map(([source, count], i) => {
                  const max = data.topSources[0][1];
                  return (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-[#111111] font-medium capitalize">{source}</span>
                        <span className="text-[#64748B] font-bold">{count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#D4B36A] rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Cities */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="top-cities">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#0B0B0D] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#D4B36A]" />
                Top Cities by Enquiry Volume
              </h3>
            </div>
            {(data?.topCities || []).length === 0 ? (
              <div className="text-center py-8 text-sm text-[#64748B]">No city data</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.topCities.map(([city, count], i) => {
                  const max = data.topCities[0][1];
                  return (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-[#111111] font-medium">{city}</span>
                        <span className="text-[#64748B] font-bold">{count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MarketingDashboard;
