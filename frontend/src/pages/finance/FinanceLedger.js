import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  Download, Search, ChevronLeft, ChevronRight,
  Filter, IndianRupee, FileText, CheckCircle,
  Clock, XCircle, ArrowUpDown,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const formatCurrency = (v) => {
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
};

const STATUS_CONFIG = {
  created: { label: 'Created', color: 'bg-slate-100 text-slate-600', icon: FileText },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  captured: { label: 'Captured', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  payment_released: { label: 'Released', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle },
  refunded: { label: 'Refunded', color: 'bg-purple-100 text-purple-700', icon: XCircle },
};

const FILTER_STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'captured', label: 'Captured' },
  { value: 'payment_released', label: 'Released' },
  { value: 'failed', label: 'Failed' },
];

const FinanceLedger = () => {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (status !== 'all') params.append('status', status);
      if (search) params.append('search', search);

      const res = await api.get(`/payments/ledger?${params}`);
      setPayments(res.data.payments || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch {
      toast.error('Failed to load payment ledger');
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.append('status', status);
      const res = await api.get(`/payments/ledger/export?${params}`);
      const data = res.data || [];

      if (data.length === 0) {
        toast.error('No data to export');
        return;
      }

      // Convert to CSV
      const headers = [
        'Payment ID', 'Date', 'Customer', 'Email', 'Phone',
        'Amount', 'Commission', 'Net to Vendor', 'Status',
        'Deal Value', 'Lead ID', 'Razorpay ID', 'Released At',
      ];
      const rows = data.map(p => [
        p.payment_id,
        p.created_at ? format(new Date(p.created_at), 'dd/MM/yyyy HH:mm') : '',
        p.customer_name || '',
        p.customer_email || '',
        p.customer_phone || '',
        p.amount || 0,
        p.commission_amount || 0,
        p.net_amount_to_vendor || 0,
        p.status || '',
        p.deal_value || 0,
        p.lead_id || '',
        p.razorpay_payment_id || '',
        p.released_at ? format(new Date(p.released_at), 'dd/MM/yyyy HH:mm') : '',
      ]);

      const csv = [headers, ...rows].map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `venuloq-payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${data.length} payments`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout
      title="Payment Ledger"
      breadcrumbs={[{ label: 'Finance', href: '/team/finance/dashboard' }, { label: 'Ledger' }]}
    >
      <div className="max-w-6xl mx-auto" data-testid="finance-ledger-page">
        {/* Header + Export */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div>
            <p className="text-sm text-[#64748B]">{total} total transactions</p>
          </div>
          <Button
            onClick={handleExport}
            disabled={exporting}
            variant="outline"
            size="sm"
            data-testid="export-csv-btn"
          >
            <Download className="w-4 h-4 mr-1.5" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {/* Status Filter */}
          <div className="flex gap-1.5 flex-wrap" data-testid="status-filters">
            {FILTER_STATUSES.map(f => (
              <button
                key={f.value}
                onClick={() => { setStatus(f.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  status === f.value
                    ? 'bg-[#111111] text-white border-[#111111]'
                    : 'bg-white text-[#64748B] border-slate-200 hover:border-slate-300'
                }`}
                data-testid={`filter-${f.value}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, email, or ID..."
                className="w-full h-9 pl-9 pr-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#D4B36A]/50"
                data-testid="ledger-search-input"
              />
            </div>
            <Button type="submit" size="sm" variant="outline" data-testid="ledger-search-btn">
              <Search className="w-4 h-4" />
            </Button>
          </form>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-5" data-testid="ledger-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Customer</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Amount</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider hidden md:table-cell">Commission</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider hidden md:table-cell">Net Vendor</th>
                  <th className="text-center px-4 py-3 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider hidden lg:table-cell">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-[#64748B]">
                      <IndianRupee className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p>No payments found</p>
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.created;
                    return (
                      <tr key={p.payment_id} className="hover:bg-slate-50/50 transition-colors" data-testid={`payment-row-${p.payment_id}`}>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-[#111111]">
                            {p.created_at ? format(new Date(p.created_at), 'dd MMM yyyy') : '—'}
                          </p>
                          <p className="text-[10px] text-[#94A3B8]">
                            {p.created_at ? format(new Date(p.created_at), 'HH:mm') : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-[#111111] truncate max-w-[200px]">{p.customer_name || '—'}</p>
                          <p className="text-[10px] text-[#94A3B8] truncate max-w-[200px]">{p.customer_email || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-bold text-[#111111]">{formatCurrency(p.amount)}</p>
                        </td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">
                          <p className="text-xs text-[#64748B]">{formatCurrency(p.commission_amount)}</p>
                          <p className="text-[10px] text-[#94A3B8]">{p.commission_rate || 0}%</p>
                        </td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">
                          <p className="text-xs text-emerald-600 font-medium">{formatCurrency(p.net_amount_to_vendor)}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.color}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <p className="text-[10px] text-[#94A3B8] font-mono truncate max-w-[160px]">{p.payment_id}</p>
                          {p.razorpay_payment_id && (
                            <p className="text-[10px] text-[#94A3B8] font-mono truncate max-w-[160px]">{p.razorpay_payment_id}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between" data-testid="ledger-pagination">
            <p className="text-xs text-[#64748B]">
              Page {page} of {pages} &middot; {total} records
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                data-testid="pagination-prev"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage(p => p + 1)}
                data-testid="pagination-next"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FinanceLedger;
