import React, { useEffect, useState } from 'react';
import { X, Copy, Check, ShieldCheck, Mail, UserCheck } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export const SAMUEL_EXECUTIVE_PIX = {
  id: 'pix_samuel_inter',
  executiveName: 'Executivo Samuel',
  executiveRole: 'Executivo CONAE',
  bankName: 'PIX CPF',
  pixKeyDisplay: '330.048.558-44',
  pixKeyCopy: '33004855844',
  pixType: 'CPF' as const,
  city: 'Aparecida de Goiania',
  active: true,
};

interface PixInterModalProps {
  isOpen: boolean;
  onClose: () => void;
  amountBRL: number;
  title: string;
  userName: string;
  defaultEmail?: string;
  onConfirmRequest: (contactEmail: string) => Promise<void>;
  submitting: boolean;
}

export const PixInterModal: React.FC<PixInterModalProps> = ({
  isOpen,
  onClose,
  amountBRL,
  title,
  userName,
  defaultEmail = '',
  onConfirmRequest,
  submitting,
}) => {
  const { tr, translateDynamic } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [contactEmail, setContactEmail] = useState(defaultEmail);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setContactEmail((prev) => prev || defaultEmail || '');
      setEmailError(null);
    }
  }, [isOpen, defaultEmail]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SAMUEL_EXECUTIVE_PIX.pixKeyCopy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Ignore clipboard errors in restricted frames
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = contactEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError(
        tr(
          'Informe um e-mail válido para receber o cartão dos hotéis.',
          'Please enter a valid email address to receive your hotel card.'
        )
      );
      return;
    }
    setEmailError(null);
    await onConfirmRequest(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="conae-panel max-w-md w-full rounded-xl p-5 sm:p-6 space-y-4 my-auto border border-amber-400/45"
      >
        <div className="flex items-start justify-between gap-3 border-b border-amber-400/20 pb-3">
          <div className="min-w-0">
            <p className="text-xs text-amber-300 font-semibold">
              {tr('Checkout PIX · Executivo Samuel', 'PIX Checkout · Executive Samuel')}
            </p>
            <h3 className="text-lg font-bold text-white leading-snug">
              {translateDynamic(title)}
            </h3>
            <p className="text-xs text-emerald-100/80 mt-0.5">
              {tr('Filiado:', 'Affiliate:')} <strong className="text-white">{userName}</strong> ·{' '}
              {tr('Valor:', 'Amount:')}{' '}
              <span className="font-mono tabular-nums text-amber-300 font-bold">
                R$ {amountBRL.toFixed(2).replace('.', ',')}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tr('Fechar checkout PIX', 'Close PIX checkout')}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Exclusive PIX CPF Executivo Samuel Card */}
        <div className="rounded-xl bg-black/50 border border-amber-400/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{tr('PIX Oficial · Executivo Samuel', 'Official PIX · Executive Samuel')}</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-400/40 text-[10px] font-mono font-semibold text-emerald-300">
              CPF
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-950/50 border border-amber-400/30 px-3 py-2.5">
            <div className="min-w-0">
              <span className="block text-[10px] uppercase tracking-wide text-emerald-200/75">
                {tr('Chave PIX (CPF)', 'PIX Key (CPF)')}
              </span>
              <span className="block text-base sm:text-lg font-mono tabular-nums font-bold text-white tracking-wider">
                {SAMUEL_EXECUTIVE_PIX.pixKeyDisplay}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? tr('Copiado!', 'Copied!') : tr('Copiar CPF', 'Copy CPF')}</span>
            </button>
          </div>
        </div>

        {/* Access & Hotel Card by Email Notice */}
        <div className="p-3 rounded-lg bg-emerald-950/65 border border-emerald-500/30 text-xs text-emerald-100/90 flex items-start gap-2.5 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            {tr(
              'Após a confirmação do PIX, o seu acesso será liberado pelo Executivo Samuel e o Cartão para os Hotéis será enviado diretamente no seu e-mail informado abaixo.',
              'After PIX confirmation, your access will be unlocked by Executive Samuel and your Hotel Card will be sent directly to the email address entered below.'
            )}
          </span>
        </div>

        {/* Contact Email Input for Hotel Card Delivery */}
        <div className="space-y-1.5">
          <label
            htmlFor="checkout_hotel_card_email"
            className="block text-xs font-semibold text-amber-200"
          >
            {tr('Seu E-mail para Receber o Cartão dos Hotéis', 'Your Email to Receive the Hotel Card')} *
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="checkout_hotel_card_email"
              type="email"
              required
              value={contactEmail}
              onChange={(e) => {
                setContactEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              placeholder={tr('Digite seu melhor e-mail...', 'Enter your email address...')}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black/60 border border-amber-400/40 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-amber-400"
            />
          </div>
          {emailError && (
            <p className="text-[11px] text-amber-300 font-medium">{emailError}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-bold text-sm hover:from-amber-400 hover:to-amber-300 transition-colors cursor-pointer disabled:opacity-50"
        >
          {submitting
            ? tr('Enviando solicitação...', 'Submitting request...')
            : tr('Enviar Solicitação ao Executivo Samuel', 'Send Request to Executive Samuel')}
        </button>
      </form>
    </div>
  );
};
