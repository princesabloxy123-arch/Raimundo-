import React, { useMemo, useState } from 'react';
import { Building2, Pause, Play, Store, Award } from 'lucide-react';
import { CONAE_ASSETS } from '../data/conaeSeed';
import { useLanguage } from '../i18n/LanguageContext';
import type { BenefitPartner, PartnerHotel, SponsorItem, TabId } from '../types';

interface FloatingAutoCarouselProps {
  hotels: PartnerHotel[];
  benefitPartners: BenefitPartner[];
  sponsors: SponsorItem[];
  onNavigateTab: (tab: TabId) => void;
}

interface MarqueeCardItem {
  id: string;
  kind: 'Hotel' | 'Benefício' | 'Patrocinador';
  title: string;
  subtitle: string;
  description: string;
  photoUrl?: string;
  targetTab: TabId;
}

export const FloatingAutoCarousel: React.FC<FloatingAutoCarouselProps> = ({
  hotels,
  benefitPartners,
  sponsors,
  onNavigateTab,
}) => {
  const { tr, translateDynamic } = useLanguage();
  const [paused, setPaused] = useState(false);

  const items = useMemo<MarqueeCardItem[]>(() => {
    const list: MarqueeCardItem[] = [];
    hotels
      .filter((h) => h.active)
      .forEach((h) => {
        list.push({
          id: `h_${h.id}`,
          kind: 'Hotel',
          title: h.name,
          subtitle: `${h.city}/${h.state} · ${h.stars}★ · ${tr(`Até ${h.discountPercent}% OFF`, `Up to ${h.discountPercent}% OFF`)}`,
          description: h.description,
          photoUrl: h.photoUrl,
          targetTab: 'hoteis',
        });
      });

    benefitPartners
      .filter((b) => b.active)
      .forEach((b) => {
        list.push({
          id: `b_${b.id}`,
          kind: 'Benefício',
          title: b.name,
          subtitle: `${translateDynamic(b.category)} · ${b.city}/${b.state} · ${b.discountPercent}% OFF`,
          description: b.description,
          photoUrl: b.photoUrl,
          targetTab: 'beneficios',
        });
      });

    sponsors
      .filter((s) => s.active)
      .forEach((s) => {
        list.push({
          id: `s_${s.id}`,
          kind: 'Patrocinador',
          title: s.name,
          subtitle: `${translateDynamic(s.segment)} · ${translateDynamic(s.benefit)}`,
          description: s.description,
          photoUrl: s.photoUrl,
          targetTab: 'midia',
        });
      });

    return list;
  }, [hotels, benefitPartners, sponsors, tr, translateDynamic]);

  if (items.length === 0) return null;

  // Duplicate list for seamless infinite CSS scroll
  const loopItems = [...items, ...items];

  // Scale duration cleanly with item count so announcements always glide slowly
  const durationSeconds = Math.max(95, items.length * 11);

  return (
    <section
      aria-label={tr('Rede CONAE em rolagem automática', 'CONAE Network auto-scrolling ticker')}
      className={`relative z-20 border-b border-amber-400/20 bg-gradient-to-r from-[#04100b]/95 via-[#071f16]/90 to-[#04100b]/95 marquee-wrapper ${
        paused ? 'marquee-paused' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1 flex items-center gap-2.5">
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? tr('Retomar rolagem automática', 'Resume auto-scroll') : tr('Pausar rolagem automática', 'Pause auto-scroll')}
            className="inline-flex items-center gap-1 px-2 py-1 rounded conae-panel-soft text-[10px] font-semibold text-amber-300 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
          >
            {paused ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
            <span>{tr('Rede', 'Network')}</span>
          </button>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div
            className="animate-marquee gap-2.5 items-center"
            style={{ animationDuration: `${durationSeconds}s` }}
          >
            {loopItems.map((item, index) => (
              <button
                key={`${item.id}_${index}`}
                type="button"
                onClick={() => onNavigateTab(item.targetTab)}
                className="conae-panel-soft rounded-md px-2 py-0.5 flex items-center gap-2 text-left hover:border-amber-400/70 transition-colors cursor-pointer shrink-0 w-64 sm:w-72"
              >
                <div className="w-6 h-6 rounded overflow-hidden border border-amber-400/40 bg-black/50 shrink-0 flex items-center justify-center">
                  <img
                    src={item.photoUrl || CONAE_ASSETS.emblemHeart}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-white truncate">
                    {item.kind === 'Hotel' ? (
                      <Building2 className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                    ) : item.kind === 'Patrocinador' ? (
                      <Award className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                    ) : (
                      <Store className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                    )}
                    <span className="truncate">{item.title}</span>
                  </div>
                  <p className="text-[10px] text-amber-300/90 truncate font-mono">
                    {item.subtitle} · {item.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
