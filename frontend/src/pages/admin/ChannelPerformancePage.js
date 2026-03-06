import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { api } from '@/context/AuthContext';
import { formatIndianCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import {
  TrendingUp, RefreshCw, Filter, Calendar as CalendarIcon,
  Target, IndianRupee, Users, Percent, X, Megaphone,
  Search, Globe, UserPlus, Handshake, Phone, BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';

const SOURCE_ICONS = {
  Meta: Megaphone,
  Google: Search,
  Organic: Globe,
  Referral: UserPlus,
  Planner: Handshake,
  Direct: Phone,
};

const SOURCE_COLORS = {
  Meta: '#1877F2',
  Google: '#4285F4',
  Organic: '#16A34A',
  Referral: '#8B5CF6',
  Planner: '#F59E0B',
  Direct: '#64748B',
};

const DATE_PRESETS = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: 'custom', label: 'Custom Range' },
  { value: 'all', label: 'All Time' },
];

const MetricCard = ({ label, value, subtext, icon: Icon, color, testId }) => (
  <div className="bg-white border border-slate-200 p-5 hover:shadow-md transition-shadow" data-testid={testId}>
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider truncate">{label}</p>
        <p className={`text-2xl font-bold mt-2 font-mono ${color || 'text-[#111111]'}`}>{value}</p>
        {subtext && <p className="text-xs text-[#64748B] mt-1">{subtext}</p>}
      </div>
      <div className={`w-10 h-10 flex items-center justify-center rounded-lg shrink-0 ${
        color === 'text-emerald-600' ? 'bg-emerald-100' :
        color === 'text-[#F5C84C]' ? 'bg-[#F0E6D2]' :
        color === 'text-blue-600' ? 'bg-blue-100' :
        'bg-slate-100'
      }`}>
        <Icon className={`w-5 h-5 ${color || 'text-[#111111]'}`} />
      </div>
    </div>
  </div>
);

const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-slate-400" />
    </div>
    <h3 className="text-lg font-semibold text-[#111111] mb-2">{title}</h3>
    <p className="text-sm text-[#64748B] max-w-md">{description}</p>
  </div>
);

const ChannelPerformancePage = () => {
  const [data, setData] = useState(null);
  const [filterOptions, setFilterOptions] = useState({ cities: [], rms: [] });
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateRange, setDateRange] = useState('30');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedRM, setSelectedRM] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const res = await api.get('/admin/conversion-intelligence/filters');
      setFilterOptions(res.data);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        params.append('start_date', format(customStartDate, 'yyyy-MM-dd'));
        params.append('end_date', format(customEndDate, 'yyyy-MM-dd'));
      } else if (dateRange !== 'all' && dateRange !== 'custom') {
        params.append('date_range', dateRange);
      }
      
      if (selectedCity && selectedCity !== 'all') {
        params.append('city', selectedCity);
      }
      if (selectedRM && selectedRM !== 'all') {
        params.append('rm_id', selectedRM);
      }
      
      const res = await api.get(`/admin/channel-performance?${params.toString()}`);
      setData(res.data);
    } catch (error) {
      console.error('Error fetching channel performance:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate, selectedCity, selectedRM]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    setDateRange('30');
    setCustomStartDate(null);
    setCustomEndDate(null);
    setSelectedCity('all');
    setSelectedRM('all');
  };

  const hasActiveFilters = selectedCity !== 'all' || selectedRM !== 'all' || dateRange !== '30';

  if (loading) {
    return (
      <DashboardLayout 
        title="Channel Performance" 
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Channel Performance' }]}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-[#64748B]">Analyzing channel data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { sources = [], summary = {} } = data || {};
  
  // Prepare chart data
  const barChartData = sources
    .filter(s => s.total_leads > 0)
    .map(s => ({
      name: s.source,
      leads: s.total_leads,
      confirmed: s.confirmed_leads,
      gmv: s.total_gmv,
      commission: s.total_commission,
      conversion: s.conversion_rate,
      fill: SOURCE_COLORS[s.source] || '#64748B',
    }));

  const pieChartData = sources
    .filter(s => s.total_leads > 0)
    .map(s => ({
      name: s.source,
      value: s.total_leads,
      fill: SOURCE_COLORS[s.source] || '#64748B',
    }));

  const gmvPieData = sources
    .filter(s => s.total_gmv > 0)
    .map(s => ({
      name: s.source,
      value: s.total_gmv,
      fill: SOURCE_COLORS[s.source] || '#64748B',
    }));

  return (
    <DashboardLayout
      title="Channel Performance"
      breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Channel Performance' }]}
    >
      {/* Header with filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#111111]">Lead Source Attribution</h2>
          <p className="text-sm text-[#64748B] mt-1">
            Performance metrics by acquisition channel
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? 'border-[#F5C84C] text-[#F5C84C]' : ''}
            data-testid="toggle-filters-btn"
          >
            <Filter className="w-4 h-4 mr-1" />
            Filters
            {hasActiveFilters && <Badge className="ml-2 bg-[#F5C84C] text-white text-xs">Active</Badge>}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData}
            data-testid="refresh-btn"
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-slate-200 p-5 mb-6 animate-in slide-in-from-top-2" data-testid="filters-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#111111] flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#F5C84C]" />
              Filter Data
            </h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-[#64748B]">
                <X className="w-4 h-4 mr-1" /> Clear All
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <Label className="text-xs text-[#64748B] mb-2 block">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger data-testid="date-range-select">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Custom Date Range */}
            {dateRange === 'custom' && (
              <>
                <div>
                  <Label className="text-xs text-[#64748B] mb-2 block">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs text-[#64748B] mb-2 block">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
            
            {/* City Filter */}
            <div>
              <Label className="text-xs text-[#64748B] mb-2 block">City</Label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger data-testid="city-filter-select">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {filterOptions.cities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* RM Filter */}
            <div>
              <Label className="text-xs text-[#64748B] mb-2 block">Relationship Manager</Label>
              <Select value={selectedRM} onValueChange={setSelectedRM}>
                <SelectTrigger data-testid="rm-filter-select">
                  <SelectValue placeholder="All RMs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All RMs</SelectItem>
                  {filterOptions.rms.map(rm => (
                    <SelectItem key={rm.user_id} value={rm.user_id}>{rm.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8" data-testid="summary-cards">
        <MetricCard 
          label="Total Leads" 
          value={summary.total_leads?.toLocaleString() || 0} 
          subtext="Across all sources"
          icon={Users} 
          testId="metric-total-leads" 
        />
        <MetricCard 
          label="Confirmed Bookings" 
          value={summary.total_confirmed?.toLocaleString() || 0} 
          subtext={`${summary.overall_conversion_rate || 0}% conversion`}
          icon={Target} 
          color="text-emerald-600"
          testId="metric-confirmed" 
        />
        <MetricCard 
          label="Total GMV" 
          value={formatIndianCurrency(summary.total_gmv || 0)} 
          subtext="Confirmed bookings"
          icon={TrendingUp} 
          color="text-[#111111]"
          testId="metric-gmv" 
        />
        <MetricCard 
          label="Total Commission" 
          value={formatIndianCurrency(summary.total_commission || 0)} 
          subtext="VL revenue"
          icon={IndianRupee} 
          color="text-[#F5C84C]"
          testId="metric-commission" 
        />
        <MetricCard 
          label="Avg Conversion" 
          value={`${summary.overall_conversion_rate || 0}%`} 
          subtext="Lead to Booking"
          icon={Percent} 
          color="text-blue-600"
          testId="metric-conversion" 
        />
      </div>

      {summary.total_leads === 0 ? (
        <div className="bg-white border border-slate-200 p-6">
          <EmptyState 
            icon={BarChart3}
            title="No Lead Data Available"
            description="There are no leads matching your current filters. Try adjusting the date range or removing filters to see channel performance data."
          />
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Leads by Source Bar Chart */}
            <div className="bg-white border border-slate-200 p-6" data-testid="leads-bar-chart">
              <h3 className="font-semibold text-[#111111] mb-1 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#F5C84C]" />
                Leads by Source
              </h3>
              <p className="text-xs text-[#64748B] mb-6">Lead volume per acquisition channel</p>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload?.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white border border-slate-200 shadow-lg p-3 rounded-lg text-sm">
                              <p className="font-semibold text-[#111111] mb-1">{d.name}</p>
                              <p className="text-[#64748B]">Leads: <strong>{d.leads}</strong></p>
                              <p className="text-[#64748B]">Confirmed: <strong>{d.confirmed}</strong></p>
                              <p className="text-emerald-600">Conversion: <strong>{d.conversion}%</strong></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="leads" name="Leads" radius={[4, 4, 0, 0]} maxBarSize={50}>
                      {barChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Lead Distribution Pie Chart */}
            <div className="bg-white border border-slate-200 p-6" data-testid="leads-pie-chart">
              <h3 className="font-semibold text-[#111111] mb-1 flex items-center gap-2">
                <Target className="w-5 h-5 text-[#F5C84C]" />
                Lead Distribution
              </h3>
              <p className="text-xs text-[#64748B] mb-6">Share of leads by source</p>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [value.toLocaleString(), 'Leads']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* GMV by Source */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* GMV Bar Chart */}
            <div className="bg-white border border-slate-200 p-6" data-testid="gmv-bar-chart">
              <h3 className="font-semibold text-[#111111] mb-1 flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-[#F5C84C]" />
                GMV by Source
              </h3>
              <p className="text-xs text-[#64748B] mb-6">Gross Merchandise Value per channel</p>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData.filter(d => d.gmv > 0)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      tickFormatter={(v) => {
                        if (v >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`;
                        if (v >= 100000) return `${(v / 100000).toFixed(0)}L`;
                        if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                        return v;
                      }}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload?.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white border border-slate-200 shadow-lg p-3 rounded-lg text-sm">
                              <p className="font-semibold text-[#111111] mb-1">{d.name}</p>
                              <p className="text-[#64748B]">GMV: <strong>{formatIndianCurrency(d.gmv)}</strong></p>
                              <p className="text-[#F5C84C]">Commission: <strong>{formatIndianCurrency(d.commission)}</strong></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="gmv" name="GMV" radius={[4, 4, 0, 0]} maxBarSize={50}>
                      {barChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Conversion Rate Comparison */}
            <div className="bg-white border border-slate-200 p-6" data-testid="conversion-chart">
              <h3 className="font-semibold text-[#111111] mb-1 flex items-center gap-2">
                <Percent className="w-5 h-5 text-[#F5C84C]" />
                Conversion Rate by Source
              </h3>
              <p className="text-xs text-[#64748B] mb-6">Lead to booking conversion percentage</p>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} layout="vertical" margin={{ top: 20, right: 30, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} unit="%" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Conversion Rate']}
                    />
                    <Bar dataKey="conversion" name="Conversion %" radius={[0, 4, 4, 0]} maxBarSize={25}>
                      {barChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.conversion >= summary.overall_conversion_rate ? '#16A34A' : '#EF4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white border border-slate-200" data-testid="source-table">
            <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <h3 className="font-semibold text-[#111111] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#F5C84C]" />
                Channel Performance Details
              </h3>
              <p className="text-xs text-[#64748B] mt-1">Complete breakdown by lead source</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Source</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#64748B] uppercase tracking-wider">Leads</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#64748B] uppercase tracking-wider">Confirmed</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#64748B] uppercase tracking-wider">Conv %</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#64748B] uppercase tracking-wider">GMV</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#64748B] uppercase tracking-wider">Commission</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#64748B] uppercase tracking-wider">Avg Deal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sources.map((source, idx) => {
                    const IconComponent = SOURCE_ICONS[source.source] || Phone;
                    const color = SOURCE_COLORS[source.source] || '#64748B';
                    return (
                      <tr key={idx} className="hover:bg-slate-50" data-testid={`source-row-${idx}`}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${color}20` }}
                            >
                              <IconComponent className="w-4 h-4" style={{ color }} />
                            </div>
                            <span className="font-medium text-[#111111]">{source.source}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center font-mono text-sm">
                          {source.total_leads.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-center font-mono text-sm">
                          {source.confirmed_leads.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge className={`text-xs border-0 font-mono ${
                            source.conversion_rate >= summary.overall_conversion_rate
                              ? 'bg-emerald-100 text-emerald-700'
                              : source.conversion_rate > 0
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-500'
                          }`}>
                            {source.conversion_rate}%
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-sm font-medium">
                          {formatIndianCurrency(source.total_gmv)}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-sm text-[#F5C84C] font-medium">
                          {formatIndianCurrency(source.total_commission)}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-sm text-[#64748B]">
                          {source.confirmed_leads > 0 ? formatIndianCurrency(source.avg_deal_value) : '--'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td className="px-4 py-4 font-bold text-[#111111]">TOTAL</td>
                    <td className="px-4 py-4 text-center font-mono font-bold">{summary.total_leads?.toLocaleString()}</td>
                    <td className="px-4 py-4 text-center font-mono font-bold">{summary.total_confirmed?.toLocaleString()}</td>
                    <td className="px-4 py-4 text-center">
                      <Badge className="bg-[#111111] text-white text-xs border-0 font-mono">
                        {summary.overall_conversion_rate}%
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-bold">{formatIndianCurrency(summary.total_gmv)}</td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-[#F5C84C]">{formatIndianCurrency(summary.total_commission)}</td>
                    <td className="px-4 py-4 text-right text-[#64748B]">--</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default ChannelPerformancePage;
