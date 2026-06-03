/**
 * PinLock.tsx
 * المسار: artifacts/rehab-db/src/components/PinLock.tsx
 *
 * شاشة قفل PIN تظهر فوق التطبيق لما يكون مقفل
 */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/i18n';
import { LogOut, Delete } from 'lucide-react';

export default function PinLock() {
  const { unlockWithPin, logout, currentUser } = useAuth();
  const { language } = useLanguage();
  const [pin, setPin]         = useState('');
  const [error, setError]     = useState(false);
  const [shake, setShake]     = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAr = language === 'ar';

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      setTimeout(() => tryUnlock(next), 80);
    }
  };

  const handleDelete = () => {
    setPin(p => p.slice(0, -1));
    setError(false);
  };

  const tryUnlock = (p: string) => {
    const ok = unlockWithPin(p);
    if (!ok) {
      setAttempts(a => a + 1);
      setError(true);
      setShake(true);
      setPin('');
      setTimeout(() => setShake(false), 500);
    }
  };

  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length);

  const buttons = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['',  '0', 'del'],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Hidden input for keyboard support */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        className="opacity-0 absolute w-0 h-0"
        value={pin}
        onChange={e => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
          setPin(val);
          setError(false);
          if (val.length === 4) setTimeout(() => tryUnlock(val), 80);
        }}
      />

      {/* User info */}
      <div className="mb-8 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <span className="text-xl font-bold text-primary">
            {currentUser?.fullName?.charAt(0) ?? '?'}
          </span>
        </div>
        <p className="text-sm font-medium text-foreground">{currentUser?.fullName}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isAr ? 'أدخل رمز PIN للمتابعة' : 'Enter PIN to continue'}
        </p>
      </div>

      {/* PIN dots */}
      <div className={`flex gap-4 mb-2 ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
        {dots.map((filled, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
              filled
                ? 'bg-primary border-primary scale-110'
                : 'bg-transparent border-muted-foreground/40'
            }`}
          />
        ))}
      </div>

      {/* Error message */}
      <div className="h-5 mb-6">
        {error && (
          <p className="text-xs text-destructive text-center animate-in fade-in">
            {isAr
              ? `رمز PIN غير صحيح${attempts >= 3 ? ` (${attempts} محاولات)` : ''}`
              : `Incorrect PIN${attempts >= 3 ? ` (${attempts} attempts)` : ''}`}
          </p>
        )}
      </div>

      {/* Numpad */}
      <div className="grid grid-rows-4 gap-3">
        {buttons.map((row, ri) => (
          <div key={ri} className="flex gap-3 justify-center">
            {row.map((btn, bi) => {
              if (btn === '') return <div key={bi} className="w-16 h-16" />;
              if (btn === 'del') return (
                <button
                  key={bi}
                  onClick={handleDelete}
                  disabled={pin.length === 0}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-muted active:scale-95 transition-all disabled:opacity-30"
                >
                  <Delete className="w-5 h-5" />
                </button>
              );
              return (
                <button
                  key={bi}
                  onClick={() => handleDigit(btn)}
                  disabled={pin.length >= 4}
                  className="w-16 h-16 rounded-2xl bg-card border border-border text-lg font-semibold hover:bg-muted active:scale-95 transition-all shadow-sm disabled:opacity-50"
                >
                  {btn}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Logout fallback */}
      <button
        onClick={logout}
        className="mt-10 flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        {isAr ? 'تسجيل الخروج' : 'Sign out'}
      </button>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
