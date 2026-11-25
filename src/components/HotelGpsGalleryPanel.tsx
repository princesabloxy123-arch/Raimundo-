import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Images,
  MapPin,
  Pause,
  Play,
  Star,
} from 'lucide-react';
import { CONAE_ASSETS } from '../data/conaeSeed';
import { useLanguage } from '../i18n/LanguageContext';
import type { PartnerHotel } from '../types';

interface GalleryPhotoSlide {
  src: string;
  alt: string;
  label: string;
}

interface HotelGpsGalleryPanelProps {
  hotels: PartnerHotel[];
  onGoToHotels?: () => void;
  variant?: 'sidebar' | 'compact';
}

export const HotelGpsGalleryPanel: React.FC<HotelGpsGalleryPanelProps> = ({
  hotels,
  onGoToHotels,
  variant = 'sidebar',
}) => {
  const { tr, translateDynamic } = useLanguage();

  const activeHotels = useMemo(() => hotels.filter((h) => h.active), [hotels]);
  const [hotelIndex, setHotelIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPausedByHover, setIsPausedByHover] = useState(false);

  const safeIndex = activeHotels.length > 0 ? hotelIndex % activeHotels.length : 0;
  const activeHotel = activeHotels[safeIndex] || null;

  useEffect(() => {
    setPhotoIndex(0);
  }, [activeHotel?.id]);

  const gallerySlides: GalleryPhotoSlide[] = useMemo(() => {
    if (!activeHotel) return [];
    const slides: GalleryPhotoSlide[] = [];

    if (activeHotel.photoUrl) {
      slides.push({
        src: activeHotel.photoUrl,
        alt: activeHotel.name,
        label: tr('Foto Oficial', 'Official Photo'),
      });
    }

    if (Array.isArray(activeHotel.galleryPhotos)) {
      activeHotel.galleryPhotos.forEach((url, idx) => {
        if (url && url.trim()) {
          slides.push({
            src: url,
            alt: `${activeHotel.name} (${idx + 2})`,
            label: tr('Galeria Hotel', 'Hotel Gallery'),
          });
        }
      });
    }

    if (slides.length === 0) {
      slides.push({
        src: CONAE_ASSETS.emblemHeart,
        alt: activeHotel.name,
        label: 'CONAE VIP',
      });
    }

    return slides;
  }, [activeHotel, tr]);

  const safePhotoIdx = gallerySlides.length > 0 ? photoIndex % gallerySlides.length : 0;
  const currentSlide = gallerySlides[safePhotoIdx];

  // Auto-cycle through registered hotels one by one (and advance gallery photos)
  useEffect(() => {
    if (!isPlaying || isPausedByHover || activeHotels.length <= 1) return;
    const timer = window.setInterval(() => {
      if (gallerySlides.length > 1 && photoIndex < gallerySlides.length - 1) {
        setPhotoIndex((p) => p + 1);
      } else {
        setHotelIndex((prev) => (prev + 1) % activeHotels.length);
      }
    }, 5500);
    return () => window.clearInterval(timer);
  }, [isPlaying, isPausedByHover, activeHotels.length, gallerySlides.length, photoIndex]);

  if (!activeHotel) {
    return null;
  }

  return (
    <aside
      onMouseEnter={() => setIsPausedByHover(true)}
      onMouseLeave={() => setIsPausedByHover(false)}
      className="conae-panel rounded-xl p-3.5 space-y-3 text-xs border border-amber-400/35 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-amber-400/20 pb-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1">
            <Images className="w-3 h-3 shrink-0" />
            <span className="truncate">{tr('Galeria · Hotéis', 'Gallery · Hotels')}</span>
          </p>
          <h3 className="text-sm font-bold text-white leading-tight mt-0.5">
            {tr('Hotéis Conveniados · Descontos Afiliados', 'Partner Hotels · Affiliate Discounts')}
          </h3>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="px-1.5 py-0.5 rounded bg-black/55 border border-amber-400/30 text-[10px] font-mono text-amber-300 tabular-nums">
            {safeIndex + 1}/{activeHotels.length}
          </span>
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            title={isPlaying ? tr('Pausar rotação', 'Pause rotation') : tr('Continuar rotação', 'Resume rotation')}
            aria-label={isPlaying ? tr('Pausar', 'Pause') : tr('Reproduzir', 'Play')}
            className="p-1 rounded bg-black/55 border border-amber-400/25 text-amber-300 hover:text-white cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={() =>
              setHotelIndex((prev) => (prev - 1 + activeHotels.length) % activeHotels.length)
            }
            aria-label={tr('Hotel anterior', 'Previous hotel')}
            className="p-1 rounded bg-black/55 border border-amber-400/25 text-emerald-200 hover:text-white cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setHotelIndex((prev) => (prev + 1) % activeHotels.length)}
            aria-label={tr('Próximo hotel', 'Next hotel')}
            className="p-1 rounded bg-black/55 border border-amber-400/25 text-emerald-200 hover:text-white cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Left-side Hotel Menu List (Compact scrollable selector of registered hotels) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-emerald-200/75">
          <span>{tr('Menu de Hotéis Cadastrados', 'Registered Hotels Menu')}</span>
          <span className="font-mono text-amber-300">{activeHotels.length} VIP</span>
        </div>
        <div
          className={`space-y-1 overflow-y-auto pr-0.5 ${
            variant === 'compact' ? 'max-h-28' : 'max-h-36'
          }`}
        >
          {activeHotels.map((h, idx) => {
            const isActive = idx === safeIndex;
            const photoCount =
              (h.photoUrl ? 1 : 0) +
              (Array.isArray(h.galleryPhotos) ? h.galleryPhotos.filter(Boolean).length : 0);
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => setHotelIndex(idx)}
                className={`w-full rounded-lg px-2.5 py-1.5 text-left transition-colors cursor-pointer flex items-center justify-between gap-2 border ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-400 text-white'
                    : 'bg-black/40 border-amber-400/15 text-emerald-100/80 hover:border-amber-400/45 hover:text-white'
                }`}
              >
                <div className="min-w-0 flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isActive ? 'bg-amber-400 animate-pulse' : photoCount > 0 ? 'bg-emerald-400' : 'bg-emerald-700'
                    }`}
                  />
                  <span className="text-[10px] font-mono text-amber-300 shrink-0">{h.state}</span>
                  <span className="text-[11px] font-medium truncate">{h.name}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-300 shrink-0">
                  -{h.discountPercent}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Hotel Photo Gallery */}
      <div className="space-y-2">
        <div className="relative h-44 sm:h-48 rounded-lg overflow-hidden bg-black/65 border border-amber-400/30">
          {currentSlide && (
            <img
              src={currentSlide.src}
              alt={currentSlide.alt}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-opacity duration-300"
            />
          )}

          {/* Top badges */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1.5 pointer-events-none">
            <span className="px-2 py-0.5 rounded bg-black/75 border border-amber-400/50 text-[10px] font-mono font-bold text-amber-300">
              {tr(`Até ${activeHotel.discountPercent}% OFF`, `Up to ${activeHotel.discountPercent}% OFF`)}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950/85 border border-emerald-400/40 text-[10px] font-mono text-emerald-200">
              {currentSlide?.label} · {safePhotoIdx + 1}/{gallerySlides.length}
            </span>
          </div>

          {/* Photo prev/next controls when multiple photos exist */}
          {gallerySlides.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setPhotoIndex((p) => (p - 1 + gallerySlides.length) % gallerySlides.length)
                }
                aria-label={tr('Foto anterior', 'Previous photo')}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/65 text-white hover:bg-amber-500 hover:text-neutral-950 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPhotoIndex((p) => (p + 1) % gallerySlides.length)}
                aria-label={tr('Próxima foto', 'Next photo')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/65 text-white hover:bg-amber-500 hover:text-neutral-950 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails Strip */}
        {gallerySlides.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {gallerySlides.map((slide, idx) => (
              <button
                key={`${activeHotel.id}_thumb_${idx}`}
                type="button"
                onClick={() => setPhotoIndex(idx)}
                className={`w-12 h-9 rounded overflow-hidden shrink-0 border transition-all cursor-pointer ${
                  idx === safePhotoIdx
                    ? 'border-amber-400 ring-1 ring-amber-400'
                    : 'border-amber-400/20 opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={slide.src}
                  alt={slide.alt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hotel Title, Rating, Description & Benefits */}
      <div className="conae-panel-soft rounded-lg p-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold text-amber-300 truncate">
            {translateDynamic(activeHotel.category)}
          </span>
          <span className="inline-flex items-center gap-0.5 text-amber-400 shrink-0">
            {Array.from({ length: activeHotel.stars }).map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
            ))}
          </span>
        </div>

        <h4 className="text-sm font-bold text-white leading-snug">{activeHotel.name}</h4>

        <p className="text-[11px] text-emerald-200/85 flex items-start gap-1">
          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span className="leading-snug">{activeHotel.city} · {activeHotel.state}</span>
        </p>

        <p className="text-[11px] text-emerald-100/80 leading-relaxed">
          {activeHotel.description}
        </p>

        {activeHotel.hotelBenefits && (
          <p className="text-[10px] text-emerald-300/85 pt-1 border-t border-amber-400/15">
            {activeHotel.hotelBenefits}
          </p>
        )}
      </div>

      {/* Action Button */}
      {onGoToHotels && (
        <button
          type="button"
          onClick={onGoToHotels}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-bold text-[11px] hover:from-amber-400 hover:to-amber-300 cursor-pointer"
        >
          <Images className="w-3.5 h-3.5 shrink-0" />
          <span>{tr('Ver Rede Completa de Hotéis', 'View All Partner Hotels')}</span>
        </button>
      )}
    </aside>
  );
};
