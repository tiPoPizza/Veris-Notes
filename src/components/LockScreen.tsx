import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { isLightColor, hexToRgba } from '../themes';
import { Lock, Delete, ArrowRight, AlertTriangle, RefreshCw, X, ShieldAlert } from 'lucide-react';

export const LockScreen: React.FC = () => {
  const { theme, unlockApp, resetAllData, appLockoutUntil } = useApp();
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetInput, setResetInput] = useState<string>('');
  const [remainingLockout, setRemainingLockout] = useState<number>(0);

  const isLight = isLightColor(theme.bg);
  const accentTextColor = isLightColor(theme.accent) ? '#000000' : '#FFFFFF';

  // Lockout countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      if (appLockoutUntil && appLockoutUntil > now) {
        setRemainingLockout(Math.ceil((appLockoutUntil - now) / 1000));
      } else {
        setRemainingLockout(0);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [appLockoutUntil]);

  const isLockedOut = remainingLockout > 0;

  const handleDigit = useCallback((digit: string) => {
    if (isLockedOut) return;
    setErrorText(null);
    setEnteredPin(prev => {
      if (prev.length < 12) {
        return prev + digit;
      }
      return prev;
    });
  }, [isLockedOut]);

  const handleBackspace = useCallback(() => {
    if (isLockedOut) return;
    setErrorText(null);
    setEnteredPin(prev => prev.slice(0, -1));
  }, [isLockedOut]);

  const handleSubmit = useCallback(() => {
    if (!enteredPin || isLockedOut) return;
    const result = unlockApp(enteredPin);
    if (!result.success) {
      setErrorText(result.error || 'Неверный пин-код');
      setIsShaking(true);
      if (navigator.vibrate) {
        try {
          navigator.vibrate(200);
        } catch {}
      }
      setTimeout(() => {
        setEnteredPin('');
        setIsShaking(false);
      }, 500);
    }
  }, [enteredPin, unlockApp, isLockedOut]);

  // Physical keyboard listener
  useEffect(() => {
    if (isResetModalOpen || isLockedOut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleBackspace, handleSubmit, isResetModalOpen, isLockedOut]);

  const formatLockout = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const cardBg = isLight ? 'rgba(255, 255, 255, 0.75)' : 'rgba(28, 28, 30, 0.75)';
  const cardBorder = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)';
  const keyBg = isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';
  const keyHoverBg = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)';

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-hidden"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
      }}
    >
      {/* Top spacer / subtle branding icon */}
      <div className="w-full flex justify-center pt-4 sm:pt-8">
        <div
          className="w-14 h-14 rounded-3xl flex items-center justify-center border shadow-sm transition-all duration-300"
          style={{
            backgroundColor: hexToRgba(theme.accent, isLight ? 0.12 : 0.18),
            borderColor: hexToRgba(theme.accent, 0.3),
            color: theme.accent,
          }}
        >
          <Lock size={26} strokeWidth={2.2} />
        </div>
      </div>

      {/* Center PIN block */}
      <div className="w-full max-w-xs flex flex-col items-center my-auto">
        <h1 className="text-xl font-bold tracking-tight mb-2 opacity-90 text-center">
          Введите пин-код
        </h1>

        {/* Lockout Warning or Dynamic PIN Indicator Dots */}
        {isLockedOut ? (
          <div
            className="flex flex-col items-center justify-center p-4 my-3 rounded-2xl border text-center w-full animate-fade-in"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: '#EF4444',
            }}
          >
            <ShieldAlert size={26} className="mb-1 animate-pulse" />
            <p className="text-xs font-bold">Слишком много неверных попыток</p>
            <p className="text-sm font-black tracking-widest mt-1">
              Повторите через {formatLockout(remainingLockout)}
            </p>
          </div>
        ) : (
          <>
            <div
              className={`flex items-center justify-center gap-2.5 h-10 my-4 transition-transform ${
                isShaking ? 'animate-shake' : ''
              }`}
            >
              {enteredPin.length === 0 ? (
                <span className="text-xs font-medium opacity-40">от 1 до 12 цифр</span>
              ) : (
                Array.from({ length: enteredPin.length }).map((_, i) => (
                  <div
                    key={i}
                    className="w-3.5 h-3.5 rounded-full transition-all duration-200"
                    style={{
                      backgroundColor: errorText ? '#EF4444' : theme.accent,
                      boxShadow: `0 0 10px ${errorText ? '#EF444488' : hexToRgba(theme.accent, 0.5)}`,
                      transform: 'scale(1.1)',
                    }}
                  />
                ))
              )}
            </div>

            {errorText && (
              <p className="text-xs font-semibold text-red-500 mb-2 animate-fade-in text-center px-2">
                {errorText}
              </p>
            )}
          </>
        )}

        {/* Android 17 Minimalist Numpad */}
        <div className={`grid grid-cols-3 gap-3.5 w-full mt-2 transition-opacity ${isLockedOut ? 'opacity-30 pointer-events-none' : ''}`}>
          {keys.map(digit => (
            <button
              key={digit}
              type="button"
              disabled={isLockedOut}
              onClick={() => handleDigit(digit)}
              className="h-16 rounded-3xl text-2xl font-semibold flex items-center justify-center transition-all duration-150 active:scale-90 border cursor-pointer select-none"
              style={{
                backgroundColor: keyBg,
                borderColor: cardBorder,
                color: theme.text,
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = keyHoverBg)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = keyBg)}
            >
              {digit}
            </button>
          ))}

          {/* Row 4: Backspace, 0, Enter */}
          <button
            type="button"
            disabled={isLockedOut || enteredPin.length === 0}
            onClick={handleBackspace}
            className={`h-16 rounded-3xl flex items-center justify-center transition-all duration-150 active:scale-90 border cursor-pointer select-none ${
              enteredPin.length === 0 || isLockedOut ? 'opacity-30 cursor-default' : ''
            }`}
            style={{
              backgroundColor: keyBg,
              borderColor: cardBorder,
              color: theme.text,
            }}
            title="Удалить"
          >
            <Delete size={22} />
          </button>

          <button
            type="button"
            disabled={isLockedOut}
            onClick={() => handleDigit('0')}
            className="h-16 rounded-3xl text-2xl font-semibold flex items-center justify-center transition-all duration-150 active:scale-90 border cursor-pointer select-none"
            style={{
              backgroundColor: keyBg,
              borderColor: cardBorder,
              color: theme.text,
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = keyHoverBg)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = keyBg)}
          >
            0
          </button>

          <button
            type="button"
            disabled={isLockedOut || enteredPin.length === 0}
            onClick={handleSubmit}
            className={`h-16 rounded-3xl flex items-center justify-center transition-all duration-150 active:scale-90 border cursor-pointer select-none shadow-md ${
              enteredPin.length === 0 || isLockedOut ? 'opacity-35 cursor-default' : ''
            }`}
            style={{
              backgroundColor: enteredPin.length > 0 && !isLockedOut ? theme.accent : keyBg,
              borderColor: enteredPin.length > 0 && !isLockedOut ? theme.accent : cardBorder,
              color: enteredPin.length > 0 && !isLockedOut ? accentTextColor : theme.text,
            }}
            title="Войти"
          >
            <ArrowRight size={22} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Bottom Footer: Forgot PIN link */}
      <div className="w-full flex justify-center pb-4">
        <button
          type="button"
          onClick={() => {
            setIsResetModalOpen(true);
            setResetInput('');
          }}
          className="text-xs font-medium opacity-60 hover:opacity-100 transition cursor-pointer py-2 px-4 rounded-xl hover:bg-white/5 active:scale-95"
        >
          Забыли пин-код?
        </button>
      </div>

      {/* Reset Data Modal (when forgot PIN) */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-sm rounded-3xl border p-6 shadow-2xl space-y-4"
            style={{
              backgroundColor: isLight ? '#FFFFFF' : '#1C1C1E',
              borderColor: cardBorder,
              color: theme.text,
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: cardBorder }}>
              <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
                <AlertTriangle size={18} />
                <span>Сброс всех данных</span>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                style={{ color: theme.text }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed opacity-85">
              <p>
                Если вы забыли пин-код, восстановить доступ можно только путем полного сброса всех данных.
              </p>
              <p className="font-semibold text-red-400">
                Все заметки, задачи и настройки будут удалены без возможности восстановления.
              </p>
              <p className="pt-1 font-semibold opacity-90">
                Для подтверждения введите <span className="font-black text-amber-400 select-all tracking-wide">Veris</span>:
              </p>
              <input
                type="text"
                value={resetInput}
                onChange={e => setResetInput(e.target.value)}
                placeholder="Veris"
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold bg-transparent outline-none focus:ring-2 focus:ring-red-500/50 transition"
                style={{
                  borderColor: cardBorder,
                  color: theme.text,
                  backgroundColor: hexToRgba(theme.text, 0.05),
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && resetInput.trim().toLowerCase() === 'veris') {
                    resetAllData();
                    setIsResetModalOpen(false);
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border font-bold text-xs hover:bg-white/10 active:scale-95 transition cursor-pointer"
                style={{ borderColor: cardBorder, color: theme.text }}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={resetInput.trim().toLowerCase() !== 'veris'}
                onClick={() => {
                  if (resetInput.trim().toLowerCase() === 'veris') {
                    resetAllData();
                    setIsResetModalOpen(false);
                  }
                }}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                  resetInput.trim().toLowerCase() === 'veris'
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg active:scale-95'
                    : 'opacity-40 cursor-not-allowed bg-red-600/30 text-red-200'
                }`}
              >
                <RefreshCw size={13} />
                <span>Подтверждаю сброс</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
