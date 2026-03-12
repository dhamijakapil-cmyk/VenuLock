import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Calculator,
  CreditCard,
  ChevronDown,
  BadgeCheck,
} from 'lucide-react';

const EMICalculatorSection = ({ venue, onEnquire }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loanAmount, setLoanAmount] = useState(500000);
  const [tenure, setTenure] = useState(12);
  const [showDetails, setShowDetails] = useState(false);
  
  const interestRate = 12;
  const monthlyRate = interestRate / 12 / 100;
  
  const calculateEMI = (principal, months) => {
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
    return Math.round(emi);
  };
  
  const emi = calculateEMI(loanAmount, tenure);
  const totalAmount = emi * tenure;
  const totalInterest = totalAmount - loanAmount;
  const tenureOptions = [6, 12, 18, 24, 36];
  
  const previewAmount = venue?.pricing?.min_spend || 500000;
  const previewEMI = calculateEMI(previewAmount, 12);
  
  return (
    <>
      {/* Teaser Card */}
      <div className="bg-gradient-to-br from-[#111111] to-[#153055] rounded-xl p-5 text-white overflow-hidden relative">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#D4B36A]/10 rounded-full" />
        <div className="absolute -right-2 -bottom-8 w-32 h-32 bg-[#D4B36A]/5 rounded-full" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#D4B36A]/20 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-[#D4B36A]" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Easy Finance Options</h3>
              <p className="text-white/60 text-xs">Pay in easy monthly EMIs</p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
            <p className="text-white/70 text-xs mb-1">Starting from just</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#D4B36A]">{previewEMI.toLocaleString('en-IN')}</span>
              <span className="text-white/60 text-sm">/month</span>
            </div>
            <p className="text-white/50 text-xs mt-1">for {(previewAmount/100000).toFixed(0)}L over 12 months</p>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/80">0% Processing Fee</span>
            <span className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/80">Quick Approval</span>
          </div>
          
          <Button
            onClick={() => setIsOpen(true)}
            className="w-full h-11 bg-[#D4B36A] hover:bg-[#D4B040] text-[#111111] font-semibold"
            data-testid="open-emi-calculator"
          >
            <Calculator className="w-4 h-4 mr-2" />
            Calculate Your EMI
          </Button>
        </div>
      </div>
      
      {/* EMI Calculator Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto p-0" aria-describedby={undefined}>
          <DialogHeader className="bg-gradient-to-r from-[#111111] to-[#1a3a5c] px-6 py-5 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#D4B36A]/20 flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-[#D4B36A]" />
                </div>
                <div>
                  <DialogTitle className="font-serif text-xl font-semibold text-white">EMI Calculator</DialogTitle>
                  <p className="text-white/70 text-sm">Plan your dream celebration</p>
                </div>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-[#111111]">Loan Amount</label>
                <span className="text-lg font-bold text-[#D4B36A]">{loanAmount.toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min="100000"
                max="5000000"
                step="50000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#D4B36A]"
                data-testid="emi-loan-amount"
              />
              <div className="flex justify-between text-xs text-[#64748B] mt-1">
                <span>1 Lakh</span>
                <span>50 Lakh</span>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="text-sm font-medium text-[#111111] block mb-3">Select Tenure</label>
              <div className="flex flex-wrap gap-2">
                {tenureOptions.map((months) => (
                  <button
                    key={months}
                    onClick={() => setTenure(months)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      tenure === months
                        ? 'bg-[#111111] text-white'
                        : 'bg-slate-100 text-[#64748B] hover:bg-slate-200'
                    }`}
                    data-testid={`emi-tenure-${months}`}
                  >
                    {months} months
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-[#F9F9F7] to-[#F5F0E6] rounded-xl p-5 mb-6">
              <div className="text-center">
                <p className="text-sm text-[#64748B] mb-1">Your Monthly EMI</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl font-bold text-[#111111]">{emi.toLocaleString('en-IN')}</span>
                  <span className="text-[#64748B]">/month</span>
                </div>
                <p className="text-xs text-[#64748B] mt-2">@ {interestRate}% p.a.</p>
              </div>
              
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full mt-4 text-sm text-[#D4B36A] hover:text-[#111111] flex items-center justify-center gap-1"
              >
                {showDetails ? 'Hide' : 'View'} Details
                <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
              </button>
              
              {showDetails && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748B]">Principal Amount</span>
                    <span className="text-[#111111] font-medium">{loanAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748B]">Total Interest</span>
                    <span className="text-[#111111] font-medium">{totalInterest.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium pt-2 border-t border-slate-200">
                    <span className="text-[#111111]">Total Amount</span>
                    <span className="text-[#D4B36A]">{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <BadgeCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>No Processing Fee</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <BadgeCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Quick Approval</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <BadgeCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Flexible Tenure</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <BadgeCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Minimal Documents</span>
              </div>
            </div>
            
            <div className="text-center mb-6">
              <p className="text-xs text-[#64748B] mb-2">Powered by leading partners</p>
              <div className="flex items-center justify-center gap-4 text-xs text-[#64748B]">
                <span>Bajaj Finserv</span>
                <span>•</span>
                <span>HDFC Bank</span>
                <span>•</span>
                <span>ICICI Bank</span>
              </div>
            </div>
            
            <Button
              onClick={() => { setIsOpen(false); onEnquire(); }}
              className="w-full h-12 bg-[#D4B36A] hover:bg-[#D4B040] text-[#111111] font-semibold text-base"
              data-testid="check-emi-eligibility"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Check EMI Eligibility
            </Button>
            
            <button
              onClick={() => setIsOpen(false)}
              className="w-full h-10 mt-2 text-sm text-[#64748B] hover:text-[#111111] font-medium transition-colors"
              data-testid="emi-close-btn"
            >
              Close Calculator
            </button>
            
            <p className="text-xs text-center text-[#64748B] mt-2">
              *EMI at indicative rates. Actual rates may vary.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EMICalculatorSection;
