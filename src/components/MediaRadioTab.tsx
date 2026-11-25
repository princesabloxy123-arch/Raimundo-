import React, { useEffect, useRef, useState } from 'react';
import { Radio, Volume2, Play, Pause, Youtube, Award, Film, ExternalLink } from 'lucide-react';
import { CONAE_ASSETS, DEFAULT_SPONSORS, RADIO_SCHEDULE } from '../data/conaeSeed';
import { useLanguage } from '../i18n/LanguageContext';
import type { SponsorItem } from '../types';

interface MediaRadioTabProps {
  sponsors?: SponsorItem[];
}

export const MediaRadioTab: React.FC<MediaRadioTabProps> = ({ sponsors = DEFAULT_SPONSORS }) => {
  const { tr, translateDynamic } = useLanguage();
  const [radioPlaying, setRadioPlaying] = useState(false);
  const [volume, setVolume] = useState(0.25);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const videos = [
    {
      id: 'vid_1',
      title: tr('Mensagem do Presidente Mundial da Convenção CONAE', 'Message from the CONAE World Convention President'),
      speaker: tr('Apóstolo Hélio César', 'Apostle Hélio César'),
      category: tr('Palavra Oficial · Convenção Mundial', 'Official Word · World Convention'),
      src: CONAE_ASSETS.videoMensagemMundial,
    },
    {
      id: 'vid_2',
      title: tr('Convocação 24 Horas com Deus · CONAE Nº 2091', '24 Hours with God Convocation · CONAE No. 2091'),
      speaker: tr('Apóstolo Hélio César', 'Apostle Hélio César'),
      category: tr('Programação Nacional & Estados', 'National & States Broadcast'),
      src: CONAE_ASSETS.videoConvocacao24h,
    },
    {
      id: 'vid_3',
      title: tr('Honra ao Mérito da Capelania · Câmara Municipal', 'Chaplaincy Honor of Merit · City Council'),
      speaker: tr('Apóstolo Hélio César', 'Apostle Hélio César'),
      category: tr('Bastidores & Reconhecimento Público', 'Backstage & Public Recognition'),
      src: CONAE_ASSETS.videoHonraCapelania,
    },
  ];

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = volume * 0.08;
    }
  }, [volume]);

  const toggleRadio = () => {
    if (!radioPlaying) {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const masterGain = ctx.createGain();
        masterGain.gain.value = volume * 0.08;
        masterGain.connect(ctx.destination);

        const freqs = [174.61, 220.0, 261.63, 329.63];
        freqs.forEach((f) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = f;
          osc.connect(masterGain);
          osc.start();
        });

        audioCtxRef.current = ctx;
        gainRef.current = masterGain;
        setRadioPlaying(true);
      } catch {
        setRadioPlaying(true);
      }
    } else {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
        gainRef.current = null;
      }
      setRadioPlaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Web Radio CONAE Live */}
      <div className="conae-panel rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-400/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-900/70 border border-amber-400/45 flex items-center justify-center shrink-0">
              <Radio className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-amber-300 font-medium">
                {tr('Transmissão Oficial dos Conveniados', 'Official Member Broadcast')}
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                {tr('Web Rádio CONAE Mundial', 'CONAE World Web Radio')}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleRadio}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-semibold text-sm hover:from-amber-400 hover:to-amber-300 cursor-pointer whitespace-nowrap"
            >
              {radioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {radioPlaying ? tr('Pausar Rádio CONAE', 'Pause CONAE Radio') : tr('Ouvir Rádio Ao Vivo', 'Listen Live Radio')}
            </button>

            <div className="flex items-center gap-2 bg-black/45 border border-amber-400/25 rounded-lg px-3 py-1.5">
              <Volume2 className="w-4 h-4 text-amber-300" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label={tr('Volume da Web Rádio CONAE', 'CONAE Web Radio Volume')}
                className="w-20 accent-amber-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {RADIO_SCHEDULE.map((item, idx) => (
            <div key={idx} className="conae-panel-soft rounded-lg p-3.5 space-y-1">
              <p className="text-xs font-mono text-amber-300">{item.time}</p>
              <p className="text-sm font-semibold text-white">{translateDynamic(item.program)}</p>
              <p className="text-xs text-emerald-100/70">{translateDynamic(item.host)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Uploaded Official Videos & YouTube Presentation */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-amber-300 font-medium">
              {tr('Vídeos Oficiais & Bastidores da Convenção', 'Official Videos & Convention Backstage')}
            </p>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-amber-400" />
              <span>{tr('Mensagens do Presidente Mundial & YouTube CONAE', 'World President Messages & CONAE YouTube')}</span>
            </h3>
          </div>

          <a
            href="https://www.youtube.com/results?search_query=Conacao+CONAE+Apostolo+Helio+Cesar"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-600/85 hover:bg-red-600 text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <Youtube className="w-4 h-4" />
            <span>{tr('Canal YouTube CONAE', 'CONAE YouTube Channel')}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {videos.map((vid) => (
            <div key={vid.id} className="conae-panel rounded-xl overflow-hidden flex flex-col justify-between">
              <div className="bg-black aspect-video">
                <video
                  src={vid.src}
                  controls
                  preload="metadata"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-4 space-y-1">
                <p className="text-[11px] text-amber-300 font-medium">{vid.category}</p>
                <h4 className="text-sm font-semibold text-white">{vid.title}</h4>
                <p className="text-xs text-emerald-100/70">{vid.speaker}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Official Sponsors Section */}
      <div className="conae-panel rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <div>
            <p className="text-xs text-amber-300 font-medium">
              {tr('Parceiros Institucionais', 'Institutional Partners')}
            </p>
            <h3 className="text-lg font-bold text-white">
              {tr('Patrocinadores Oficiais da Convenção CONAE', 'Official CONAE Convention Sponsors')}
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sponsors.filter((s) => s.active).map((sp) => (
            <div key={sp.id} className="conae-panel-soft rounded-lg overflow-hidden flex flex-col justify-between">
              <div className="h-24 bg-black/50 border-b border-amber-400/20 overflow-hidden">
                <img
                  src={sp.photoUrl || CONAE_ASSETS.emblemHeart}
                  alt={sp.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-90"
                />
              </div>
              <div className="p-3.5 space-y-1.5 flex-1">
                <p className="text-[11px] font-semibold text-amber-300">{translateDynamic(sp.segment)}</p>
                <h4 className="text-sm font-bold text-white">{sp.name}</h4>
                <p className="text-xs text-emerald-300 font-medium">{translateDynamic(sp.benefit)}</p>
                <p className="text-[11px] text-emerald-100/70">{sp.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
