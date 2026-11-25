import React, { useState } from 'react';
import { CreditCard, Eye, EyeOff, Lock, ShieldCheck, Copy, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import type { UserProfile } from '../types';

interface VirtualCardProps {
  profile: UserProfile | null;
  hasPendingOrder?: boolean;
  onRequestPackage?: () => void;
}

export const VirtualCard: React.FC<VirtualCardProps> = ({
  profile,
  hasPendingOrder = false,
  onRequestPackage,
}) => {
  const { tr, translateDynamic } = useLanguage();
  const [showSensitive, setShowSensitive] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const isUnlocked = Boolean(profile?.virtualCardActive);
  const isGoldExecutive = Boolean(profile?.executiveCardActive) || profile?.role === 'executive' || profile?.role === 'president';
  const cardNum = profile?.cardNumber || '4916 2091 8840 1026';
  const maskedNum = `4916 •••• •••• ${cardNum.slice(-4)}`;
  const holderName = (profile?.displayName || tr('FILIADO CONAE BRASIL', 'CONAE BRAZIL AFFILIATE')).toUpperCase();
  const tier = translateDynamic(profile?.vipTier || 'Padrao');
  const token = profile?.bankToken || `cnae_tok_${(profile?.uid || 'guest2091').slice(0, 12)}`;

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 1800);
    } catch {
      // clipboard fallback ignored cleanly
    }
  };

  return (
    <div className="conae-panel rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-amber-300/90 font-medium">
            {isGoldExecutive
              ? tr('Cartão Dourado Executivo & Credencial VIP', 'Executive Golden Card & VIP Credential')
              : tr('Cartão Bancário & Credencial VIP', 'Bank Card & VIP Credential')}
          </p>
          <h3 className="text-lg font-semibold text-white">
            {isGoldExecutive
              ? tr('Cartão Dourado CONAE Bank', 'CONAE Bank Golden Card')
              : tr('Cartão Virtual CONAE Bank', 'CONAE Bank Virtual Card')}
          </h3>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
            isGoldExecutive
              ? 'bg-amber-500/20 text-amber-200 border-amber-400'
              : isUnlocked
              ? 'bg-emerald-900/60 text-emerald-300 border-emerald-400/40'
              : 'bg-amber-950/60 text-amber-300 border-amber-400/35'
          }`}
        >
          {isGoldExecutive
            ? tr(`Dourado Executivo · ${tier}`, `Executive Gold · ${tier}`)
            : isUnlocked
            ? tr(`Ativo · Nível ${tier}`, `Active · ${tier} Tier`)
            : hasPendingOrder
            ? tr('Aguardando Aprovação Executiva', 'Awaiting Executive Approval')
            : tr('Bloqueado', 'Locked')}
        </span>
      </div>

      {/* Physical/Virtual Card Visual */}
      <div
        className={`relative rounded-xl p-5 overflow-hidden border transition-all ${
          isGoldExecutive
            ? 'conae-gold-card'
            : isUnlocked
            ? 'bg-gradient-to-br from-[#0d3b29] via-[#061f16] to-[#020806] border-amber-400/60'
            : 'bg-gradient-to-br from-[#0b1f18] via-[#07110d] to-[#040706] border-amber-500/25'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-300" />
            <span className="text-xs font-semibold tracking-wider text-amber-200">
              {isGoldExecutive
                ? tr('CONAE GOLD EXECUTIVO · CNEC', 'CONAE EXECUTIVE GOLD · CNEC')
                : 'CONAE BANK · CNEC'}
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-100/85">
            {tr('Hotéis · Farmácias · Clubes', 'Hotels · Pharmacies · Clubs')}
          </span>
        </div>

        <div className="my-5">
          <p className="font-mono text-lg sm:text-xl tracking-widest text-white tabular-nums">
            {isUnlocked ? (showSensitive ? cardNum : maskedNum) : '•••• •••• •••• ••••'}
          </p>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] text-emerald-200/60">{tr('Titular Conveniado', 'Member Cardholder')}</p>
            <p className="text-xs sm:text-sm font-semibold text-amber-100 truncate">{holderName}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] text-emerald-200/60">{tr('Validade · CVV', 'Expires · CVV')}</p>
            <p className="text-xs font-mono text-white tabular-nums">
              {isUnlocked ? (showSensitive ? '12/30 · 791' : '12/30 · •••') : '--/-- · •••'}
            </p>
          </div>
        </div>

        {!isUnlocked && (
          <div className="mt-4 pt-3 border-t border-amber-400/20 flex items-start gap-2.5 text-xs text-amber-200/90">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              {hasPendingOrder
                ? tr(
                    'Sua solicitação de pacote foi enviada à Presidência e Executivos. Assim que o PIX for confirmado no Painel Administrativo, seu Cartão Virtual será liberado automaticamente.',
                    'Your package request was sent to the Presidency and Executives. As soon as PIX is confirmed in the Admin Panel, your Virtual Card will be unlocked automatically.'
                  )
                : tr(
                    'Solicite um pacote de investimento ou assinatura mensal para liberar seu Cartão Virtual após confirmação executiva.',
                    'Request an investment package or monthly subscription to unlock your Virtual Card after executive confirmation.'
                  )}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {isUnlocked ? (
          <>
            <button
              type="button"
              onClick={() => setShowSensitive((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 border border-amber-400/30 text-emerald-100 hover:text-white cursor-pointer"
            >
              {showSensitive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showSensitive ? tr('Ocultar dados', 'Hide details') : tr('Mostrar número e CVV', 'Show number & CVV')}
            </button>
            <button
              type="button"
              onClick={handleCopyToken}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-400/30 text-emerald-200 hover:text-white cursor-pointer font-mono"
            >
              {copiedToken ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedToken ? tr('Token copiado', 'Token copied') : `Token: ${token.slice(0, 14)}...`}
            </button>
          </>
        ) : (
          <div className="w-full flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-emerald-200/75">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              {tr('Liberação mediante confirmação da Diretoria', 'Unlocked upon Board confirmation')}
            </span>
            {onRequestPackage && (
              <button
                type="button"
                onClick={onRequestPackage}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-neutral-950 font-semibold hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap"
              >
                {tr('Solicitar Pacote', 'Request Package')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
