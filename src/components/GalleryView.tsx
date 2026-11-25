import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Layers,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePortal } from '../context/PortalContext';
import { BMAS_BATCHES } from '../types/portal';
import { compressGalleryImageFile } from '../utils/imageCompression';
import { cleanBatchLabel } from '../utils/portalLogic';

export function GalleryView() {
  const { isAdmin, galleryPhotos, addGalleryPhoto, removeGalleryPhoto } = usePortal();

  const carouselRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    const maxScroll = scrollWidth - clientWidth;
    setScrollProgress(maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0);
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const amount = direction === 'left' ? -380 : 380;
    carouselRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const [selectedBatch, setSelectedBatch] = useState<string>('All Batches');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const pinchDistanceRef = useRef<number | null>(null);

  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Upload Form State
  const [uploadBatch, setUploadBatch] = useState<string>(BMAS_BATCHES[0] ?? '2nd Batch');
  const [uploadCustomBatch, setUploadCustomBatch] = useState<string>('');
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadDesc, setUploadDesc] = useState<string>('');
  const [uploadPhotoUrl, setUploadPhotoUrl] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const availableBatches = useMemo(() => {
    const ordered = [...BMAS_BATCHES];
    const extras: string[] = [];
    galleryPhotos.forEach((p) => {
      const cleaned = cleanBatchLabel(p.batch);
      if (cleaned && !ordered.some((b) => b.toLowerCase() === cleaned.toLowerCase())) {
        if (!extras.some((b) => b.toLowerCase() === cleaned.toLowerCase())) {
          extras.push(cleaned);
        }
      }
    });
    return ['All Batches', ...ordered, ...extras.sort()];
  }, [galleryPhotos]);

  const filteredPhotos = useMemo(() => {
    if (selectedBatch === 'All Batches') {
      return galleryPhotos;
    }
    return galleryPhotos.filter(
      (p) => cleanBatchLabel(p.batch).toLowerCase() === selectedBatch.toLowerCase()
    );
  }, [galleryPhotos, selectedBatch]);

  useEffect(() => {
    setLightboxIndex(null);
    setConfirmDeleteId(null);
  }, [selectedBatch]);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [lightboxIndex]);

  const currentLightboxPhoto =
    lightboxIndex !== null ? filteredPhotos[lightboxIndex] ?? null : null;

  const clampZoom = (next: number) => Math.min(4, Math.max(1, Number(next.toFixed(2))));

  const handleZoomIn = () => setZoom((z) => clampZoom(z + 0.5));
  const handleZoomOut = () =>
    setZoom((z) => {
      const next = clampZoom(z - 0.5);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handlePrev = () => {
    if (filteredPhotos.length <= 1 || lightboxIndex === null) return;
    setLightboxIndex((prev) =>
      prev === null ? 0 : prev === 0 ? filteredPhotos.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    if (filteredPhotos.length <= 1 || lightboxIndex === null) return;
    setLightboxIndex((prev) =>
      prev === null ? 0 : prev === filteredPhotos.length - 1 ? 0 : prev + 1
    );
  };

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIndex, filteredPhotos.length]);

  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setZoom((z) => {
      const next = clampZoom(z + delta);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      originX: pan.x,
      originY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || zoom <= 1) return;
    setPan({
      x: dragStartRef.current.originX + (e.clientX - dragStartRef.current.x),
      y: dragStartRef.current.originY + (e.clientY - dragStartRef.current.y),
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistanceRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchDistanceRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchDistanceRef.current;
      pinchDistanceRef.current = dist;
      setZoom((z) => {
        const next = clampZoom(z * ratio);
        if (next <= 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const handleTouchEnd = () => {
    pinchDistanceRef.current = null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      setUploadError('Image size exceeds 12MB. Please select a smaller photo.');
      return;
    }

    setUploadError(null);
    setCompressing(true);
    try {
      const compressedDataUrl = await compressGalleryImageFile(file);
      setUploadPhotoUrl(compressedDataUrl);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Unable to process selected image file.');
    } finally {
      setCompressing(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalBatch = cleanBatchLabel(
      uploadBatch === 'custom' ? uploadCustomBatch.trim() : uploadBatch.trim()
    );
    if (!finalBatch) {
      setUploadError('Please select or enter a batch.');
      return;
    }
    if (!uploadTitle.trim()) {
      setUploadError('Please provide a photo title.');
      return;
    }
    if (!uploadPhotoUrl.trim()) {
      setUploadError('Please select a photo file or enter an image URL.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      await addGalleryPhoto({
        batch: finalBatch,
        title: uploadTitle.trim(),
        description: uploadDesc.trim() || undefined,
        photoUrl: uploadPhotoUrl.trim(),
      });

      setSelectedBatch(finalBatch);
      setUploadModalOpen(false);
      setUploadTitle('');
      setUploadDesc('');
      setUploadPhotoUrl('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload photo.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] sm:min-h-[calc(100dvh-4rem)] flex flex-col bg-[#0A192F] text-white p-4 sm:p-6 lg:p-8 overflow-x-clip">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-[#0D9488]/20 via-[#C5A059]/15 to-transparent blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-7xl w-full mx-auto flex flex-col flex-1">
        {/* Top Header & Batch Filter */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/15">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-[#D8B979] uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" aria-hidden="true" />
              <span>BMASA ALUMNI ARCHIVES</span>
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
              Batch Photo Gallery
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Click any thumbnail to open a distraction-free full-screen view with zoom controls.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex flex-wrap items-center gap-2 bg-white/10 backdrop-blur-md border border-white/25 rounded-xl px-3.5 py-2 shadow-sm flex-1 sm:flex-initial min-w-0">
              <Layers className="w-4 h-4 text-[#C5A059] shrink-0" aria-hidden="true" />
              <label htmlFor="gallery-batch-select" className="text-xs font-semibold text-slate-200 whitespace-nowrap">
                Select Batch:
              </label>
              <select
                id="gallery-batch-select"
                data-testid="gallery-batch-select"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-2"
              >
                {availableBatches.map((b) => {
                  const count =
                    b === 'All Batches'
                      ? galleryPhotos.length
                      : galleryPhotos.filter(
                          (p) => cleanBatchLabel(p.batch).toLowerCase() === b.toLowerCase()
                        ).length;
                  return (
                    <option key={b} value={b} className="bg-[#0A192F] text-white">
                      {b} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {isAdmin && (
              <button
                type="button"
                data-testid="gallery-open-upload-btn"
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#0A192F] bg-[#C5A059] hover:bg-[#D8B979] shadow-md transition-all whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Upload Batch Photo</span>
              </button>
            )}
          </div>
        </div>

        {/* Compact Thumbnail Picture Grid & Snap Carousel */}
        {filteredPhotos.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl my-6">
            <Camera className="w-12 h-12 text-[#C5A059] mb-3 opacity-60" aria-hidden="true" />
            <h2 className="font-display font-bold text-lg text-white">No Photos for {selectedBatch}</h2>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              There are currently no photos uploaded for this batch. Administrators can upload batch photos using the button above.
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setUploadBatch(selectedBatch === 'All Batches' ? '2nd Batch' : selectedBatch);
                  setUploadModalOpen(true);
                }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-[#0A192F] bg-[#C5A059] hover:bg-[#D8B979] shadow-md transition-all"
              >
                Upload First Photo for {selectedBatch}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8 pb-8">
            {/* Multi-Card Snap Carousel + Progress Pill */}
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-display font-bold text-base sm:text-lg text-white">
                    Featured Archive Carousel ({filteredPhotos.length} Photos)
                  </h2>
                  <p className="text-xs text-slate-300">
                    Displays 4 to 5 crisp, small rounded cards side-by-side with smooth horizontal drag/swipe
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scrollCarousel('left')}
                    aria-label="Scroll left"
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shadow-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollCarousel('right')}
                    aria-label="Scroll right"
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shadow-lg"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Snap Carousel Container */}
              <div className="relative">
                <div
                  ref={carouselRef}
                  onScroll={handleCarouselScroll}
                  data-testid="gallery-carousel"
                  className="flex items-stretch gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar py-2 px-1 cursor-grab active:cursor-grabbing"
                >
                  {filteredPhotos.map((photo, idx) => (
                    <div
                      key={`carousel-${photo.id || idx}`}
                      className="w-60 sm:w-68 md:w-72 shrink-0 snap-start rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 overflow-hidden shadow-xl group hover:border-[#C5A059] transition-all flex flex-col"
                    >
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(idx)}
                        aria-label={`Open ${photo.title}`}
                        className="relative aspect-[4/3] w-full overflow-hidden bg-black/40 cursor-zoom-in"
                      >
                        <img
                          src={photo.photoUrl}
                          alt={photo.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </button>
                      <div className="p-3 bg-[#071324]/90 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{photo.title}</p>
                          <p className="font-mono text-[10px] text-[#D8B979] truncate">{cleanBatchLabel(photo.batch)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLightboxIndex(idx)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#0A192F] bg-[#C5A059] hover:bg-[#D8B979] shrink-0"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sleek Pill Progress Bar Underneath */}
                <div className="mt-4 w-full max-w-md mx-auto bg-white/10 backdrop-blur-md rounded-full h-2.5 overflow-hidden border border-white/20 p-0.5 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-[#2DD4BF] via-[#FBBF24] to-[#C5A059] rounded-full transition-all duration-150 shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                    style={{ width: `${Math.max(12, scrollProgress)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Compact Thumbnail Picture Grid */}
            <div className="pt-4 border-t border-white/15">
              <h3 className="font-display font-semibold text-sm text-slate-200 mb-3">
                Full Batch Archive Grid ({filteredPhotos.length})
              </h3>
              <div
                data-testid="gallery-grid"
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4"
              >
                {filteredPhotos.map((photo, idx) => (
                  <div
                    key={photo.id || idx}
                    className="group relative rounded-xl overflow-hidden bg-white/5 border border-white/15 hover:border-[#C5A059] transition-all shadow-sm flex flex-col"
                  >
                    <button
                      type="button"
                      data-testid={`gallery-thumb-${idx}`}
                      onClick={() => setLightboxIndex(idx)}
                      aria-label={`Open full-screen photo: ${photo.title}`}
                      className="relative aspect-[4/3] w-full overflow-hidden bg-black/40 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
                    >
                      <img
                        src={photo.photoUrl}
                        alt={photo.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </button>

                    <div className="px-2.5 py-2 flex items-center justify-between gap-2 bg-[#071324]/90">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-white truncate">{photo.title}</p>
                        <p className="font-mono text-[10px] text-[#D8B979] truncate">
                          {cleanBatchLabel(photo.batch)}
                        </p>
                      </div>

                      {isAdmin && (
                        <div className="shrink-0">
                          {confirmDeleteId === photo.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  await removeGalleryPhoto(photo.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-1.5 py-0.5 rounded bg-red-600 text-[10px] font-bold text-white"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1.5 py-0.5 rounded bg-white/15 text-[10px] text-white"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(photo.id)}
                              aria-label={`Delete ${photo.title}`}
                              className="p-1 rounded text-rose-300 hover:text-rose-200 hover:bg-white/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clean Full-Screen Photo Lightbox (Zero Text, Zero Titles, Zero Overlays) */}
      <AnimatePresence>
        {currentLightboxPhoto && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Full screen photo viewer"
            data-testid="gallery-fullscreen-viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onWheel={handleWheelZoom}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={(e) => {
              if (e.target === e.currentTarget) setLightboxIndex(null);
            }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden select-none touch-none"
          >
            {/* Image Only — No Captions, No Titles, No Badges */}
            <div
              onPointerDown={handlePointerDown}
              onDoubleClick={() => {
                if (zoom > 1) {
                  handleZoomReset();
                } else {
                  setZoom(2.2);
                }
              }}
              className={`w-full h-full flex items-center justify-center ${
                zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
              }`}
            >
              <img
                src={currentLightboxPhoto.photoUrl}
                alt=""
                draggable={false}
                data-testid="gallery-fullscreen-img"
                data-zoom={zoom}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transition: isDragging ? 'none' : 'transform 150ms ease-out',
                }}
                className="max-w-full max-h-full object-contain pointer-events-none"
              />
            </div>

            {/* Minimal Icon-Only Corner Controls (No Visible Text) */}
            <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
              <button
                type="button"
                data-testid="gallery-zoom-out-btn"
                aria-label="Zoom out"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                className="w-10 h-10 rounded-full bg-black/55 hover:bg-black/80 text-white border border-white/20 disabled:opacity-40 flex items-center justify-center transition-colors cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                data-testid="gallery-zoom-in-btn"
                aria-label="Zoom in"
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                className="w-10 h-10 rounded-full bg-black/55 hover:bg-black/80 text-white border border-white/20 disabled:opacity-40 flex items-center justify-center transition-colors cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" aria-hidden="true" />
              </button>
              {zoom > 1 && (
                <button
                  type="button"
                  data-testid="gallery-zoom-reset-btn"
                  aria-label="Reset zoom"
                  onClick={handleZoomReset}
                  className="w-10 h-10 rounded-full bg-black/55 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                data-testid="gallery-fullscreen-close-btn"
                aria-label="Close full-screen photo"
                onClick={() => setLightboxIndex(null)}
                className="w-10 h-10 rounded-full bg-black/55 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Minimal Icon-Only Navigation Arrows */}
            {filteredPhotos.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={handlePrev}
                  className="fixed left-4 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-black/55 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={handleNext}
                  className="fixed right-4 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-black/55 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" aria-hidden="true" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Upload Batch Photo Modal */}
      <AnimatePresence>
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#0A192F] border border-white/20 rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/15">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#C5A059]" aria-hidden="true" />
                  <h3 className="font-display font-bold text-white text-base">
                    Upload Batch Historical Photo
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  aria-label="Close upload modal"
                  className="p-1 rounded-full hover:bg-white/10 text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {uploadError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs">
                  {uploadError}
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Cadet / Alumni Batch
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      aria-label="Upload target batch"
                      value={uploadBatch}
                      onChange={(e) => setUploadBatch(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                    >
                      {BMAS_BATCHES.map((b) => (
                        <option key={b} value={b} className="bg-[#0A192F]">
                          {b}
                        </option>
                      ))}
                      <option value="custom" className="bg-[#0A192F]">
                        Custom Batch...
                      </option>
                    </select>

                    {uploadBatch === 'custom' && (
                      <input
                        type="text"
                        placeholder="e.g. 8th Batch"
                        value={uploadCustomBatch}
                        onChange={(e) => setUploadCustomBatch(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Photo Title / Event Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Passing Out Parade Inspection Drill"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Description / Context (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Details about the cadets, vessel, or academy grounds..."
                    value={uploadDesc}
                    onChange={(e) => setUploadDesc(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Select Photo File or URL
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#0D9488] file:text-white hover:file:bg-[#0F766E] cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">or paste image URL:</span>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={uploadPhotoUrl.startsWith('data:') ? '' : uploadPhotoUrl}
                        onChange={(e) => setUploadPhotoUrl(e.target.value)}
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0D9488]"
                      />
                    </div>
                  </div>

                  {uploadPhotoUrl && (
                    <div className="mt-3 relative w-full h-36 rounded-xl overflow-hidden border border-white/20 bg-black/40 flex items-center justify-center">
                      <img src={uploadPhotoUrl} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/15">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || compressing}
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-[#0A192F] bg-[#C5A059] hover:bg-[#D8B979] shadow-md transition-all disabled:opacity-50"
                  >
                    {compressing ? 'Optimizing...' : uploading ? 'Uploading...' : 'Save to Gallery'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
