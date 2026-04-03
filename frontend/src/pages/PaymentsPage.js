import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth, api } from '@/context/AuthContext';
import {
  ChevronLeft, CreditCard, MapPin, Calendar, CheckCircle2, Clock,
  AlertCircle, IndianRupee, ArrowUpRight
} from 'lucide-react';
import { formatDate, formatIndianCurrency } from '@/lib/utils';

const statusConfig = {
  paid: { label: 'Paid', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  captured: { label: 'Captured', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  released: { label: 'Released', icon: ArrowUpRight, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  pending: { label: 'Pending', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  awaiting_advance: { label: 'Awaiting', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  failed: { label: 'Failed', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  refunded: { label: 'Refunded', icon: IndianRupee, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
};

const PaymentCard = ({ payment }) => {
  const cfg = statusConfig[payment.status] || statusConfig.pending;
  const StatusIcon = cfg.icon;

  return (
    <div className="bg-white rounded-2xl border border-[#E5E0D8]/60 shadow-sm overflow-hidden" data-testid={`payment-${payment.payment_id}`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {payment.venue_image ? (
              <img src={payment.venue_image} alt="" className="w-12 h-12 rounded-xl object-cover" loading="lazy" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[#F4F1EC] flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-[#9CA3AF]" />
              </div>
            )}
            <div>
              <h3 className="text-[14px] font-bold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {payment.venue_name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#9CA3AF]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {payment.city && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{payment.city}</span>}
                {payment.event_type && <span className="capitalize">{payment.event_type.replace(/_/g, ' ')}</span>}
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
            <StatusIcon className="w-3 h-3" />
            {cfg.label}
          </div>
        </div>

        <div className="flex items-end justify-between pt-2 border-t border-[#E5E0D8]/40">
          <div>
            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider" style={{ fontFamily: "'DM Sans', sans-serif" }}>Amount</p>
            <p className="text-xl font-bold text-[#0B0B0D] mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {formatIndianCurrency ? formatIndianCurrency(payment.amount) : `₹${(payment.amount || 0).toLocaleString('en-IN')}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#9CA3AF]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {payment.paid_at ? formatDate(payment.paid_at) : formatDate(payment.created_at)}
            </p>
            <p className="text-[10px] text-[#B0B0B0] mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {payment.payment_id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/auth/my-payments');
        setPayments(res.data.payments || []);
      } catch (err) {
        console.error('Error fetching payments:', err);
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated) fetch();
  }, [isAuthenticated]);

  if (!isAuthenticated) { navigate('/login'); return null; }

  const totalPaid = payments
    .filter(p => ['paid', 'captured', 'released'].includes(p.status))
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#F4F1EC] flex flex-col app-main-content">
      <div className="lg:hidden">
        <header className="sticky top-0 z-50 bg-[#0B0B0D]">
          <div className="flex items-center gap-3 px-4 py-4">
            <button onClick={() => navigate('/home')} className="w-9 h-9 flex items-center justify-center text-[#F4F1EC]/60 hover:text-[#F4F1EC]" data-testid="payments-back-btn">
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <h1 className="text-lg text-[#F4F1EC]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>Payments</h1>
          </div>
        </header>
      </div>
      <div className="hidden lg:block"><Header /></div>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-10 lg:pt-8">
        <div className="hidden lg:flex items-center gap-2 mb-6">
          <button onClick={() => navigate('/home')} className="text-sm text-[#64748B] hover:text-[#0B0B0D] flex items-center gap-1" data-testid="payments-back-desktop">
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
        </div>

        {/* Summary card */}
        <div className="bg-gradient-to-br from-[#0B0B0D] to-[#1a1a2e] rounded-2xl p-5 mb-5 text-white" data-testid="payments-summary">
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.15em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Total Paid</p>
          <p className="text-3xl font-bold mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {formatIndianCurrency ? formatIndianCurrency(totalPaid) : `₹${totalPaid.toLocaleString('en-IN')}`}
          </p>
          <p className="text-[11px] text-white/40 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {payments.length} transaction{payments.length !== 1 ? 's' : ''}
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="bg-white rounded-2xl h-32 animate-pulse border border-[#E5E0D8]/40" />)}
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E0D8]/40" data-testid="payments-empty">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F4F1EC] flex items-center justify-center">
              <CreditCard className="w-7 h-7 text-[#CBD5E1]" />
            </div>
            <h3 className="text-base font-semibold text-[#0B0B0D] mb-1.5" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>No payments yet</h3>
            <p className="text-sm text-[#64748B] max-w-xs mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Your payment history will appear here once you make a booking
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="payments-list">
            {payments.map(p => <PaymentCard key={p.payment_id} payment={p} />)}
          </div>
        )}
      </main>

      <div className="hidden lg:block"><Footer /></div>
    </div>
  );
};

export default PaymentsPage;
