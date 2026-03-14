import React, { useState, useMemo } from 'react';
import { Calculator, IndianRupee, Clock, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

const TENURE_OPTIONS = [3, 6, 12, 18, 24];
const DEFAULT_RATE = 12;

const formatCurrency = (val) => {
  if (!val || isNaN(val)) return '₹0';
  return '₹' + Math.round(val).toLocaleString('en-IN');
};

const EMICalculator = ({ venuePrice = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState(venuePrice || 500000);
  const [tenure, setTenure] = useState(12);
  const [rate, setRate] = useState(DEFAULT_RATE);

  const emi = useMemo(() => {
    const p = Number(amount);
    const r = Number(rate) / 12 / 100;
    const n = Number(tenure);
    if (!p || !r || !n) return { monthly: 0, total: 0, interest: 0 };
    const monthly = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total = monthly * n;
    return { monthly, total, interest: total - p };
  }, [amount, tenure, rate]);

  return (
    <div className="bg-[#111111] rounded-xl overflow-hidden" data-testid="emi-calculator">
      {/* Header — always visible, toggles expansion */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left"
        data-testid="emi-toggle-btn"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#D4B36A]/10 flex items-center justify-center">
            <Calculator className="w-4 h-4 text-[#D4B36A]" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white">EMI Calculator</p>
            <p className="text-[11px] text-white/40">Plan your event budget</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-white/30" />
          : <ChevronDown className="w-4 h-4 text-white/30" />
        }
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/[0.06] pt-4">
          {/* Amount */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-[0.1em] font-semibold block mb-1.5">
              Event Budget
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg pl-8 pr-3 py-2.5 text-[13px] text-white font-semibold focus:outline-none focus:border-[#D4B36A]/40 transition-colors"
                placeholder="500000"
                data-testid="emi-amount-input"
              />
            </div>
            <input
              type="range"
              min="100000"
              max="10000000"
              step="50000"
              value={amount || 500000}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full mt-2 accent-[#D4B36A] h-1"
              data-testid="emi-amount-slider"
            />
            <div className="flex justify-between text-[9px] text-white/20 mt-0.5">
              <span>₹1L</span><span>₹1Cr</span>
            </div>
          </div>

          {/* Tenure */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-[0.1em] font-semibold block mb-1.5">
              Tenure (months)
            </label>
            <div className="flex gap-1.5">
              {TENURE_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setTenure(m)}
                  className={`flex-1 py-2 text-[11px] font-semibold rounded-lg transition-all ${
                    tenure === m
                      ? 'bg-[#D4B36A] text-[#111111]'
                      : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.08]'
                  }`}
                  data-testid={`emi-tenure-${m}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Interest Rate */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] text-white/40 uppercase tracking-[0.1em] font-semibold">
                Interest Rate
              </label>
              <span className="text-[12px] text-[#D4B36A] font-bold" data-testid="emi-rate-display">{rate}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="24"
              step="0.5"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full accent-[#D4B36A] h-1"
              data-testid="emi-rate-slider"
            />
            <div className="flex justify-between text-[9px] text-white/20 mt-0.5">
              <span>5%</span><span>24%</span>
            </div>
          </div>

          {/* EMI Result */}
          <div className="bg-white/[0.04] rounded-xl p-4 space-y-3">
            <div className="text-center pb-3 border-b border-white/[0.06]">
              <p className="text-[10px] text-white/30 uppercase tracking-[0.1em] mb-1">Monthly EMI</p>
              <p className="text-2xl font-bold text-[#D4B36A]" data-testid="emi-monthly-result">
                {formatCurrency(emi.monthly)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <TrendingUp className="w-3 h-3 text-white/20" />
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">Total Interest</p>
                </div>
                <p className="text-[13px] font-semibold text-white/70" data-testid="emi-interest-result">
                  {formatCurrency(emi.interest)}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Clock className="w-3 h-3 text-white/20" />
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">Total Payable</p>
                </div>
                <p className="text-[13px] font-semibold text-white/70" data-testid="emi-total-result">
                  {formatCurrency(emi.total)}
                </p>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-white/15 text-center leading-relaxed">
            Indicative EMI. Actual rates depend on your lender and credit profile.
          </p>
        </div>
      )}
    </div>
  );
};

export default EMICalculator;
