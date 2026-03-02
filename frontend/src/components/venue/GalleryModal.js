import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Video,
  Calendar,
  Maximize2,
  Images,
} from 'lucide-react';

const GalleryModal = ({ open, onOpenChange, images, venueName, onEnquire, initialTab = 'photos' }) => {
  const [galleryTab, setGalleryTab] = useState(initialTab);
  const [galleryImageIndex, setGalleryImageIndex] = useState(null);

  // Sync tab when modal opens with a specific tab
  React.useEffect(() => {
    if (open) {
      setGalleryTab(initialTab);
      setGalleryImageIndex(null);
    }
  }, [open, initialTab]);

  const handleClose = () => {
    onOpenChange(false);
    setGalleryImageIndex(null);
  };

  const handleOpenChange = (val) => {
    onOpenChange(val);
    if (!val) setGalleryImageIndex(null);
  };

  const switchTab = (tab) => {
    setGalleryTab(tab);
    setGalleryImageIndex(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] sm:h-[90vh] p-0 overflow-hidden bg-[#0B1F3B] flex flex-col" aria-describedby={undefined} data-testid="gallery-modal">
        <DialogHeader className="sr-only">
          <DialogTitle>{venueName} — Media Gallery</DialogTitle>
        </DialogHeader>
        {/* Header with tabs */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-1 bg-white/10 rounded-full p-1">
            <button
              onClick={() => switchTab('photos')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                galleryTab === 'photos' 
                  ? 'bg-[#C9A227] text-[#0B1F3B]' 
                  : 'text-white/70 hover:text-white'
              }`}
              data-testid="gallery-tab-photos"
            >
              <Images className="w-4 h-4" />
              Photos
            </button>
            <button
              onClick={() => switchTab('video')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                galleryTab === 'video' 
                  ? 'bg-[#C9A227] text-[#0B1F3B]' 
                  : 'text-white/70 hover:text-white'
              }`}
              data-testid="gallery-tab-video"
            >
              <Video className="w-4 h-4" />
              Video
            </button>
            <button
              onClick={() => switchTab('360')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                galleryTab === '360' 
                  ? 'bg-[#C9A227] text-[#0B1F3B]' 
                  : 'text-white/70 hover:text-white'
              }`}
              data-testid="gallery-tab-360"
            >
              <Maximize2 className="w-4 h-4" />
              360°
            </button>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            data-testid="gallery-close-btn"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4 min-h-0">
          {galleryTab === 'photos' && galleryImageIndex !== null && (
            <div className="flex flex-col h-full" data-testid="gallery-fullscreen-view">
              <div className="relative flex-1 flex items-center justify-center mb-4 min-h-[300px]">
                <button
                  onClick={() => setGalleryImageIndex(null)}
                  className="absolute top-2 left-2 z-10 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm flex items-center gap-1.5"
                  data-testid="gallery-back-to-grid"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to grid
                </button>
                <button
                  onClick={() => setGalleryImageIndex((galleryImageIndex - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                  data-testid="gallery-prev-photo"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <img
                  src={images[galleryImageIndex]}
                  alt={`${venueName} - ${galleryImageIndex + 1}`}
                  className="max-h-[60vh] max-w-full object-contain rounded-lg"
                />
                <button
                  onClick={() => setGalleryImageIndex((galleryImageIndex + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                  data-testid="gallery-next-photo"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
                <span className="absolute bottom-2 right-2 px-3 py-1 bg-black/50 rounded-full text-white/80 text-xs">
                  {galleryImageIndex + 1} / {images.length}
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setGalleryImageIndex(idx)}
                    className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-colors ${
                      idx === galleryImageIndex ? 'border-[#C9A227]' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {galleryTab === 'photos' && galleryImageIndex === null && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3" data-testid="gallery-photo-grid">
              {images.map((img, idx) => (
                <div 
                  key={idx} 
                  className="aspect-[4/3] rounded-lg overflow-hidden cursor-pointer group relative"
                  onClick={() => setGalleryImageIndex(idx)}
                  data-testid={`gallery-photo-${idx}`}
                >
                  <img src={img} alt={`${venueName} - ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
              ))}
            </div>
          )}
          
          {galleryTab === 'video' && (
            <div className="h-full flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-full max-w-2xl aspect-video rounded-xl overflow-hidden bg-black relative">
                <img 
                  src={images[1] || images[0]} 
                  alt="Video preview"
                  className="w-full h-full object-cover opacity-40"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-[#C9A227]/20 border-2 border-[#C9A227] flex items-center justify-center mb-4">
                    <Play className="w-8 h-8 text-[#C9A227] ml-1" fill="#C9A227" />
                  </div>
                  <p className="text-lg font-serif font-medium text-white mb-1">Video Walkthrough</p>
                  <p className="text-sm text-white/50 mb-6 text-center max-w-sm">
                    A professional video tour of {venueName} is being prepared
                  </p>
                  <Button 
                    onClick={() => { onOpenChange(false); onEnquire(); }}
                    className="bg-[#C9A227] hover:bg-[#D4B040] text-[#0B1F3B] font-medium"
                    data-testid="gallery-request-video"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Request Video Tour
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {galleryTab === '360' && (
            <div className="h-full flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-full max-w-3xl aspect-video rounded-xl overflow-hidden bg-black relative">
                <img 
                  src={images[0]} 
                  alt="360 View"
                  className="w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-[#C9A227]/20 border-2 border-[#C9A227] flex items-center justify-center mb-4 animate-pulse">
                    <Maximize2 className="w-10 h-10 text-[#C9A227]" />
                  </div>
                  <p className="text-xl font-serif font-medium text-white mb-1">360° Virtual Tour</p>
                  <p className="text-sm text-white/50 mb-6 text-center max-w-md">
                    Experience an immersive walkthrough of this stunning venue from anywhere
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => { onOpenChange(false); onEnquire(); }}
                      className="bg-[#C9A227] hover:bg-[#D4B040] text-[#0B1F3B] font-medium"
                      data-testid="gallery-start-tour"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Virtual Tour
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => { onOpenChange(false); onEnquire(); }}
                      className="border-white/30 text-white hover:bg-white/10"
                      data-testid="gallery-book-visit"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Site Visit
                    </Button>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                <span className="px-3 py-1.5 bg-white/10 rounded-full text-white/80 text-sm">Grand Ballroom</span>
                <span className="px-3 py-1.5 bg-white/10 rounded-full text-white/80 text-sm">Lobby</span>
                <span className="px-3 py-1.5 bg-white/10 rounded-full text-white/80 text-sm">Poolside</span>
                <span className="px-3 py-1.5 bg-white/10 rounded-full text-white/80 text-sm">Garden</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GalleryModal;
