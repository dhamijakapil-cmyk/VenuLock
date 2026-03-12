import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatIndianCurrency } from '@/lib/utils';
import {
  MapPin,
  Users,
  Star,
  Check,
  Building2,
  Download,
  Loader2,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ComparisonSheetPublic = () => {
  const { sheetId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    fetchSheet();
  }, [sheetId]);

  const fetchSheet = async () => {
    try {
      const response = await fetch(`${API_URL}/api/comparison-sheets/${sheetId}`);
      if (!response.ok) throw new Error('Sheet not found');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!printRef.current) return;
    
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`VenuLoQ_Comparison_${sheetId}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
    }
  };

  const getAvailabilityColor = (status) => {
    switch (status) {
      case 'high': return 'bg-emerald-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4B36A] mx-auto" />
          <p className="mt-2 text-[#64748B]">Loading comparison sheet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-red-600 font-medium">Comparison sheet not found</p>
          <p className="text-sm text-[#64748B] mt-1">This link may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Download Button */}
        <div className="flex justify-end mb-4">
          <Button onClick={downloadPDF} className="bg-[#111111] hover:bg-[#153055]">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {/* Comparison Sheet */}
        <div ref={printRef} className="bg-white shadow-lg rounded-lg p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-[#D4B36A]">
            <div>
              <h1 className="text-3xl font-serif font-bold text-[#111111]">VenuLoQ</h1>
              <p className="text-sm text-[#64748B] mt-1">Your Perfect Venue, Our Promise</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-[#111111]">Curated Selection For</p>
              <p className="text-lg font-serif font-semibold text-[#D4B36A]">{data.customer_name}</p>
              <p className="text-xs text-[#64748B] mt-1">
                {data.event_type} • {data.event_date} • {data.guest_count} guests
              </p>
            </div>
          </div>

          {/* Venue Cards */}
          <div className="space-y-6 mb-8">
            {data.venues.map((venue, idx) => (
              <div key={venue.venue_id} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-[#111111] to-[#153055] px-4 py-2 flex items-center justify-between">
                  <span className="text-white font-serif font-semibold">
                    Option {idx + 1}: {venue.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getAvailabilityColor(venue.availability.status)}`} />
                    <span className="text-xs text-white/80">{venue.availability.text}</span>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-3">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1.5 text-[#64748B]">
                          <Building2 className="w-4 h-4" />
                          {venue.venue_type}
                        </span>
                        <span className="flex items-center gap-1.5 text-[#64748B]">
                          <MapPin className="w-4 h-4" />
                          {venue.location.area}, {venue.location.city}
                        </span>
                        <span className="flex items-center gap-1.5 text-[#64748B]">
                          <Users className="w-4 h-4" />
                          {venue.capacity.min}-{venue.capacity.max} guests
                        </span>
                      </div>
                      
                      <p className="text-sm text-[#64748B]">{venue.description}</p>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {venue.amenities.map((amenity, i) => (
                          <Badge key={i} variant="outline" className="text-xs px-2 py-0.5">
                            <Check className="w-3 h-3 mr-1 text-emerald-500" />
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-right space-y-2">
                      <div>
                        <p className="text-xs text-[#64748B]">Starting from</p>
                        <p className="text-xl font-bold text-[#D4B36A]">
                          {formatIndianCurrency(venue.pricing.starting_price)}
                        </p>
                        <p className="text-xs text-[#64748B]">{venue.pricing.price_type}</p>
                      </div>
                      {venue.pricing.proposed_price && (
                        <div className="bg-emerald-50 rounded px-2 py-1 inline-block">
                          <p className="text-xs text-emerald-700">Negotiated</p>
                          <p className="text-sm font-semibold text-emerald-700">
                            {formatIndianCurrency(venue.pricing.proposed_price)}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-end gap-1">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="font-semibold">{venue.rating.score}</span>
                        <span className="text-xs text-[#64748B]">({venue.rating.review_count})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          <div className="mb-8">
            <h3 className="font-serif font-semibold text-[#111111] mb-3">Quick Comparison</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border px-3 py-2 text-left font-medium text-[#64748B]">Feature</th>
                  {data.venues.map((v, i) => (
                    <th key={i} className="border px-3 py-2 text-center font-medium text-[#111111]">
                      {v.name.length > 15 ? v.name.substring(0, 15) + '...' : v.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-3 py-2 text-[#64748B]">Venue Type</td>
                  {data.venues.map((v, i) => (
                    <td key={i} className="border px-3 py-2 text-center">{v.venue_type}</td>
                  ))}
                </tr>
                <tr>
                  <td className="border px-3 py-2 text-[#64748B]">Capacity</td>
                  {data.venues.map((v, i) => (
                    <td key={i} className="border px-3 py-2 text-center">{v.capacity.min}-{v.capacity.max}</td>
                  ))}
                </tr>
                <tr>
                  <td className="border px-3 py-2 text-[#64748B]">Starting Price</td>
                  {data.venues.map((v, i) => (
                    <td key={i} className="border px-3 py-2 text-center font-medium text-[#D4B36A]">
                      {formatIndianCurrency(v.pricing.starting_price)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border px-3 py-2 text-[#64748B]">Rating</td>
                  {data.venues.map((v, i) => (
                    <td key={i} className="border px-3 py-2 text-center">
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {v.rating.score}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-[#64748B]">
            <div>
              <p>Generated on {new Date(data.generated_at).toLocaleDateString('en-IN', { 
                day: 'numeric', month: 'long', year: 'numeric' 
              })}</p>
              <p>By {data.generated_by.name} | VenuLoQ</p>
            </div>
            <div className="text-right">
              <p className="font-medium text-[#111111]">Questions?</p>
              <p>{data.branding.contact}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonSheetPublic;
