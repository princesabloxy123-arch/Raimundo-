import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { tr } = useLanguage();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed top-3 right-3 z-[80] flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-neutral-950 shadow-xl border border-yellow-200"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>{tr('Modo Offline — Usando dados em cache.', 'Offline Mode — Using cached data.')}</span>
    </div>
  );
};
