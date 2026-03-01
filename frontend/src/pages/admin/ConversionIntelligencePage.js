import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { formatIndianCurrency, cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, FunnelChart, Funnel, LabelList,
  LineChart, Line, Area, AreaChart,
} from 'recharts';
import {
  TrendingUp, TrendingDown, AlertTriangle, Download, RefreshCw,
  Filter, Calendar as CalendarIcon, Clock, Target, IndianRupee,
  ChevronRight, AlertCircle, CheckCircle2, Zap, BarChart3,
  PieChart, Activity, Users, ArrowRight, X,
} from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';

const STAGE_LABELS = {
  new: 'New Lead',
  contacted: 'Contacted',
  requirement_understood: 'Requirement Understood',
  shortlisted: 'Shortlisted',
  site_visit: 'Site Visit',
  negotiation: 'Negotiation',
  booking_confirmed: 'Confirmed',
};

const STAGE_COLORS = {
  new: '#64748B',
  contacted: '#0B1F3B',
  requirement_understood: '#1E3A5F',
  shortlisted: '#2D5F8A',
  site_visit: '#C9A227',
  negotiation: '#D4AF37',
  booking_confirmed: '#16A34A',
};

const FUNNEL_COLORS = ['#64748B', '#0B1F3B', '#1E3A5F', '#2D5F8A', '#C9A227', '#D4AF37', '#16A34A'];

const DATE_PRESETS = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: 'custom', label: 'Custom Range' },
  { value: 'all', label: 'All Time' },
];

const formatHours = (hrs) => {
  if (hrs === null || hrs === undefined) return '--';
  if (hrs < 1) return `${Math.round(hrs * 60)}m`;
  if (hrs < 24) return `${Math.round(hrs)}h`;
  return `${(hrs / 24).toFixed(1)}d`;
};

const MetricCard = ({ label, value, subtext, icon: Icon, color, trend, testId }) => (
  <div className="bg-white border border-slate-200 p-5 hover:shadow-md transition-shadow" data-testid={testId}>
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider truncate">{label}</p>
        <p className={`text-2xl font-bold mt-2 font-mono ${color || 'text-[#0B1F3B]'}`}>{value}</p>
        {subtext && <p className="text-xs text-[#64748B] mt-1">{subtext}</p>}
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}% vs prev period
          </div>
        )}
      </div>
      <div className={`w-10 h-10 flex items-center justify-center rounded-lg shrink-0 ${
        color === 'text-emerald-600' ? 'bg-emerald-100' :
        color === 'text-[#C9A227]' ? 'bg-[#F0E6D2]' :
        color === 'text-blue-600' ? 'bg-blue-100' :
        color === 'text-red-600' ? 'bg-red-100' :
        'bg-slate-100'
      }`}>
        <Icon className={`w-5 h-5 ${color || 'text-[#0B1F3B]'}`} />
      </div>
    </div>
  </div>
);

const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-slate-400" />
    </div>
    <h3 className="text-lg font-semibold text-[#0B1F3B] mb-2">{title}</h3>
    <p className="text-sm text-[#64748B] max-w-md">{description}</p>
  </div>
);

const ConversionIntelligencePage = () => {
  const [data, setData] = useState(null);
  const [filterOptions, setFilterOptions] = useState({ cities: [], rms: [] });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Filters
  const [dateRange, setDateRange] = useState('30');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedRM, setSelectedRM] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Active tab
  const [activeTab, setActiveTab] = useState('funnel');

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
      if (selectedSource && selectedSource !== 'all') {
        params.append('source', selectedSource);
      }
      
      const res = await api.get(`/admin/conversion-intelligence?${params.toString()}`);
      setData(res.data);
    } catch (error) {
      console.error('Error fetching conversion intelligence:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate, selectedCity, selectedRM, selectedSource]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportCSV = async () => {
    setExporting(true);
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
      if (selectedSource && selectedSource !== 'all') {
        params.append('source', selectedSource);
      }
      
      const res = await api.get(`/admin/conversion-intelligence/export?${params.toString()}`);
      const exportData = res.data;
      
      if (!exportData || exportData.length === 0) {
        alert('No data to export');
        return;
      }
      
      // Convert to CSV
      const headers = Object.keys(exportData[0]);
      const csvRows = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(h => {
            const val = row[h];
            if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val ?? '';
          }).join(',')
        )
      ];
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `conversion_intelligence_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setDateRange('30');
    setCustomStartDate(null);
    setCustomEndDate(null);
    setSelectedCity('all');
    setSelectedRM('all');
    setSelectedSource('all');
  };

  const hasActiveFilters = selectedCity !== 'all' || selectedRM !== 'all' || selectedSource !== 'all' || dateRange !== '30';

  if (loading) {
    return (
      <DashboardLayout 
        title="Conversion Intelligence" 
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Conversion Intelligence' }]}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#0B1F3B] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-[#64748B]">Analyzing conversion data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { drop_off = {}, velocity = {}, forecast = {} } = data || {};
  const { transitions = [], funnel = [], leak_point, overall_conversion = 0, total_leads = 0 } = drop_off;
  const { stage_velocity = [], sla_config = {} } = velocity;
  const { stage_pipeline = [], stage_weights = {} } = forecast;

  // Funnel chart data
  const funnelChartData = funnel.map((item, idx) => ({
    name: STAGE_LABELS[item.stage] || item.stage,
    value: item.count,
    fill: FUNNEL_COLORS[idx] || '#64748B',
    pct: item.pct_of_total,
  }));

  // Velocity bar chart data
  const velocityChartData = stage_velocity
    .filter(s => s.avg_hours !== null)
    .map(s => ({
      name: STAGE_LABELS[s.stage]?.split(' ')[0] || s.stage,
      fullName: STAGE_LABELS[s.stage] || s.stage,
      avgHours: s.avg_hours,
      medianHours: s.median_hours,
      slaThreshold: s.sla_threshold_hours,
      exceedsSLA: s.exceeds_sla,
    }));

  // Pipeline forecast chart
  const pipelineChartData = stage_pipeline.map(s => ({
    name: STAGE_LABELS[s.stage]?.split(' ')[0] || s.stage,
    fullName: STAGE_LABELS[s.stage] || s.stage,
    value: s.total_value,
    weighted: s.weighted_value,
    leads: s.lead_count,
    weight: s.weight_pct,
  }));

  return (
    <DashboardLayout
      title="Conversion Intelligence"
      breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Conversion Intelligence' }]}
    >
      {/* Header with filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#0B1F3B]">Sales Funnel Analysis</h2>
          <p className="text-sm text-[#64748B] mt-1">
            Stage drop-off, deal velocity, and revenue forecasting
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? 'border-[#C9A227] text-[#C9A227]' : ''}
            data-testid="toggle-filters-btn"
          >
            <Filter className="w-4 h-4 mr-1" />
            Filters
            {hasActiveFilters && <Badge className="ml-2 bg-[#C9A227] text-white text-xs">Active</Badge>}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData}
            data-testid="refresh-btn"
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          
          <Button 
            size="sm" 
            onClick={handleExportCSV}
            disabled={exporting}
            className="bg-[#0B1F3B] hover:bg-[#1E3A5F]"
            data-testid="export-csv-btn"
          >
            <Download className="w-4 h-4 mr-1" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-slate-200 p-5 mb-6 animate-in slide-in-from-top-2" data-testid="filters-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0B1F3B] flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#C9A227]" />
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
            
            {/* Source Filter */}
            <div>
              <Label className="text-xs text-[#64748B] mb-2 block">Lead Source</Label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger data-testid="source-filter-select">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {(filterOptions.sources || []).map(source => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
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
          value={total_leads.toLocaleString()} 
          subtext="In selected period"
          icon={Users} 
          testId="metric-total-leads" 
        />
        <MetricCard 
          label="Overall Conversion" 
          value={`${overall_conversion}%`} 
          subtext="Lead to Booking"
          icon={Target} 
          color="text-emerald-600"
          testId="metric-conversion" 
        />
        <MetricCard 
          label="Pipeline Value" 
          value={formatIndianCurrency(forecast.pipeline_value || 0)} 
          subtext={`${forecast.pipeline_lead_count || 0} active deals`}
          icon={TrendingUp} 
          color="text-[#0B1F3B]"
          testId="metric-pipeline" 
        />
        <MetricCard 
          label="Weighted GMV" 
          value={formatIndianCurrency(forecast.weighted_projected_gmv || 0)} 
          subtext="Stage-adjusted forecast"
          icon={IndianRupee} 
          color="text-[#C9A227]"
          testId="metric-weighted-gmv" 
        />
        <MetricCard 
          label="Projected Commission" 
          value={formatIndianCurrency(forecast.projected_total_commission || 0)} 
          subtext="This month"
          icon={BarChart3} 
          color="text-blue-600"
          testId="metric-commission" 
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-lg p-1 w-fit" data-testid="tab-nav">
        {[
          { id: 'funnel', label: 'Stage Funnel', icon: PieChart },
          { id: 'velocity', label: 'Deal Velocity', icon: Clock },
          { id: 'forecast', label: 'Revenue Forecast', icon: TrendingUp },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-[#0B1F3B] text-white'
                : 'text-[#64748B] hover:bg-slate-50'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* FUNNEL TAB */}
      {activeTab === 'funnel' && (
        <div className="space-y-6">
          {total_leads === 0 ? (
            <div className="bg-white border border-slate-200 p-6">
              <EmptyState 
                icon={PieChart}
                title="No Lead Data Available"
                description="There are no leads matching your current filters. Try adjusting the date range or removing filters to see conversion data."
              />
            </div>
          ) : (
            <>
              {/* Leak Point Alert */}
              {leak_point && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg" data-testid="leak-point-alert">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-800">Leak Point Detected</h4>
                      <p className="text-sm text-red-700 mt-1">
                        <strong>{leak_point.drop_off_pct}%</strong> of leads drop off between{' '}
                        <strong>{STAGE_LABELS[leak_point.from_stage]}</strong> and{' '}
                        <strong>{STAGE_LABELS[leak_point.to_stage]}</strong>.
                        That's <strong>{leak_point.drop_off_count}</strong> leads lost at this stage.
                      </p>
                      <p className="text-xs text-red-600 mt-2">
                        Focus improvement efforts here to maximize conversion rates.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Visual Funnel */}
                <div className="bg-white border border-slate-200 p-6" data-testid="funnel-chart">
                  <h3 className="font-semibold text-[#0B1F3B] mb-1 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-[#C9A227]" />
                    Conversion Funnel
                  </h3>
                  <p className="text-xs text-[#64748B] mb-6">Lead progression through stages</p>
                  
                  <div className="space-y-3">
                    {funnel.map((item, idx) => {
                      const width = Math.max(item.pct_of_total, 10);
                      const isLeakPoint = leak_point && leak_point.from_stage === item.stage;
                      return (
                        <div key={item.stage} className="relative">
                          <div className="flex justify-between text-xs mb-1">
                            <span className={`font-medium ${isLeakPoint ? 'text-red-600' : 'text-[#64748B]'}`}>
                              {STAGE_LABELS[item.stage]}
                              {isLeakPoint && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                            </span>
                            <span className="font-mono font-semibold">{item.count.toLocaleString()} ({item.pct_of_total}%)</span>
                          </div>
                          <div className="h-8 bg-slate-100 rounded overflow-hidden">
                            <div 
                              className={`h-full rounded transition-all duration-500 flex items-center justify-end pr-2 ${
                                isLeakPoint ? 'bg-red-400' : ''
                              }`}
                              style={{ 
                                width: `${width}%`,
                                backgroundColor: isLeakPoint ? undefined : FUNNEL_COLORS[idx],
                              }}
                            >
                              {width > 30 && (
                                <span className="text-white text-xs font-medium">{item.count}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stage Transitions Table */}
                <div className="bg-white border border-slate-200 p-6" data-testid="transitions-table">
                  <h3 className="font-semibold text-[#0B1F3B] mb-1 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#C9A227]" />
                    Stage-to-Stage Conversion
                  </h3>
                  <p className="text-xs text-[#64748B] mb-4">Drop-off analysis between stages</p>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 text-xs font-semibold text-[#64748B] uppercase">Transition</th>
                          <th className="text-center py-2 text-xs font-semibold text-[#64748B] uppercase">Conv %</th>
                          <th className="text-center py-2 text-xs font-semibold text-[#64748B] uppercase">Drop-off</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transitions.map((t, idx) => (
                          <tr 
                            key={idx} 
                            className={`${t.is_leak_point ? 'bg-red-50' : 'hover:bg-slate-50'}`}
                            data-testid={`transition-row-${idx}`}
                          >
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs ${t.is_leak_point ? 'text-red-700 font-semibold' : 'text-[#64748B]'}`}>
                                  {STAGE_LABELS[t.from_stage]?.split(' ')[0]}
                                </span>
                                <ArrowRight className={`w-3 h-3 ${t.is_leak_point ? 'text-red-500' : 'text-slate-400'}`} />
                                <span className={`text-xs ${t.is_leak_point ? 'text-red-700 font-semibold' : 'text-[#64748B]'}`}>
                                  {STAGE_LABELS[t.to_stage]?.split(' ')[0]}
                                </span>
                                {t.is_leak_point && (
                                  <Badge className="bg-red-100 text-red-700 text-[10px] border-0">LEAK POINT</Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-center">
                              <Badge className={`text-xs border-0 font-mono ${
                                t.conversion_rate >= 70 ? 'bg-emerald-100 text-emerald-700' :
                                t.conversion_rate >= 40 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {t.conversion_rate}%
                              </Badge>
                            </td>
                            <td className="py-3 text-center">
                              <span className={`text-xs font-mono ${t.is_leak_point ? 'text-red-600 font-semibold' : 'text-[#64748B]'}`}>
                                {t.drop_off} ({t.drop_off_pct}%)
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* VELOCITY TAB */}
      {activeTab === 'velocity' && (
        <div className="space-y-6">
          {/* Velocity Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="velocity-summary">
            <div className="bg-white border border-slate-200 p-5">
              <p className="text-xs font-semibold text-[#64748B] uppercase">Avg Time to Contact</p>
              <p className="text-2xl font-bold mt-2 font-mono text-[#0B1F3B]">
                {formatHours(velocity.avg_time_to_first_contact_hrs)}
              </p>
              <p className="text-xs text-[#64748B] mt-1">
                Median: {formatHours(velocity.median_time_to_first_contact_hrs)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-5">
              <p className="text-xs font-semibold text-[#64748B] uppercase">Avg Time to Close</p>
              <p className="text-2xl font-bold mt-2 font-mono text-[#0B1F3B]">
                {velocity.avg_time_to_close_days !== null ? `${velocity.avg_time_to_close_days}d` : '--'}
              </p>
              <p className="text-xs text-[#64748B] mt-1">
                Median: {velocity.median_time_to_close_days !== null ? `${velocity.median_time_to_close_days}d` : '--'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-5">
              <p className="text-xs font-semibold text-[#64748B] uppercase">Deals Tracked</p>
              <p className="text-2xl font-bold mt-2 font-mono text-[#0B1F3B]">
                {velocity.sample_sizes?.close || 0}
              </p>
              <p className="text-xs text-[#64748B] mt-1">Completed bookings</p>
            </div>
            <div className="bg-white border border-slate-200 p-5">
              <p className="text-xs font-semibold text-[#64748B] uppercase">Payment to Confirm</p>
              <p className="text-2xl font-bold mt-2 font-mono text-[#0B1F3B]">
                {velocity.avg_payment_to_confirmation_days !== null ? `${velocity.avg_payment_to_confirmation_days}d` : '--'}
              </p>
              <p className="text-xs text-[#64748B] mt-1">Avg processing time</p>
            </div>
          </div>

          {/* Stage Velocity Chart & Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Velocity Bar Chart */}
            <div className="bg-white border border-slate-200 p-6" data-testid="velocity-chart">
              <h3 className="font-semibold text-[#0B1F3B] mb-1 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#C9A227]" />
                Stage Duration (Avg Hours)
              </h3>
              <p className="text-xs text-[#64748B] mb-6">Time spent in each pipeline stage</p>
              
              {velocityChartData.length === 0 ? (
                <EmptyState 
                  icon={Clock}
                  title="Insufficient Data"
                  description="Not enough completed deals to calculate stage velocity metrics."
                />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={velocityChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} unit="h" />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload?.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white border border-slate-200 shadow-lg p-3 rounded-lg text-sm">
                                <p className="font-semibold text-[#0B1F3B] mb-1">{d.fullName}</p>
                                <p className="text-[#64748B]">Avg: <strong>{formatHours(d.avgHours)}</strong></p>
                                <p className="text-[#64748B]">Median: <strong>{formatHours(d.medianHours)}</strong></p>
                                {d.slaThreshold && (
                                  <p className={d.exceedsSLA ? 'text-red-600' : 'text-emerald-600'}>
                                    SLA: {d.slaThreshold}h {d.exceedsSLA ? '(EXCEEDED)' : '(OK)'}
                                  </p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="avgHours" name="Avg Hours" radius={[4, 4, 0, 0]} maxBarSize={45}>
                        {velocityChartData.map((entry, index) => (
                          <Cell 
                            key={index} 
                            fill={entry.exceedsSLA ? '#DC2626' : '#0B1F3B'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Stage Velocity Table */}
            <div className="bg-white border border-slate-200 p-6" data-testid="velocity-table">
              <h3 className="font-semibold text-[#0B1F3B] mb-1 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#C9A227]" />
                Stage Velocity Details
              </h3>
              <p className="text-xs text-[#64748B] mb-4">Average & median time per stage with SLA status</p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 text-xs font-semibold text-[#64748B] uppercase">Stage</th>
                      <th className="text-center py-2 text-xs font-semibold text-[#64748B] uppercase">Avg</th>
                      <th className="text-center py-2 text-xs font-semibold text-[#64748B] uppercase">Median</th>
                      <th className="text-center py-2 text-xs font-semibold text-[#64748B] uppercase">SLA</th>
                      <th className="text-center py-2 text-xs font-semibold text-[#64748B] uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stage_velocity.map((s, idx) => (
                      <tr 
                        key={idx} 
                        className={`${s.exceeds_sla ? 'bg-red-50' : 'hover:bg-slate-50'}`}
                        data-testid={`velocity-row-${idx}`}
                      >
                        <td className="py-3 text-xs font-medium text-[#0B1F3B]">
                          {STAGE_LABELS[s.stage]}
                        </td>
                        <td className="py-3 text-center font-mono text-xs">
                          {formatHours(s.avg_hours)}
                        </td>
                        <td className="py-3 text-center font-mono text-xs">
                          {formatHours(s.median_hours)}
                        </td>
                        <td className="py-3 text-center font-mono text-xs text-[#64748B]">
                          {s.sla_threshold_hours ? `${s.sla_threshold_hours}h` : '--'}
                        </td>
                        <td className="py-3 text-center">
                          {s.sla_threshold_hours ? (
                            s.exceeds_sla ? (
                              <Badge className="bg-red-100 text-red-700 text-[10px] border-0">
                                <AlertCircle className="w-3 h-3 mr-1" /> EXCEEDED
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-0">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> OK
                              </Badge>
                            )
                          ) : (
                            <span className="text-xs text-[#64748B]">--</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORECAST TAB */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          {/* Forecast Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="forecast-summary">
            <div className="bg-white border border-slate-200 p-5">
              <p className="text-xs font-semibold text-[#64748B] uppercase">Total Pipeline</p>
              <p className="text-2xl font-bold mt-2 font-mono text-[#0B1F3B]">
                {formatIndianCurrency(forecast.pipeline_value || 0)}
              </p>
              <p className="text-xs text-[#64748B] mt-1">{forecast.pipeline_lead_count || 0} active deals</p>
            </div>
            <div className="bg-white border border-[#C9A227] p-5 bg-gradient-to-br from-[#FEFBF3] to-white">
              <p className="text-xs font-semibold text-[#C9A227] uppercase">Weighted GMV</p>
              <p className="text-2xl font-bold mt-2 font-mono text-[#C9A227]">
                {formatIndianCurrency(forecast.weighted_projected_gmv || 0)}
              </p>
              <p className="text-xs text-[#64748B] mt-1">Stage-probability adjusted</p>
            </div>
            <div className="bg-white border border-emerald-200 p-5 bg-gradient-to-br from-emerald-50 to-white">
              <p className="text-xs font-semibold text-emerald-600 uppercase">Weighted Commission</p>
              <p className="text-2xl font-bold mt-2 font-mono text-emerald-600">
                {formatIndianCurrency(forecast.weighted_projected_commission || 0)}
              </p>
              <p className="text-xs text-[#64748B] mt-1">Expected revenue</p>
            </div>
            <div className="bg-white border border-blue-200 p-5 bg-gradient-to-br from-blue-50 to-white">
              <p className="text-xs font-semibold text-blue-600 uppercase">Confirmed This Month</p>
              <p className="text-2xl font-bold mt-2 font-mono text-blue-600">
                {formatIndianCurrency(forecast.confirmed_gmv_this_month || 0)}
              </p>
              <p className="text-xs text-[#64748B] mt-1">
                Comm: {formatIndianCurrency(forecast.confirmed_commission_this_month || 0)}
              </p>
            </div>
          </div>

          {/* Stage Weights Info */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg" data-testid="stage-weights-info">
            <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Stage Probability Weights
            </h4>
            <p className="text-xs text-blue-700 mb-3">
              Weighted GMV is calculated by multiplying each deal's value by its stage's probability of closing.
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stage_weights).map(([stage, weight]) => (
                <Badge key={stage} variant="outline" className="text-xs bg-white border-blue-300 text-blue-700">
                  {STAGE_LABELS[stage]?.split(' ')[0] || stage}: {Math.round(weight * 100)}%
                </Badge>
              ))}
            </div>
          </div>

          {/* Pipeline Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pipeline by Stage Chart */}
            <div className="bg-white border border-slate-200 p-6" data-testid="pipeline-chart">
              <h3 className="font-semibold text-[#0B1F3B] mb-1 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#C9A227]" />
                Pipeline Value by Stage
              </h3>
              <p className="text-xs text-[#64748B] mb-6">Total vs weighted value per stage</p>
              
              {pipelineChartData.length === 0 || forecast.pipeline_lead_count === 0 ? (
                <EmptyState 
                  icon={TrendingUp}
                  title="No Active Pipeline"
                  description="There are no active deals in the pipeline for the selected filters."
                />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pipelineChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                                <p className="font-semibold text-[#0B1F3B] mb-1">{d.fullName}</p>
                                <p className="text-[#64748B]">Leads: <strong>{d.leads}</strong></p>
                                <p className="text-[#64748B]">Total Value: <strong>{formatIndianCurrency(d.value)}</strong></p>
                                <p className="text-[#C9A227]">Weighted ({d.weight}%): <strong>{formatIndianCurrency(d.weighted)}</strong></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" name="Total Value" fill="#0B1F3B" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="weighted" name="Weighted Value" fill="#C9A227" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Pipeline Table */}
            <div className="bg-white border border-slate-200 p-6" data-testid="pipeline-table">
              <h3 className="font-semibold text-[#0B1F3B] mb-1 flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-[#C9A227]" />
                Pipeline Breakdown
              </h3>
              <p className="text-xs text-[#64748B] mb-4">Stage-by-stage pipeline analysis</p>
              
              {stage_pipeline.length === 0 ? (
                <EmptyState 
                  icon={IndianRupee}
                  title="No Pipeline Data"
                  description="No active deals to display."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 text-xs font-semibold text-[#64748B] uppercase">Stage</th>
                        <th className="text-center py-2 text-xs font-semibold text-[#64748B] uppercase">Leads</th>
                        <th className="text-right py-2 text-xs font-semibold text-[#64748B] uppercase">Total</th>
                        <th className="text-center py-2 text-xs font-semibold text-[#64748B] uppercase">Weight</th>
                        <th className="text-right py-2 text-xs font-semibold text-[#64748B] uppercase">Weighted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stage_pipeline.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50" data-testid={`pipeline-row-${idx}`}>
                          <td className="py-3 text-xs font-medium text-[#0B1F3B]">
                            {STAGE_LABELS[s.stage]}
                          </td>
                          <td className="py-3 text-center font-mono text-xs">
                            {s.lead_count}
                          </td>
                          <td className="py-3 text-right font-mono text-xs">
                            {formatIndianCurrency(s.total_value)}
                          </td>
                          <td className="py-3 text-center">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {s.weight_pct}%
                            </Badge>
                          </td>
                          <td className="py-3 text-right font-mono text-xs font-semibold text-[#C9A227]">
                            {formatIndianCurrency(s.weighted_value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50">
                        <td className="py-3 text-xs font-bold text-[#0B1F3B]">TOTAL</td>
                        <td className="py-3 text-center font-mono text-xs font-bold">
                          {forecast.pipeline_lead_count}
                        </td>
                        <td className="py-3 text-right font-mono text-xs font-bold">
                          {formatIndianCurrency(forecast.pipeline_value)}
                        </td>
                        <td className="py-3 text-center">--</td>
                        <td className="py-3 text-right font-mono text-xs font-bold text-[#C9A227]">
                          {formatIndianCurrency(forecast.weighted_projected_gmv)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ConversionIntelligencePage;
