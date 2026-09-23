import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
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

  if (isOnline) return null;

  return (
    <div className="fixed top-3 left-4 right-4 z-50 flex items-center justify-center gap-2 rounded-2xl bg-amber-500/90 backdrop-blur-md px-4 py-2 text-xs font-medium text-slate-950 shadow-lg animate-bounce">
      <WifiOff className="w-4 h-4 text-slate-950" />
      <span>حالت آفلاین — برنامه به طور کامل در حافظه گوشی کار می‌کند.</span>
    </div>
  );
};
