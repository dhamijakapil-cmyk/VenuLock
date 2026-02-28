import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { api } from '@/context/AuthContext';
import { formatIndianCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  Share2,
  MapPin,
  Users,
  IndianRupee,
  Star,
  Check,
  Loader2,
  Building2,
  Calendar,
  Sparkles,
  ExternalLink,
  Copy,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const VenueComparisonSheet = ({ leadId, shortlist, customerName, eventType, eventDate, guestCount }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVenues, setSelectedVenues] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [shareUrl, setShareUrl] = useState(null);
  const printRef = useRef(null);

  const handleVenueToggle = (venueId) => {
    setSelectedVenues(prev => {
      if (prev.includes(venueId)) {
        return prev.filter(id => id !== venueId);
      }
      if (prev.length >= 5) {
        toast.error('Maximum 5 venues allowed');
        return prev;
      }
      return [...prev, venueId];
    });
  };

  const generateComparison = async () => {
    if (selectedVenues.length < 3) {
      toast.error('Please select at least 3 venues');
      return;
    }

    setGenerating(true);
    try {
      const response = await api.post(`/leads/${leadId}/comparison-sheet`, selectedVenues);
      setComparisonData(response.data);
      setShareUrl(`${window.location.origin}/comparison/${response.data.sheet_id}`);
      toast.success('Comparison sheet generated!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate comparison');
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!printRef.current) return;
    
    toast.info('Generating PDF...');
    
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
      pdf.save(`BookMyVenue_Comparison_${comparisonData.sheet_id}.pdf`);
      
      toast.success('PDF downloaded!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  const getAvailabilityColor = (status) => {
    switch (status) {
      case 'high': return 'bg-emerald-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2"
          disabled={!shortlist || shortlist.length < 3}
          data-testid="comparison-sheet-btn"
        >
          <FileText className="w-4 h-4" />
          Generate Comparison Sheet
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C9A227]" />
            Venue Comparison Sheet
          </DialogTitle>
        </DialogHeader>

        {!comparisonData ? (
          /* Venue Selection Step */
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-[#64748B]">
                Select <strong>3-5 venues</strong> from the shortlist to generate a premium comparison sheet for your client.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {shortlist?.map(item => (
                <div 
                  key={item.venue_id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedVenues.includes(item.venue_id) 
                      ? 'border-[#C9A227] bg-amber-50 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => handleVenueToggle(item.venue_id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={selectedVenues.includes(item.venue_id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-[#0B1F3B]">{item.venue?.name || item.venue_name}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {item.venue?.area}, {item.venue?.city}
                      </p>
                      {item.proposed_price && (
                        <p className="text-xs text-[#C9A227] mt-1 font-medium">
                          Proposed: {formatIndianCurrency(item.proposed_price)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-[#64748B]">
                {selectedVenues.length} of 3-5 venues selected
              </p>
              <Button
                onClick={generateComparison}
                disabled={selectedVenues.length < 3 || generating}
                className="bg-[#C9A227] hover:bg-[#B8922A] text-[#0B1F3B]"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Generate Sheet
              </Button>
            </div>
          </div>
        ) : (
          /* Comparison Sheet Preview */
          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pb-4 border-b">
              <Button variant="outline" size="sm" onClick={copyShareLink}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button variant="outline" size="sm" onClick={downloadPDF}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>

            {/* Printable Comparison Sheet */}
            <div ref={printRef} className="bg-white p-8" style={{ minWidth: '800px' }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-[#C9A227]">
                <div>
                  <h1 className="text-3xl font-serif font-bold text-[#0B1F3B]">BookMyVenue</h1>
                  <p className="text-sm text-[#64748B] mt-1">Your Perfect Venue, Our Promise</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[#0B1F3B]">Curated Selection For</p>
                  <p className="text-lg font-serif font-semibold text-[#C9A227]">{comparisonData.customer_name}</p>
                  <p className="text-xs text-[#64748B] mt-1">
                    {comparisonData.event_type} • {comparisonData.event_date} • {comparisonData.guest_count} guests
                  </p>
                </div>
              </div>

              {/* Venue Cards */}
              <div className="grid grid-cols-1 gap-6 mb-8">
                {comparisonData.venues.map((venue, idx) => (
                  <div key={venue.venue_id} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-[#0B1F3B] to-[#153055] px-4 py-2 flex items-center justify-between">
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
                        {/* Left: Info */}
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
                          
                          <p className="text-sm text-[#64748B] line-clamp-2">{venue.description}</p>
                          
                          <div className="flex flex-wrap gap-1.5">
                            {venue.amenities.map((amenity, i) => (
                              <Badge key={i} variant="outline" className="text-xs px-2 py-0.5">
                                <Check className="w-3 h-3 mr-1 text-emerald-500" />
                                {amenity}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        {/* Right: Price & Rating */}
                        <div className="text-right space-y-2">
                          <div>
                            <p className="text-xs text-[#64748B]">Starting from</p>
                            <p className="text-xl font-bold text-[#C9A227]">
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
                            <span className="text-xs text-[#64748B]">({venue.rating.review_count} reviews)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comparison Table */}
              <div className="mb-8">
                <h3 className="font-serif font-semibold text-[#0B1F3B] mb-3">Quick Comparison</h3>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border px-3 py-2 text-left font-medium text-[#64748B]">Feature</th>
                      {comparisonData.venues.map((v, i) => (
                        <th key={i} className="border px-3 py-2 text-center font-medium text-[#0B1F3B]">
                          {v.name.length > 15 ? v.name.substring(0, 15) + '...' : v.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border px-3 py-2 text-[#64748B]">Venue Type</td>
                      {comparisonData.venues.map((v, i) => (
                        <td key={i} className="border px-3 py-2 text-center">{v.venue_type}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border px-3 py-2 text-[#64748B]">Capacity</td>
                      {comparisonData.venues.map((v, i) => (
                        <td key={i} className="border px-3 py-2 text-center">{v.capacity.min}-{v.capacity.max}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border px-3 py-2 text-[#64748B]">Starting Price</td>
                      {comparisonData.venues.map((v, i) => (
                        <td key={i} className="border px-3 py-2 text-center font-medium text-[#C9A227]">
                          {formatIndianCurrency(v.pricing.starting_price)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border px-3 py-2 text-[#64748B]">Setting</td>
                      {comparisonData.venues.map((v, i) => (
                        <td key={i} className="border px-3 py-2 text-center">{v.indoor_outdoor}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border px-3 py-2 text-[#64748B]">Rating</td>
                      {comparisonData.venues.map((v, i) => (
                        <td key={i} className="border px-3 py-2 text-center">
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            {v.rating.score}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border px-3 py-2 text-[#64748B]">Availability</td>
                      {comparisonData.venues.map((v, i) => (
                        <td key={i} className="border px-3 py-2 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${
                            v.availability.status === 'high' ? 'bg-emerald-100 text-emerald-700' :
                            v.availability.status === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${getAvailabilityColor(v.availability.status)}`} />
                            {v.availability.status.charAt(0).toUpperCase() + v.availability.status.slice(1)}
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
                  <p>Generated on {new Date(comparisonData.generated_at).toLocaleDateString('en-IN', { 
                    day: 'numeric', month: 'long', year: 'numeric' 
                  })}</p>
                  <p>By {comparisonData.generated_by.name} | BookMyVenue</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-[#0B1F3B]">Questions?</p>
                  <p>{comparisonData.branding.contact}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VenueComparisonSheet;
