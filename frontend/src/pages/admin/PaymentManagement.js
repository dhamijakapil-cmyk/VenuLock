import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/context/AuthContext';
import { formatDate, formatIndianCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
  IndianRupee,
  CreditCard,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
  TrendingUp,
  Banknote,
  FileText,
  Send,
} from 'lucide-react';

const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'Pending', className: 'bg-slate-400', icon: Clock },
  awaiting_advance: { label: 'Awaiting Payment', className: 'bg-amber-500', icon: Clock },
  advance_paid: { label: 'Advance Paid', className: 'bg-emerald-600', icon: CheckCircle },
  payment_released: { label: 'Released', className: 'bg-blue-600', icon: Send },
  payment_failed: { label: 'Failed', className: 'bg-red-500', icon: AlertCircle },
  refunded: { label: 'Refunded', className: 'bg-purple-500', icon: ArrowRight },
};

const PaymentManagement = () => {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [releasing, setReleasing] = useState(false);
  const [simulating, setSimulating] = useState(null);
  const [demoMode, setDemoMode] = useState(false); // Hidden demo mode for testing

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [statusFilter]);

  const fetchPayments = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');
      
      const response = await api.get(`/payments?${params.toString()}`);
      setPayments(response.data.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/payments/stats/summary');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching payment stats:', error);
    }
  };

  const handleSimulatePayment = async (paymentId) => {
    setSimulating(paymentId);
    try {
      await api.post(`/payments/${paymentId}/simulate-payment`);
      toast.success('Payment simulated successfully');
      fetchPayments();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to simulate payment');
    } finally {
      setSimulating(null);
    }
  };

  const handleReleasePayment = async () => {
    if (!selectedPayment) return;
    
    setReleasing(true);
    try {
      await api.post(`/payments/${selectedPayment.payment_id}/release`, {
        payment_id: selectedPayment.payment_id,
        notes: releaseNotes
      });
      toast.success('Payment released to venue');
      setReleaseDialogOpen(false);
      setSelectedPayment(null);
      setReleaseNotes('');
      fetchPayments();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to release payment');
    } finally {
      setReleasing(false);
    }
  };

  const openReleaseDialog = (payment) => {
    setSelectedPayment(payment);
    setReleaseDialogOpen(true);
  };

  return (
    <DashboardLayout 
      title="Payment Mediation" 
      breadcrumbs={[{ label: 'Admin' }, { label: 'Payments' }]}
    >
      {/* Payment Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Total Collected</p>
              <p className="text-2xl font-bold text-[#0B1F3B] mt-1">
                {formatIndianCurrency(stats?.summary?.total_collected || 0)}
              </p>
              <p className="text-xs text-[#64748B] mt-1">Advance payments received</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">BMV Commission</p>
              <p className="text-2xl font-bold text-[#C9A227] mt-1">
                {formatIndianCurrency(stats?.summary?.total_commission_earned || 0)}
              </p>
              <p className="text-xs text-[#64748B] mt-1">Platform earnings (10%)</p>
            </div>
            <div className="w-12 h-12 bg-[#F0E6D2] flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[#C9A227]" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Pending Release</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {formatIndianCurrency(stats?.summary?.pending_release || 0)}
              </p>
              <p className="text-xs text-[#64748B] mt-1">Ready for venue payout</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Released to Venues</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {formatIndianCurrency(stats?.summary?.total_released_to_venues || 0)}
              </p>
              <p className="text-xs text-[#64748B] mt-1">Total payouts completed</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 flex items-center justify-center">
              <Banknote className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
            <SelectTrigger className="w-48" data-testid="payment-status-filter">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="awaiting_advance">Awaiting Payment</SelectItem>
              <SelectItem value="advance_paid">Advance Paid</SelectItem>
              <SelectItem value="payment_released">Released</SelectItem>
              <SelectItem value="payment_failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <Shield className="w-4 h-4 text-[#C9A227]" />
            <span>Protected Payment via BookMyVenue</span>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-[#0B1F3B]">Payment Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Customer</th>
                <th>Advance Amount</th>
                <th>BMV Commission</th>
                <th>Net to Venue</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-[#0B1F3B] border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-[#64748B]">
                    No payments found
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const statusConfig = PAYMENT_STATUS_CONFIG[payment.status] || PAYMENT_STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <tr key={payment.payment_id} data-testid={`payment-row-${payment.payment_id}`}>
                      <td>
                        <div>
                          <p className="font-mono text-sm text-[#0B1F3B]">{payment.payment_id}</p>
                          <p className="text-xs text-[#64748B]">Lead: {payment.lead_id?.slice(0, 12)}...</p>
                        </div>
                      </td>
                      <td>
                        <div>
                          <p className="font-medium text-[#0B1F3B]">{payment.customer_name}</p>
                          <p className="text-xs text-[#64748B]">{payment.customer_email}</p>
                        </div>
                      </td>
                      <td className="font-mono font-semibold text-[#0B1F3B]">
                        {formatIndianCurrency(payment.amount)}
                      </td>
                      <td className="font-mono text-[#C9A227]">
                        {formatIndianCurrency(payment.commission_amount)}
                        <span className="text-xs text-[#64748B] ml-1">({payment.commission_rate}%)</span>
                      </td>
                      <td className="font-mono text-emerald-600">
                        {formatIndianCurrency(payment.net_amount_to_vendor)}
                      </td>
                      <td>
                        <Badge className={`${statusConfig.className} text-white flex items-center gap-1 w-fit`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="text-[#64748B] text-sm">
                        <div>
                          <p>{formatDate(payment.created_at)}</p>
                          {payment.paid_at && (
                            <p className="text-xs text-emerald-600">Paid: {formatDate(payment.paid_at)}</p>
                          )}
                          {payment.released_at && (
                            <p className="text-xs text-blue-600">Released: {formatDate(payment.released_at)}</p>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {/* Simulate Payment button (demo mode only - hidden in production) */}
                          {demoMode && payment.status === 'awaiting_advance' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSimulatePayment(payment.payment_id)}
                              disabled={simulating === payment.payment_id}
                              className="text-xs border-dashed"
                              data-testid={`simulate-payment-${payment.payment_id}`}
                            >
                              {simulating === payment.payment_id ? (
                                <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                'Simulate Pay'
                              )}
                            </Button>
                          )}
                          
                          {/* Release Payment button */}
                          {payment.status === 'advance_paid' && (
                            <Button
                              size="sm"
                              onClick={() => openReleaseDialog(payment)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                              data-testid={`release-payment-${payment.payment_id}`}
                            >
                              <Send className="w-3 h-3 mr-1" />
                              Release
                            </Button>
                          )}
                          
                          {/* View details */}
                          {payment.status === 'payment_released' && (
                            <span className="text-xs text-blue-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Completed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Release Payment Dialog */}
      <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Release Payment to Venue</DialogTitle>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4 py-4">
              {/* Payment Summary */}
              <div className="bg-slate-50 p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Customer</span>
                  <span className="font-medium text-[#0B1F3B]">{selectedPayment.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Advance Received</span>
                  <span className="font-mono font-semibold text-[#0B1F3B]">
                    {formatIndianCurrency(selectedPayment.amount)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-[#64748B]">BMV Commission ({selectedPayment.commission_rate}%)</span>
                  <span className="font-mono text-[#C9A227]">
                    - {formatIndianCurrency(selectedPayment.commission_amount)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-[#0B1F3B]">Net to Venue</span>
                  <span className="font-mono text-emerald-600 text-lg">
                    {formatIndianCurrency(selectedPayment.net_amount_to_vendor)}
                  </span>
                </div>
              </div>
              
              {/* Release Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#0B1F3B]">Release Notes (Optional)</label>
                <Textarea
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  placeholder="Add any notes about this payout..."
                  rows={3}
                />
              </div>
              
              {/* Warning */}
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  For MVP, this simulates payout status change. Actual bank transfer is handled offline.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReleasePayment} 
              disabled={releasing}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="confirm-release-btn"
            >
              {releasing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Release Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default PaymentManagement;
