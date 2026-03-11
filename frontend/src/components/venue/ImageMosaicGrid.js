import React from 'react';

const ImageMosaicGrid = ({ images, onImageClick, venueName }) => {
  if (!images?.length) return null;

  const gridImages = images.slice(0, 5);
  const remaining = images.length - 5;

  return (
    <div
      className="hidden lg:grid grid-cols-4 grid-rows-2 gap-2 h-[460px] rounded-2xl overflow-hidden cursor-pointer"
      data-testid="image-mosaic-grid"
    >
      {/* Large main image */}
      <div
        className="col-span-2 row-span-2 relative group"
        onClick={() => onImageClick(0)}
      >
        <img
          src={gridImages[0]}
          alt={`${venueName} - Main`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>

      {/* Top-right images */}
      {gridImages[1] && (
        <div className="relative group" onClick={() => onImageClick(1)}>
          <img
            src={gridImages[1]}
            alt={`${venueName} - 2`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
      )}
      {gridImages[2] && (
        <div className="relative group" onClick={() => onImageClick(2)}>
          <img
            src={gridImages[2]}
            alt={`${venueName} - 3`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
      )}

      {/* Bottom-right images */}
      {gridImages[3] && (
        <div className="relative group" onClick={() => onImageClick(3)}>
          <img
            src={gridImages[3]}
            alt={`${venueName} - 4`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
      )}
      {gridImages[4] ? (
        <div className="relative group" onClick={() => onImageClick(4)}>
          <img
            src={gridImages[4]}
            alt={`${venueName} - 5`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          {remaining > 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-lg font-bold">+{remaining} more</span>
            </div>
          )}
        </div>
      ) : gridImages[1] && (
        <div className="bg-slate-100 flex items-center justify-center" onClick={() => onImageClick(0)}>
          <span className="text-slate-400 text-sm">No more photos</span>
        </div>
      )}
    </div>
  );
};

export default ImageMosaicGrid;
