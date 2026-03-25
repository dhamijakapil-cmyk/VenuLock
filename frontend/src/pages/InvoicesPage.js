import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth, api } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  ChevronLeft, FileText, Download, MapPin, Calendar, CheckCircle2,
  IndianRupee, Eye, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate, formatIndianCurrency } from '@/lib/utils';

const InvoicePreview = ({ invoice, onClose }) => {
  const printRef = useRef();

  const handleDownload = () => {
    const el = printRef.current;
    if (!el) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>Invoice ${invoice.invoice_id}</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; color: #333; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #D4B36A; padding-bottom: 20px; }
        .brand { font-size: 24px; font-weight: 700; color: #0B0B0D; letter-spacing: -0.5px; }
        .brand-sub { font-size: 11px; color: #9CA3AF; margin-top: 4px; }
        .invoice-id { font-size: 13px; color: #64748B; text-align: right; }
        .invoice-id strong { color: #0B0B0D; font-size: 14px; display: block; margin-bottom: 2px; }
        .section { margin: 24px 0; }
        .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #9CA3AF; margin-bottom: 8px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0ede8; font-size: 14px; }
        .row .label { color: #64748B; }
        .row .value { font-weight: 600; color: #0B0B0D; }
        .total-row { display: flex; justify-content: space-between; padding: 16px 0; margin-top: 8px; border-top: 2px solid #0B0B0D; font-size: 18px; font-weight: 700; }
        .footer { margin-top: 48px; text-align: center; font-size: 11px; color: #9CA3AF; border-top: 1px solid #E5E0D8; padding-top: 16px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
        <div class="header">
          <div><div class="brand">VenuLoQ</div><div class="brand-sub">Find. Compare. Lock.</div></div>
          <div class="invoice-id"><strong>${invoice.invoice_id}</strong>${invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</div>
        </div>
        <div class="section">
          <div class="section-title">Billed To</div>
          <div style="font-size:14px;font-weight:600;color:#0B0B0D;">${invoice.customer_name}</div>
          <div style="font-size:13px;color:#64748B;margin-top:2px;">${invoice.customer_email}</div>
        </div>
        <div class="section">
          <div class="section-title">Details</div>
          <div class="row"><span class="label">Venue</span><span class="value">${invoice.venue_name}</span></div>
          ${invoice.event_type ? `<div class="row"><span class="label">Event Type</span><span class="value" style="text-transform:capitalize">${invoice.event_type.replace(/_/g, ' ')}</span></div>` : ''}
          ${invoice.event_date ? `<div class="row"><span class="label">Event Date</span><span class="value">${new Date(invoice.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>` : ''}
          ${invoice.city ? `<div class="row"><span class="label">City</span><span class="value">${invoice.city}</span></div>` : ''}
          <div class="row"><span class="label">Status</span><span class="value" style="color:#10B981">Paid</span></div>
        </div>
        <div class="total-row"><span>Total Amount</span><span>₹${(invoice.amount || 0).toLocaleString('en-IN')}</span></div>
        <div class="footer">This is a computer-generated invoice. No signature required.<br/>VenuLoQ &copy; ${new Date().getFullYear()}</div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        data-testid="invoice-preview-modal"
      >
        <div className="sticky top-0 bg-white border-b border-[#E5E0D8]/40 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-[16px] font-bold text-[#0B0B0D]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>Invoice</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleDownload} className="w-9 h-9 rounded-full bg-[#0B0B0D] flex items-center justify-center" data-testid="invoice-download-btn">
              <Download className="w-4 h-4 text-[#D4B36A]" />
            </button>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-[#F4F1EC] flex items-center justify-center" data-testid="invoice-close-btn">
              <X className="w-4 h-4 text-[#64748B]" />
            </button>
          </div>
        </div>

        <div ref={printRef} className="p-5 space-y-5">
          {/* Brand */}
          <div className="flex items-start justify-between pb-4 border-b-2 border-[#D4B36A]">
            <div>
              <h3 className="text-xl font-bold text-[#0B0B0D]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>VenuLoQ</h3>
              <p className="text-[10px] text-[#9CA3AF] tracking-wider" style={{ fontFamily: "'DM Sans', sans-serif" }}>Find. Compare. Lock.</p>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-bold text-[#0B0B0D]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{invoice.invoice_id}</p>
              <p className="text-[11px] text-[#9CA3AF]">{invoice.paid_at ? formatDate(invoice.paid_at) : ''}</p>
            </div>
          </div>

          {/* Billed To */}
          <div>
            <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em] mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>Billed To</p>
            <p className="text-[14px] font-semibold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{invoice.customer_name}</p>
            <p className="text-[12px] text-[#64748B]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{invoice.customer_email}</p>
          </div>

          {/* Details */}
          <div className="bg-[#F4F1EC] rounded-xl p-4 space-y-2.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-[#64748B]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Venue</span>
              <span className="font-semibold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{invoice.venue_name}</span>
            </div>
            {invoice.event_type && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[#64748B]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Event</span>
                <span className="font-semibold text-[#0B0B0D] capitalize" style={{ fontFamily: "'DM Sans', sans-serif" }}>{invoice.event_type.replace(/_/g, ' ')}</span>
              </div>
            )}
            {invoice.event_date && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[#64748B]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Date</span>
                <span className="font-semibold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{formatDate(invoice.event_date)}</span>
              </div>
            )}
            {invoice.city && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[#64748B]" style={{ fontFamily: "'DM Sans', sans-serif" }}>City</span>
                <span className="font-semibold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{invoice.city}</span>
              </div>
            )}
            <div className="flex justify-between text-[13px]">
              <span className="text-[#64748B]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Status</span>
              <span className="font-semibold text-emerald-600 flex items-center gap-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Paid
              </span>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-3 border-t-2 border-[#0B0B0D]">
            <span className="text-[14px] font-bold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Total Amount</span>
            <span className="text-2xl font-bold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {formatIndianCurrency ? formatIndianCurrency(invoice.amount) : `₹${(invoice.amount || 0).toLocaleString('en-IN')}`}
            </span>
          </div>

          <p className="text-[10px] text-[#B0B0B0] text-center pt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Computer-generated invoice. No signature required.
          </p>
        </div>
      </div>
    </div>
  );
};

const InvoiceRow = ({ invoice, onView }) => (
  <div
    className="bg-white rounded-2xl border border-[#E5E0D8]/60 shadow-sm p-4"
    data-testid={`invoice-${invoice.invoice_id}`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#F4F1EC] flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-[#D4B36A]" />
        </div>
        <div className="min-w-0">
          <h3 className="text-[13px] font-bold text-[#0B0B0D] truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {invoice.venue_name}
          </h3>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#9CA3AF]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{invoice.invoice_id}</span>
            <span>{invoice.paid_at ? formatDate(invoice.paid_at) : ''}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
        <p className="text-[15px] font-bold text-[#0B0B0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {formatIndianCurrency ? formatIndianCurrency(invoice.amount) : `₹${(invoice.amount || 0).toLocaleString('en-IN')}`}
        </p>
        <button
          onClick={() => onView(invoice)}
          className="w-9 h-9 rounded-full bg-[#F4F1EC] hover:bg-[#E5E0D8] flex items-center justify-center transition-colors"
          data-testid={`invoice-view-${invoice.invoice_id}`}
        >
          <Eye className="w-4 h-4 text-[#0B0B0D]" />
        </button>
      </div>
    </div>
  </div>
);

const InvoicesPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/auth/my-invoices');
        setInvoices(res.data.invoices || []);
      } catch (err) {
        console.error('Error fetching invoices:', err);
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated) fetch();
  }, [isAuthenticated]);

  if (!isAuthenticated) { navigate('/login'); return null; }

  return (
    <div className="min-h-screen bg-[#F4F1EC] flex flex-col">
      <div className="lg:hidden">
        <header className="sticky top-0 z-50 bg-[#0B0B0D]">
          <div className="flex items-center gap-3 px-4 py-4">
            <button onClick={() => navigate('/my-enquiries')} className="w-9 h-9 flex items-center justify-center text-[#F4F1EC]/60 hover:text-[#F4F1EC]" data-testid="invoices-back-btn">
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <h1 className="text-lg text-[#F4F1EC]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>Invoices</h1>
          </div>
        </header>
      </div>
      <div className="hidden lg:block"><Header /></div>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-10 lg:pt-8">
        <div className="hidden lg:flex items-center gap-2 mb-6">
          <button onClick={() => navigate('/my-enquiries')} className="text-sm text-[#64748B] hover:text-[#0B0B0D] flex items-center gap-1" data-testid="invoices-back-desktop">
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-[#E5E0D8]/40" />)}
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E0D8]/40" data-testid="invoices-empty">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F4F1EC] flex items-center justify-center">
              <FileText className="w-7 h-7 text-[#CBD5E1]" />
            </div>
            <h3 className="text-base font-semibold text-[#0B0B0D] mb-1.5" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>No invoices yet</h3>
            <p className="text-sm text-[#64748B] max-w-xs mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Invoices will be generated after you complete a payment
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="invoices-list">
            {invoices.map(inv => (
              <InvoiceRow key={inv.invoice_id} invoice={inv} onView={setSelectedInvoice} />
            ))}
          </div>
        )}
      </main>

      <div className="hidden lg:block"><Footer /></div>
      {selectedInvoice && <InvoicePreview invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}
    </div>
  );
};

export default InvoicesPage;
