import React, { useState } from 'react';
import { Crown, KeyRound, Lock, ShieldCheck, TrendingUp, Unlock } from 'lucide-react';
import { CONAE_ASSETS } from '../data/conaeSeed';
import { sha256Hex } from '../firebase';
import { useLanguage } from '../i18n/LanguageContext';
import type { UserProfile, VipExecutiveHash, VipRoomPublic } from '../types';

interface VipRoomTabProps {
  profile: UserProfile | null;
  vipPublic: VipRoomPublic | null;
  vipExecutiveHashes: VipExecutiveHash[];
  onRequireAuth: () => void;
  onGoToBank: () => void;
}

export const VipRoomTab: React.FC<VipRoomTabProps> = ({
  profile,
  vipPublic,
  vipExecutiveHashes,
  onRequireAuth,
  onGoToBank,
}) => {
  const { tr, translateDynamic } = useLanguage();
  const [passwordInput, setPasswordInput] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [unlockedExecutiveName, setUnlockedExecutiveName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onRequireAuth();
      return;
    }
    setErrorMsg(null);
    const entered = passwordInput.trim();
    if (!entered) return;

    const hash = await sha256Hex(entered);
    const targetHash = vipPublic?.passwordHash;
    const matchedExec = vipExecutiveHashes.find((eh) => eh.active && eh.passwordHash === hash);

    if (matchedExec) {
      setUnlockedExecutiveName(matchedExec.executiveName);
      setUnlocked(true);
    } else if (targetHash && hash === targetHash) {
      setUnlockedExecutiveName(profile.displayName);
      setUnlocked(true);
    } else if (!targetHash && entered === 'CONAE2026VIP') {
      setUnlockedExecutiveName(profile.displayName);
      setUnlocked(true);
    } else {
      setErrorMsg(
        tr(
          'Senha mensal ou credencial individual de executivo inválida. Solicite sua senha ao Presidente.',
          'Invalid monthly password or executive credential. Request your password from the President.'
        )
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="conae-panel rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-400/20 pb-4">
          <div className="flex items-center gap-3">
            <Crown className="w-7 h-7 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs text-amber-300 font-medium">
                {tr('Segurança Mensal & Senhas Individuais de Executivos', 'Monthly Security & Individual Executive Passwords')} ·{' '}
                {translateDynamic(vipPublic?.monthLabel || 'Novembro 2026')}
              </p>
              <h2 className="text-2xl font-bold text-white">
                {tr('Sala VIP de Investimento CONAE', 'CONAE VIP Investment Room')}
              </h2>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-300">
            {unlocked ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
            {unlocked ? tr('Acesso Liberado', 'Access Granted') : tr('Acesso Restrito por Senha', 'Password-Protected Access')}
          </span>
        </div>

        {!unlocked ? (
          <div className="max-w-lg mx-auto py-4 space-y-4">
            <div className="conae-panel-soft rounded-xl p-5 space-y-3 text-center">
              <KeyRound className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="text-lg font-semibold text-white">
                {tr('Digite sua Senha Executiva ou Senha Mensal VIP', 'Enter your Executive or Monthly VIP Password')}
              </h3>
              <p className="text-xs text-emerald-100/75 leading-relaxed">
                {tr(
                  'Cada executivo credenciado e acionista autorizado recebe sua senha de acesso diretamente do Presidente no Gerenciador de Senhas Administrativo, junto com o Cartão Dourado da Convenção.',
                  'Each accredited executive and authorized shareholder receives their access password directly from the President in the Admin Password Manager, along with the Convention Golden Card.'
                )}
              </p>

              <form onSubmit={handleVerifyPassword} className="space-y-3 pt-2">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={tr('Senha individual executivo ou mensal', 'Individual executive or monthly password')}
                  className="w-full rounded-lg bg-black/60 border border-amber-400/35 px-4 py-2.5 text-sm text-white text-center font-mono focus:outline-none focus:border-amber-400"
                />
                {errorMsg && <p className="text-xs text-red-300">{errorMsg}</p>}
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-semibold text-sm hover:from-amber-400 hover:to-amber-300 cursor-pointer"
                >
                  {tr('Desbloquear Sala VIP', 'Unlock VIP Room')}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Accredited Golden Executive Card inside VIP Room */}
            <div className="conae-gold-card rounded-xl p-5 text-amber-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={CONAE_ASSETS.emblemHeart}
                  alt={tr('CONAE Cartão Dourado', 'CONAE Golden Card')}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover border-2 border-amber-200 shrink-0"
                />
                <div>
                  <p className="text-xs font-mono text-amber-100/90">
                    {tr('CARTÃO DOURADO CREDENCIADO · CONVENÇÃO MUNDIAL CONAE', 'ACCREDITED GOLDEN CARD · CONAE WORLD CONVENTION')}
                  </p>
                  <h3 className="text-lg font-bold text-white">
                    {(unlockedExecutiveName || profile?.displayName || tr('Executivo CONAE', 'CONAE Executive')).toUpperCase()}
                  </h3>
                  <p className="text-xs text-amber-100/85">
                    {tr(
                      'Acesso VIP em Hotéis, Clínicas, Exames, Farmácias, Supermercados e Mesa Executiva',
                      'VIP access at Hotels, Clinics, Lab Exams, Pharmacies, Supermarkets & Executive Desk'
                    )}
                  </p>
                </div>
              </div>
              <span className="font-mono text-sm font-bold text-white shrink-0">
                {tr('CREDENCIAL OURO ATIVA', 'GOLD CREDENTIAL ACTIVE')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="conae-panel-soft rounded-xl p-4 space-y-1.5">
                <p className="text-xs text-amber-300 font-medium">
                  {tr('Indicativo Exclusivo Acionistas', 'Exclusive Shareholder Signal')}
                </p>
                <p className="text-base font-semibold text-white">
                  {translateDynamic(vipPublic?.buySignalTitle || 'Acumulação Estratégica Tesouro CONAE & Hotéis 5★')}
                </p>
                <p className="text-xs font-mono text-emerald-300">
                  {tr('Ativo:', 'Asset:')} {vipPublic?.buySignalAsset || 'CNEC / TESOURO'} · {tr('Alvo:', 'Target:')} R${' '}
                  {(vipPublic?.buySignalTargetBRL ?? 6.4).toFixed(2).replace('.', ',')}
                </p>
              </div>

              <div className="conae-panel-soft rounded-xl p-4 space-y-1.5">
                <p className="text-xs text-amber-300 font-medium">
                  {tr('Distribuição do Fundo Patrimonial', 'Equity Fund Allocation')}
                </p>
                <p className="text-sm text-white font-semibold">
                  {tr(
                    '45% Hotéis & Clubes · 30% Tesouro CNEC · 25% Reserva USD/CDB',
                    '45% Hotels & Clubs · 30% CNEC Treasury · 25% USD/CDB Reserve'
                  )}
                </p>
                <p className="text-xs text-emerald-100/70">
                  {tr('Rendimento distribuído mensalmente aos cotistas', 'Yield distributed monthly to shareholders')}
                </p>
              </div>

              <div className="conae-panel-soft rounded-xl p-4 space-y-2">
                <p className="text-xs text-amber-300 font-medium">
                  {tr('Mesa Diretora & Aporte Direto', 'Executive Board & Direct Deposit')}
                </p>
                <p className="text-xs text-emerald-100/80">
                  {tr(
                    'Solicite novas cotas patrimoniais com liberação imediata pela Presidência.',
                    'Request new equity quotas with immediate approval from the Presidency.'
                  )}
                </p>
                <button
                  type="button"
                  onClick={onGoToBank}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950 font-semibold text-xs cursor-pointer"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  {tr('Ir para Mesa de Cotas', 'Go to Quotas Desk')}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-black/40 border border-emerald-400/25 p-4 flex items-start gap-3 text-xs text-emerald-100/85">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold text-white">
                  {tr('Comunicado Executivo da Sala VIP', 'VIP Room Executive Notice')}
                </p>
                <p>
                  {tr(
                    'Todos os executivos e acionistas credenciados nesta sala possuem prioridade na reserva de suítes da Rede de Hotéis CONAE e participação nas atas mensais de expansão nacional e internacional.',
                    'All executives and shareholders accredited in this room hold priority suite bookings across the CONAE Hotel Network and participate in monthly national and international expansion minutes.'
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
