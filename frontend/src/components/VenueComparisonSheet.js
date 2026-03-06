import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { api } from '@/context/AuthContext';
import { formatIndianCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  MapPin,
  Users,
  Star,
  Check,
  Loader2,
  Building2,
  Sparkles,
  Copy,
  Calendar,
  Wifi,
  Car,
  UtensilsCrossed,
  Music,
  Lightbulb,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const VenueComparisonSheet = ({ leadId, shortlist, customerName, eventType, eventDate, guestCount }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVenues, setSelectedVenues] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [shareUrl, setShareUrl] = useState(null);
  const [expertNotes, setExpertNotes] = useState({});
  const page1Ref = useRef(null);
  const page2Ref = useRef(null);

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

  const handleExpertNoteChange = (venueId, note) => {
    setExpertNotes(prev => ({ ...prev, [venueId]: note }));
  };

  const generateComparison = async () => {
    if (selectedVenues.length < 3) {
      toast.error('Please select at least 3 venues');
      return;
    }

    setGenerating(true);
    try {
      const response = await api.post(`/leads/${leadId}/comparison-sheet`, selectedVenues);
      // Enrich data with expert notes
      const enrichedData = {
        ...response.data,
        venues: response.data.venues.map(v => ({
          ...v,
          expert_notes: expertNotes[v.venue_id] || ''
        }))
      };
      setComparisonData(enrichedData);
      setShareUrl(`${window.location.origin}/comparison/${response.data.sheet_id}`);
      toast.success('Comparison sheet generated!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate comparison');
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!page1Ref.current || !page2Ref.current) return;
    
    setDownloadingPDF(true);
    toast.info('Generating premium PDF...');
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Page 1: Venue Cards
      const canvas1 = await html2canvas(page1Ref.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
      });
      
      const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
      const imgHeight1 = (canvas1.height * pdfWidth) / canvas1.width;
      
      // Add first page - may need multiple pages if content is long
      let y = 0;
      while (y < imgHeight1) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData1, 'JPEG', 0, -y, pdfWidth, imgHeight1);
        y += pdfHeight;
      }
      
      // Page 2: Comparison Table
      pdf.addPage();
      const canvas2 = await html2canvas(page2Ref.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
      });
      
      const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);
      const imgHeight2 = (canvas2.height * pdfWidth) / canvas2.width;
      pdf.addImage(imgData2, 'JPEG', 0, 0, pdfWidth, Math.min(imgHeight2, pdfHeight));
      
      pdf.save(`VenuLock_Comparison_${comparisonData.sheet_id}.pdf`);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Shareable link copied!');
  };

  const getAvailabilityStyle = (status) => {
    switch (status) {
      case 'high': return { bg: 'bg-emerald-500', text: 'text-emerald-700', bgLight: 'bg-emerald-50' };
      case 'medium': return { bg: 'bg-amber-500', text: 'text-amber-700', bgLight: 'bg-amber-50' };
      case 'low': return { bg: 'bg-red-500', text: 'text-red-700', bgLight: 'bg-red-50' };
      default: return { bg: 'bg-slate-400', text: 'text-slate-700', bgLight: 'bg-slate-50' };
    }
  };

  const getAmenityIcon = (amenity) => {
    const lower = amenity.toLowerCase();
    if (lower.includes('wifi')) return <Wifi className="w-3 h-3" />;
    if (lower.includes('parking') || lower.includes('valet')) return <Car className="w-3 h-3" />;
    if (lower.includes('catering') || lower.includes('food')) return <UtensilsCrossed className="w-3 h-3" />;
    if (lower.includes('dj') || lower.includes('music') || lower.includes('sound')) return <Music className="w-3 h-3" />;
    if (lower.includes('ac') || lower.includes('generator') || lower.includes('power')) return <Lightbulb className="w-3 h-3" />;
    return <Check className="w-3 h-3" />;
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      setDialogOpen(open);
      if (!open) {
        setComparisonData(null);
        setSelectedVenues([]);
        setExpertNotes({});
      }
    }}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2 border-[#C8A960] text-[#C8A960] hover:bg-[#C8A960]/10"
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
            <Sparkles className="w-5 h-5 text-[#C8A960]" />
            Premium Venue Comparison Sheet
          </DialogTitle>
        </DialogHeader>

        {!comparisonData ? (
          /* Venue Selection Step */
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#111111] to-[#153055] p-4 rounded-lg text-white">
              <p className="text-sm">
                Select <strong className="text-[#C8A960]">3-5 venues</strong> to create a premium comparison brochure for your client.
                Add expert notes to personalize the recommendation.
              </p>
            </div>

            <div className="space-y-3">
              {shortlist?.map(item => (
                <div 
                  key={item.venue_id || item.shortlist_id}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    selectedVenues.includes(item.venue_id) 
                      ? 'border-[#C8A960] bg-amber-50/50 shadow-md' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox 
                      checked={selectedVenues.includes(item.venue_id)}
                      onCheckedChange={() => handleVenueToggle(item.venue_id)}
                      className="mt-1 data-[state=checked]:bg-[#C8A960] data-[state=checked]:border-[#C8A960]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-[#111111]">{item.venue?.name || item.venue_name}</p>
                          <p className="text-sm text-[#64748B] flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {item.venue?.area}, {item.venue?.city}
                          </p>
                        </div>
                        {item.proposed_price && (
                          <Badge className="bg-[#C8A960]/10 text-[#C8A960] border-[#C8A960]/30">
                            Proposed: {formatIndianCurrency(item.proposed_price)}
                          </Badge>
                        )}
                      </div>
                      
                      {selectedVenues.includes(item.venue_id) && (
                        <div className="mt-3">
                          <label className="text-xs font-medium text-[#64748B] mb-1 block">
                            VL Expert Notes (Optional)
                          </label>
                          <Textarea
                            placeholder="Add a personalized note for this venue..."
                            className="text-sm h-16 resize-none"
                            value={expertNotes[item.venue_id] || ''}
                            onChange={(e) => handleExpertNoteChange(item.venue_id, e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-[#64748B]">
                <span className="font-semibold text-[#111111]">{selectedVenues.length}</span> of 3-5 venues selected
              </p>
              <Button
                onClick={generateComparison}
                disabled={selectedVenues.length < 3 || generating}
                className="bg-[#111111] hover:bg-[#153055] text-white"
                data-testid="generate-sheet-btn"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Generate Premium Sheet
              </Button>
            </div>
          </div>
        ) : (
          /* Comparison Sheet Preview */
          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex items-center justify-between pb-4 border-b sticky top-0 bg-white z-10">
              <p className="text-sm text-[#64748B]">
                Preview your comparison sheet below
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyShareLink} data-testid="copy-link-btn">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                <Button 
                  size="sm" 
                  onClick={downloadPDF} 
                  disabled={downloadingPDF}
                  className="bg-[#111111] hover:bg-[#153055]"
                  data-testid="download-pdf-btn"
                >
                  {downloadingPDF ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download PDF
                </Button>
              </div>
            </div>

            {/* ==================== PAGE 1: VENUE CARDS ==================== */}
            <div ref={page1Ref} className="bg-white" style={{ width: '794px', padding: '40px' }}>
              {/* Header with Logo */}
              <div className="flex items-center justify-between mb-8 pb-6" style={{ borderBottom: '3px solid #C8A960' }}>
                <div>
                  <h1 style={{ fontSize: '32px', fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#111111', margin: 0 }}>
                    Book<span style={{ color: '#C8A960' }}>My</span>Venue
                  </h1>
                  <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Your Perfect Venue, Our Promise</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>Curated Selection For</p>
                  <p style={{ fontSize: '20px', fontFamily: 'Georgia, serif', fontWeight: '600', color: '#C8A960', margin: '2px 0' }}>
                    {comparisonData.customer_name}
                  </p>
                  <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <span>{comparisonData.event_type}</span>
                    <span>•</span>
                    <span>{comparisonData.event_date}</span>
                    <span>•</span>
                    <span>{comparisonData.guest_count} guests</span>
                  </div>
                </div>
              </div>

              {/* Venue Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {comparisonData.venues.map((venue, idx) => {
                  const availStyle = getAvailabilityStyle(venue.availability.status);
                  return (
                    <div key={venue.venue_id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                      {/* Card Header */}
                      <div style={{ 
                        background: 'linear-gradient(135deg, #111111 0%, #153055 100%)', 
                        padding: '12px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ color: 'white', fontFamily: 'Georgia, serif', fontWeight: '600', fontSize: '16px' }}>
                          Option {idx + 1}: {venue.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            width: '10px', 
                            height: '10px', 
                            borderRadius: '50%',
                            backgroundColor: venue.availability.status === 'high' ? '#10b981' : venue.availability.status === 'medium' ? '#f59e0b' : '#ef4444'
                          }}></span>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>{venue.availability.text}</span>
                        </div>
                      </div>
                      
                      {/* Card Content */}
                      <div style={{ padding: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                          {/* Left: Details */}
                          <div>
                            {/* Meta Info */}
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '12px', fontSize: '13px', color: '#64748B' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Building2 style={{ width: '14px', height: '14px' }} />
                                {venue.venue_type}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin style={{ width: '14px', height: '14px' }} />
                                {venue.location.area}, {venue.location.city}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Users style={{ width: '14px', height: '14px' }} />
                                {venue.capacity.min}-{venue.capacity.max} guests
                              </span>
                            </div>
                            
                            {/* Description */}
                            {venue.description && (
                              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', marginBottom: '12px' }}>
                                {venue.description.substring(0, 180)}{venue.description.length > 180 ? '...' : ''}
                              </p>
                            )}
                            
                            {/* Amenities */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                              {venue.amenities.slice(0, 6).map((amenity, i) => (
                                <span key={i} style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '4px',
                                  fontSize: '11px', 
                                  padding: '4px 8px', 
                                  backgroundColor: '#f1f5f9', 
                                  borderRadius: '4px',
                                  color: '#475569'
                                }}>
                                  <Check style={{ width: '10px', height: '10px', color: '#10b981' }} />
                                  {amenity}
                                </span>
                              ))}
                            </div>
                            
                            {/* Expert Notes */}
                            {venue.expert_notes && (
                              <div style={{ 
                                backgroundColor: '#fffbeb', 
                                border: '1px solid #fcd34d',
                                borderRadius: '8px', 
                                padding: '12px',
                                marginTop: '8px'
                              }}>
                                <p style={{ fontSize: '11px', fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                                  VL Expert Notes
                                </p>
                                <p style={{ fontSize: '12px', color: '#78350f', lineHeight: '1.4', margin: 0 }}>
                                  "{venue.expert_notes}"
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {/* Right: Price, Rating & Photo */}
                          <div style={{ textAlign: 'right' }}>
                            {/* Price */}
                            <div style={{ marginBottom: '12px' }}>
                              <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>Starting from</p>
                              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#C8A960', margin: '2px 0' }}>
                                {formatIndianCurrency(venue.pricing.starting_price)}
                              </p>
                              <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>{venue.pricing.price_type}</p>
                            </div>
                            
                            {/* Negotiated Price */}
                            {venue.pricing.proposed_price && (
                              <div style={{ 
                                display: 'inline-block',
                                backgroundColor: '#ecfdf5', 
                                borderRadius: '6px', 
                                padding: '8px 12px',
                                marginBottom: '12px'
                              }}>
                                <p style={{ fontSize: '10px', color: '#047857', margin: 0 }}>Negotiated Price</p>
                                <p style={{ fontSize: '16px', fontWeight: '600', color: '#047857', margin: 0 }}>
                                  {formatIndianCurrency(venue.pricing.proposed_price)}
                                </p>
                              </div>
                            )}
                            
                            {/* Rating */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginBottom: '12px' }}>
                              <Star style={{ width: '16px', height: '16px', color: '#f59e0b', fill: '#f59e0b' }} />
                              <span style={{ fontWeight: '600', fontSize: '14px' }}>{venue.rating.score}</span>
                              <span style={{ fontSize: '12px', color: '#64748B' }}>({venue.rating.review_count} reviews)</span>
                            </div>
                            
                            {/* Venue Image */}
                            {venue.images && venue.images.length > 0 && (
                              <div style={{ 
                                width: '100%', 
                                height: '120px', 
                                borderRadius: '8px', 
                                overflow: 'hidden',
                                backgroundColor: '#f1f5f9'
                              }}>
                                <img 
                                  src={venue.images[0]} 
                                  alt={venue.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  crossOrigin="anonymous"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Page 1 Footer */}
              <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>
                  Managed by <strong style={{ color: '#111111' }}>VenuLock</strong> Experts | www.venulock.in
                </p>
              </div>
            </div>

            {/* ==================== PAGE 2: COMPARISON TABLE ==================== */}
            <div ref={page2Ref} className="bg-white mt-8" style={{ width: '794px', padding: '40px' }}>
              {/* Header */}
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '3px solid #C8A960' }}>
                <h2 style={{ fontSize: '24px', fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#111111', margin: 0 }}>
                  Quick Comparison
                </h2>
                <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  Side-by-side overview of your shortlisted venues
                </p>
              </div>

              {/* Comparison Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#111111' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: '600', borderRadius: '8px 0 0 0' }}>
                      Feature
                    </th>
                    {comparisonData.venues.map((v, i) => (
                      <th key={i} style={{ 
                        padding: '12px', 
                        textAlign: 'center', 
                        color: '#C8A960', 
                        fontWeight: '600',
                        borderRadius: i === comparisonData.venues.length - 1 ? '0 8px 0 0' : 0
                      }}>
                        {v.name.length > 18 ? v.name.substring(0, 18) + '...' : v.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '500', color: '#111111', borderBottom: '1px solid #e2e8f0' }}>Venue Type</td>
                    {comparisonData.venues.map((v, i) => (
                      <td key={i} style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>{v.venue_type}</td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 12px', fontWeight: '500', color: '#111111', borderBottom: '1px solid #e2e8f0' }}>Location</td>
                    {comparisonData.venues.map((v, i) => (
                      <td key={i} style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', fontSize: '11px' }}>
                        {v.location.area}
                      </td>
                    ))}
                  </tr>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '500', color: '#111111', borderBottom: '1px solid #e2e8f0' }}>Capacity</td>
                    {comparisonData.venues.map((v, i) => (
                      <td key={i} style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                        {v.capacity.min}-{v.capacity.max}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 12px', fontWeight: '500', color: '#111111', borderBottom: '1px solid #e2e8f0' }}>Starting Price</td>
                    {comparisonData.venues.map((v, i) => (
                      <td key={i} style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', fontWeight: '600', color: '#C8A960' }}>
                        {formatIndianCurrency(v.pricing.starting_price)}
                      </td>
                    ))}
                  </tr>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '500', color: '#111111', borderBottom: '1px solid #e2e8f0' }}>Setting</td>
                    {comparisonData.venues.map((v, i) => (
                      <td key={i} style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>{v.indoor_outdoor}</td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 12px', fontWeight: '500', color: '#111111', borderBottom: '1px solid #e2e8f0' }}>Rating</td>
                    {comparisonData.venues.map((v, i) => (
                      <td key={i} style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Star style={{ width: '12px', height: '12px', color: '#f59e0b', fill: '#f59e0b' }} />
                          {v.rating.score}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '500', color: '#111111', borderBottom: '1px solid #e2e8f0' }}>Availability</td>
                    {comparisonData.venues.map((v, i) => {
                      const style = getAvailabilityStyle(v.availability.status);
                      return (
                        <td key={i} style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            backgroundColor: v.availability.status === 'high' ? '#ecfdf5' : v.availability.status === 'medium' ? '#fffbeb' : '#fef2f2',
                            color: v.availability.status === 'high' ? '#047857' : v.availability.status === 'medium' ? '#92400e' : '#b91c1c'
                          }}>
                            <span style={{ 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%',
                              backgroundColor: v.availability.status === 'high' ? '#10b981' : v.availability.status === 'medium' ? '#f59e0b' : '#ef4444'
                            }}></span>
                            {v.availability.status.charAt(0).toUpperCase() + v.availability.status.slice(1)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 12px', fontWeight: '500', color: '#111111' }}>Key Highlights</td>
                    {comparisonData.venues.map((v, i) => (
                      <td key={i} style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px', lineHeight: '1.4' }}>
                        {v.amenities.slice(0, 3).join(', ')}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>

              {/* Page 2 Footer */}
              <div style={{ marginTop: '40px', paddingTop: '16px', borderTop: '2px solid #111111' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>
                      Generated on {new Date(comparisonData.generated_at).toLocaleDateString('en-IN', { 
                        day: 'numeric', month: 'long', year: 'numeric' 
                      })}
                    </p>
                    <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0' }}>
                      By {comparisonData.generated_by.name} | VenuLock
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#111111', margin: 0 }}>
                      Have Questions?
                    </p>
                    <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0' }}>
                      {comparisonData.branding.contact} | www.venulock.in
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0 }}>
                    Managed by VenuLock Experts — From discovery to deal closure, we handle everything.
                  </p>
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
