import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'Ocorreu um erro inesperado na plataforma CONAE.',
    };
  }

  render() {
    if (this.state.hasError) {
      let isEn = false;
      try {
        isEn = window.localStorage.getItem('conae_lang') === 'en';
      } catch {
        isEn = false;
      }
      let friendly = this.state.message;
      if (friendly.includes('Missing or insufficient permissions') || friendly.includes('PERMISSION_DENIED')) {
        friendly = isEn
          ? 'Insufficient permission for this CONAE database operation. Please sign in with your verified account or request access from the Executive Board.'
          : 'Permissão insuficiente para esta operação no banco CONAE. Verifique se está conectado com sua conta verificada ou solicite acesso à Mesa Diretora Executiva.';
      }
      return (
        <div className="min-h-screen bg-[#050907] text-emerald-50 flex items-center justify-center p-6">
          <div className="conae-panel max-w-lg w-full rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-xl font-semibold">
                {isEn ? 'CONAE System Notice' : 'Aviso do Sistema CONAE'}
              </h2>
            </div>
            <p className="text-sm text-emerald-100/80 leading-relaxed break-words">{friendly}</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-neutral-950 font-semibold text-sm hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              {isEn ? 'Try again' : 'Tentar novamente'}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
