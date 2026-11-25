import React from 'react';

export const BRAZILIAN_STATE_NAMES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

interface BrazilStateFlagProps {
  uf: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const BrazilStateFlag: React.FC<BrazilStateFlagProps> = ({
  uf,
  size = 'sm',
  className = '',
}) => {
  const code = uf.toUpperCase();
  const dims =
    size === 'xs'
      ? 'w-4 h-3'
      : size === 'md'
      ? 'w-7 h-[19px]'
      : 'w-5 h-3.5';

  const renderArtwork = () => {
    switch (code) {
      case 'AC':
        return (
          <>
            <polygon points="0,0 24,0 0,16" fill="#facc15" />
            <polygon points="24,0 24,16 0,16" fill="#15803d" />
            <polygon points="4.5,1.5 5.2,3.4 7.2,3.4 5.6,4.5 6.2,6.4 4.5,5.3 2.8,6.4 3.4,4.5 1.8,3.4 3.8,3.4" fill="#dc2626" />
          </>
        );
      case 'AL':
        return (
          <>
            <rect x="0" y="0" width="8" height="16" fill="#dc2626" />
            <rect x="8" y="0" width="8" height="16" fill="#ffffff" />
            <rect x="16" y="0" width="8" height="16" fill="#1d4ed8" />
            <circle cx="12" cy="8" r="2.6" fill="#f59e0b" />
          </>
        );
      case 'AP':
        return (
          <>
            <rect x="0" y="0" width="24" height="5.4" fill="#1d4ed8" />
            <rect x="0" y="5.4" width="24" height="5.2" fill="#15803d" />
            <rect x="0" y="10.6" width="24" height="5.4" fill="#facc15" />
            <polygon points="0,0 8,8 0,16" fill="#111827" />
            <polygon points="1,2 6.8,8 1,14" fill="#15803d" />
          </>
        );
      case 'AM':
        return (
          <>
            <rect x="0" y="0" width="24" height="5.3" fill="#ffffff" />
            <rect x="0" y="5.3" width="24" height="5.4" fill="#dc2626" />
            <rect x="0" y="10.7" width="24" height="5.3" fill="#ffffff" />
            <rect x="0" y="0" width="11" height="10.7" fill="#1e3a8a" />
            <circle cx="5.5" cy="5.3" r="1.8" fill="#ffffff" />
          </>
        );
      case 'BA':
        return (
          <>
            <rect x="0" y="0" width="24" height="4" fill="#ffffff" />
            <rect x="0" y="4" width="24" height="4" fill="#dc2626" />
            <rect x="0" y="8" width="24" height="4" fill="#ffffff" />
            <rect x="0" y="12" width="24" height="4" fill="#dc2626" />
            <rect x="0" y="0" width="10" height="8" fill="#1e40af" />
            <polygon points="5,1.4 8.2,6.8 1.8,6.8" fill="#ffffff" />
          </>
        );
      case 'CE':
        return (
          <>
            <rect x="0" y="0" width="24" height="16" fill="#16a34a" />
            <polygon points="12,1.8 21.5,8 12,14.2 2.5,8" fill="#facc15" />
            <circle cx="12" cy="8" r="3.1" fill="#ffffff" />
            <circle cx="12" cy="8" r="1.4" fill="#16a34a" />
          </>
        );
      case 'DF':
        return (
          <>
            <rect x="0" y="0" width="24" height="16" fill="#ffffff" />
            <rect x="8.2" y="3.5" width="7.6" height="9" fill="#15803d" rx="0.5" />
            <polygon points="12,4.4 13.1,7.3 15.2,8 13.1,8.7 12,11.6 10.9,8.7 8.8,8 10.9,7.3" fill="#facc15" />
          </>
        );
      case 'ES':
        return (
          <>
            <rect x="0" y="0" width="24" height="5.3" fill="#38bdf8" />
            <rect x="0" y="5.3" width="24" height="5.4" fill="#ffffff" />
            <rect x="0" y="10.7" width="24" height="5.3" fill="#f472b6" />
            <circle cx="12" cy="8" r="1.4" fill="#1d4ed8" />
          </>
        );
      case 'GO':
        return (
          <>
            <rect x="0" y="0" width="24" height="4" fill="#16a34a" />
            <rect x="0" y="4" width="24" height="4" fill="#facc15" />
            <rect x="0" y="8" width="24" height="4" fill="#16a34a" />
            <rect x="0" y="12" width="24" height="4" fill="#facc15" />
            <rect x="0" y="0" width="10.5" height="8" fill="#1e3a8a" />
            <circle cx="5.2" cy="4" r="1" fill="#ffffff" />
            <circle cx="2.7" cy="2.2" r="0.6" fill="#ffffff" />
            <circle cx="7.7" cy="2.2" r="0.6" fill="#ffffff" />
            <circle cx="2.7" cy="5.8" r="0.6" fill="#ffffff" />
            <circle cx="7.7" cy="5.8" r="0.6" fill="#ffffff" />
          </>
        );
      case 'MA':
        return (
          <>
            <rect x="0" y="0" width="24" height="3.2" fill="#dc2626" />
            <rect x="0" y="3.2" width="24" height="3.2" fill="#ffffff" />
            <rect x="0" y="6.4" width="24" height="3.2" fill="#111827" />
            <rect x="0" y="9.6" width="24" height="3.2" fill="#ffffff" />
            <rect x="0" y="12.8" width="24" height="3.2" fill="#dc2626" />
            <rect x="0" y="0" width="9" height="8.5" fill="#1e3a8a" />
            <circle cx="4.5" cy="4.2" r="1.7" fill="#ffffff" />
          </>
        );
      case 'MT':
        return (
          <>
            <rect x="0" y="0" width="24" height="16" fill="#1d4ed8" />
            <polygon points="12,1.6 22,8 12,14.4 2,8" fill="#ffffff" />
            <circle cx="12" cy="8" r="3.4" fill="#15803d" />
            <circle cx="12" cy="8" r="1.4" fill="#facc15" />
          </>
        );
      case 'MS':
        return (
          <>
            <polygon points="0,0 14,0 0,14" fill="#ffffff" />
            <polygon points="14,0 24,0 24,16 0,16 0,14" fill="#38bdf8" />
            <polygon points="18,0 24,0 24,16 6,16" fill="#15803d" />
            <circle cx="19.5" cy="12" r="1.7" fill="#facc15" />
          </>
        );
      case 'MG':
        return (
          <>
            <rect x="0" y="0" width="24" height="16" fill="#ffffff" />
            <polygon points="12,3.2 17.5,12.8 6.5,12.8" fill="#dc2626" />
          </>
        );
      case 'PA':
        return (
          <>
            <rect x="0" y="0" width="24" height="16" fill="#dc2626" />
            <polygon points="0,0 5,0 24,13 24,16 19,16 0,3" fill="#ffffff" />
            <circle cx="12" cy="8" r="2.1" fill="#1d4ed8" />
          </>
        );
      case 'PB':
        return (
          <>
            <rect x="0" y="0" width="8.5" height="16" fill="#111827" />
            <rect x="8.5" y="0" width="15.5" height="16" fill="#dc2626" />
            <rect x="11" y="6.8" width="10" height="2.4" fill="#ffffff" rx="0.5" />
          </>
        );
      case 'PR':
        return (
          <>
            <rect x="0" y="0" width="24" height="16" fill="#15803d" />
            <polygon points="0,12 19,0 24,0 24,4 5,16 0,16" fill="#ffffff" />
            <circle cx="12" cy="8" r="3.4" fill="#1e40af" />
            <rect x="8.8" y="7.5" width="6.4" height="1" fill="#ffffff" />
          </>
        );
      case 'PE':
        return (
          <>
            <rect x="0" y="0" width="24" height="11" fill="#2563eb" />
            <rect x="0" y="11" width="24" height="5" fill="#ffffff" />
            <path d="M 5 11 A 7 7 0 0 1 19 11" fill="none" stroke="#facc15" strokeWidth="2" />
            <path d="M 7 11 A 5 5 0 0 1 17 11" fill="none" stroke="#dc2626" strokeWidth="1.2" />
            <circle cx="12" cy="3.5" r="1.4" fill="#facc15" />
            <rect x="11.3" y="12" width="1.4" height="3.2" fill="#dc2626" />
            <rect x="10.2" y="12.9" width="3.6" height="1.2" fill="#dc2626" />
          </>
        );
      case 'PI':
        return (
          <>
            <rect x="0" y="0" width="24" height="3.2" fill="#15803d" />
            <rect x="0" y="3.2" width="24" height="3.2" fill="#facc15" />
            <rect x="0" y="6.4" width="24" height="3.2" fill="#15803d" />
            <rect x="0" y="9.6" width="24" height="3.2" fill="#facc15" />
            <rect x="0" y="12.8" width="24" height="3.2" fill="#15803d" />
            <rect x="0" y="0" width="9.5" height="9.6" fill="#1e3a8a" />
            <circle cx="4.7" cy="4.8" r="1.8" fill="#ffffff" />
          </>
        );
      case 'RJ':
        return (
          <>
            <rect x="0" y="0" width="12" height="8" fill="#ffffff" />
            <rect x="12" y="0" width="12" height="8" fill="#38bdf8" />
            <rect x="0" y="8" width="12" height="8" fill="#38bdf8" />
            <rect x="12" y="8" width="12" height="8" fill="#ffffff" />
            <circle cx="12" cy="8" r="2.5" fill="#1e3a8a" stroke="#facc15" strokeWidth="0.7" />
          </>
        );
      case 'RN':
        return (
          <>
            <rect x="0" y="0" width="24" height="8" fill="#16a34a" />
            <rect x="0" y="8" width="24" height="8" fill="#ffffff" />
            <circle cx="12" cy="8" r="2.8" fill="#facc15" stroke="#15803d" strokeWidth="0.7" />
          </>
        );
      case 'RS':
        return (
          <>
            <polygon points="0,0 16,0 0,16" fill="#15803d" />
            <polygon points="16,0 24,0 24,6 6,16 0,16" fill="#dc2626" />
            <polygon points="24,6 24,16 6,16" fill="#facc15" />
            <circle cx="12" cy="8" r="2.2" fill="#ffffff" stroke="#15803d" strokeWidth="0.6" />
          </>
        );
      case 'RO':
        return (
          <>
            <rect x="0" y="0" width="24" height="9" fill="#1d4ed8" />
            <polygon points="0,16 12,8 24,16" fill="#15803d" />
            <polygon points="0,9 12,8 0,16" fill="#facc15" />
            <polygon points="24,9 12,8 24,16" fill="#facc15" />
            <circle cx="12" cy="5.5" r="2" fill="#ffffff" />
          </>
        );
      case 'RR':
        return (
          <>
            <polygon points="0,0 16,0 0,13" fill="#38bdf8" />
            <polygon points="16,0 24,0 24,16 0,16 0,13" fill="#ffffff" />
            <polygon points="24,4 24,16 8,16" fill="#15803d" />
            <rect x="0" y="11" width="24" height="1.5" fill="#dc2626" />
            <circle cx="12" cy="6.8" r="2" fill="#facc15" />
          </>
        );
      case 'SC':
        return (
          <>
            <rect x="0" y="0" width="24" height="5.3" fill="#dc2626" />
            <rect x="0" y="5.3" width="24" height="5.4" fill="#ffffff" />
            <rect x="0" y="10.7" width="24" height="5.3" fill="#dc2626" />
            <polygon points="12,3.5 16.5,8 12,12.5 7.5,8" fill="#15803d" />
            <circle cx="12" cy="8" r="1.4" fill="#facc15" />
          </>
        );
      case 'SP':
        return (
          <>
            <rect x="0" y="0" width="24" height="3.2" fill="#111827" />
            <rect x="0" y="3.2" width="24" height="3.2" fill="#ffffff" />
            <rect x="0" y="6.4" width="24" height="3.2" fill="#111827" />
            <rect x="0" y="9.6" width="24" height="3.2" fill="#ffffff" />
            <rect x="0" y="12.8" width="24" height="3.2" fill="#111827" />
            <rect x="0" y="0" width="9.5" height="6.4" fill="#dc2626" />
            <circle cx="4.7" cy="3.2" r="2.2" fill="#1d4ed8" />
          </>
        );
      case 'SE':
        return (
          <>
            <rect x="0" y="0" width="24" height="4" fill="#15803d" />
            <rect x="0" y="4" width="24" height="4" fill="#facc15" />
            <rect x="0" y="8" width="24" height="4" fill="#15803d" />
            <rect x="0" y="12" width="24" height="4" fill="#facc15" />
            <rect x="0" y="0" width="9.5" height="8" fill="#1e3a8a" />
            <circle cx="4.7" cy="4" r="1.2" fill="#ffffff" />
          </>
        );
      case 'TO':
      default:
        return (
          <>
            <polygon points="0,0 16,0 0,16" fill="#2563eb" />
            <polygon points="16,0 24,0 24,4 4,16 0,16" fill="#ffffff" />
            <polygon points="24,4 24,16 4,16" fill="#facc15" />
            <circle cx="12" cy="8" r="2.1" fill="#f59e0b" />
          </>
        );
    }
  };

  return (
    <svg
      viewBox="0 0 24 16"
      aria-label={`Bandeira ${BRAZILIAN_STATE_NAMES[code] || code}`}
      className={`${dims} rounded-[2px] border border-amber-300/45 shadow-sm shrink-0 ${className}`}
    >
      {renderArtwork()}
    </svg>
  );
};
