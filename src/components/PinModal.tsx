import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { isLightColor, hexToRgba } from '../themes';
import { Lock, KeyRound, Delete, ArrowRight, X, Check, ShieldAlert } from 'lucide-react';
import { PinTarget } from '../types';

export type PinModalMode = 'set' | 'change' | 'disable';

interface PinModalProps {
  mode: PinModalMode;
  target?: PinTarget;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({ mode, target = 'app', onClose, onSuccess }) => {
  const {
    theme,
    appPin,
    setAppPin,
    removeAppPin,
    privatePin,
    setPrivatePin,
    removePrivatePin,
  } = useApp();

  const activePin = target === 'private' ? privatePin : appPin;
  const savePin = target === 'private' ? setPrivatePin : setAppPin;
  const deletePin = target === 'private' ? removePrivatePin : removeAppPin;

  // Steps:
  // 'set': step 1 (enter new) -> step 2 (repeat new)
  // 'change': step 1 (enter current) -> step 2 (enter new) -> step 3 (repeat new)
  // 'disable': step 1 (enter current)
  const [step, setStep] = useState<number>(1);
  const [enteredCurrent, setEnteredCurrent] = useState<string>('');
  const [enteredNew, setEnteredNew] = useState<string>('');
  const [enteredRepeat, setEnteredRepeat] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const isLight = isLightColor(theme.bg);
  const accentTextColor = isLightColor(theme.accent) ? '#000000' : '#FFFFFF';

  const cardBorder = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)';
  const keyBg = isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';
  const keyHoverBg = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)';

  // Determine current active input value
  const getCurrentInput = () => {
    if (mode === 'set') {
      return step === 1 ? enteredNew : enteredRepeat;
    }
    if (mode === 'change') {
      if (step === 1) return enteredCurrent;
      if (step === 2) return enteredNew;
      return enteredRepeat;
    }
    // disable
    return enteredCurrent;
  };

  const currentVal = getCurrentInput();

  const handleDigit = useCallback((digit: string) => {
    setError(null);
    if (mode === 'set') {
      if (step === 1) {
        setEnteredNew(prev => (prev.length < 12 ? prev + digit : prev));
      } else {
        setEnteredRepeat(prev => (prev.length < 12 ? prev + digit : prev));
      }
    } else if (mode === 'change') {
      if (step === 1) {
        setEnteredCurrent(prev => (prev.length < 12 ? prev + digit : prev));
      } else if (step === 2) {
        setEnteredNew(prev => (prev.length < 12 ? prev + digit : prev));
      } else {
        setEnteredRepeat(prev => (prev.length < 12 ? prev + digit : prev));
      }
    } else if (mode === 'disable') {
      setEnteredCurrent(prev => (prev.length < 12 ? prev + digit : prev));
    }
  }, [mode, step]);

  const handleBackspace = useCallback(() => {
    setError(null);
    if (mode === 'set') {
      if (step === 1) setEnteredNew(prev => prev.slice(0, -1));
      else setEnteredRepeat(prev => prev.slice(0, -1));
    } else if (mode === 'change') {
      if (step === 1) setEnteredCurrent(prev => prev.slice(0, -1));
      else if (step === 2) setEnteredNew(prev => prev.slice(0, -1));
      else setEnteredRepeat(prev => prev.slice(0, -1));
    } else if (mode === 'disable') {
      setEnteredCurrent(prev => prev.slice(0, -1));
    }
  }, [mode, step]);

  const handleNext = useCallback(() => {
    if (mode === 'set') {
      if (step === 1) {
        if (enteredNew.length < 1) {
          setError('Введите от 1 до 12 цифр');
          return;
        }
        setStep(2);
        setError(null);
      } else if (step === 2) {
        if (enteredRepeat !== enteredNew) {
          setError('Пин-коды не совпадают');
          setEnteredRepeat('');
          return;
        }
        savePin(enteredNew);
        onSuccess?.();
        onClose();
      }
    } else if (mode === 'change') {
      if (step === 1) {
        if (enteredCurrent !== activePin) {
          setError('Неверный текущий пин-код');
          setEnteredCurrent('');
          return;
        }
        setStep(2);
        setError(null);
      } else if (step === 2) {
        if (enteredNew.length < 1) {
          setError('Введите от 1 до 12 цифр');
          return;
        }
        setStep(3);
        setError(null);
      } else if (step === 3) {
        if (enteredRepeat !== enteredNew) {
          setError('Пин-коды не совпадают');
          setEnteredRepeat('');
          return;
        }
        savePin(enteredNew);
        onSuccess?.();
        onClose();
      }
    } else if (mode === 'disable') {
      if (enteredCurrent !== activePin) {
        setError('Неверный текущий пин-код');
        setEnteredCurrent('');
        return;
      }
      deletePin();
      onSuccess?.();
      onClose();
    }
  }, [mode, step, enteredNew, enteredRepeat, enteredCurrent, activePin, savePin, deletePin, onSuccess, onClose]);

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleBackspace, handleNext, onClose]);

  const getTitle = () => {
    if (mode === 'set') {
      return step === 1 ? 'Новый пин-код' : 'Повторите пин-код';
    }
    if (mode === 'change') {
      if (step === 1) return 'Текущий пин-код';
      if (step === 2) return 'Новый пин-код';
      return 'Повторите пин-код';
    }
    return 'Введите текущий пин-код';
  };

  const getSubtitle = () => {
    if (mode === 'set') {
      return step === 1 ? 'от 1 до 12 цифр' : 'для подтверждения';
    }
    if (mode === 'change') {
      if (step === 1) return 'для подтверждения личности';
      if (step === 2) return 'от 1 до 12 цифр';
      return 'для подтверждения';
    }
    return 'для отключения защиты';
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in select-none">
      <div
        className="w-full max-w-xs rounded-3xl border p-6 shadow-2xl flex flex-col items-center relative"
        style={{
          backgroundColor: isLight ? '#FFFFFF' : '#1C1C1E',
          borderColor: cardBorder,
          color: theme.text,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 active:scale-90 transition cursor-pointer"
          style={{ color: theme.text }}
          title="Закрыть"
        >
          <X size={18} />
        </button>

        {/* Top Icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 mt-1"
          style={{
            backgroundColor: hexToRgba(theme.accent, isLight ? 0.12 : 0.18),
            color: theme.accent,
          }}
        >
          {mode === 'disable' ? <ShieldAlert size={22} /> : <KeyRound size={22} />}
        </div>

        {/* Target Badge */}
        <div
          className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-2"
          style={{
            backgroundColor: hexToRgba(theme.accent, 0.15),
            color: theme.accent,
          }}
        >
          {target === 'private' ? 'Приватное пространство' : 'Блокировка входа'}
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold tracking-tight text-center">
          {getTitle()}
        </h2>
        <p className="text-xs opacity-50 text-center mt-0.5 mb-3">
          {getSubtitle()}
        </p>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 h-8 my-2">
          {currentVal.length === 0 ? (
            <div className="h-1.5 w-12 rounded-full opacity-20 bg-current" />
          ) : (
            Array.from({ length: currentVal.length }).map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full transition-all duration-150"
                style={{
                  backgroundColor: error ? '#EF4444' : theme.accent,
                  boxShadow: `0 0 8px ${error ? '#EF444466' : hexToRgba(theme.accent, 0.4)}`,
                }}
              />
            ))
          )}
        </div>

        {/* Error message */}
        {error ? (
          <p className="text-xs font-semibold text-red-500 h-5 text-center animate-fade-in">
            {error}
          </p>
        ) : (
          <div className="h-5" />
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2.5 w-full mt-1">
          {keys.map(digit => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-13 rounded-2xl text-xl font-semibold flex items-center justify-center transition-all duration-150 active:scale-90 border cursor-pointer select-none"
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

          {/* Row 4: Backspace, 0, Next */}
          <button
            type="button"
            onClick={handleBackspace}
            disabled={currentVal.length === 0}
            className={`h-13 rounded-2xl flex items-center justify-center transition-all duration-150 active:scale-90 border cursor-pointer select-none ${
              currentVal.length === 0 ? 'opacity-30 cursor-default' : ''
            }`}
            style={{
              backgroundColor: keyBg,
              borderColor: cardBorder,
              color: theme.text,
            }}
            title="Удалить"
          >
            <Delete size={20} />
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-13 rounded-2xl text-xl font-semibold flex items-center justify-center transition-all duration-150 active:scale-90 border cursor-pointer select-none"
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
            onClick={handleNext}
            disabled={currentVal.length === 0}
            className={`h-13 rounded-2xl flex items-center justify-center transition-all duration-150 active:scale-90 border cursor-pointer select-none shadow-md ${
              currentVal.length === 0 ? 'opacity-35 cursor-default' : ''
            }`}
            style={{
              backgroundColor: currentVal.length > 0 ? theme.accent : keyBg,
              borderColor: currentVal.length > 0 ? theme.accent : cardBorder,
              color: currentVal.length > 0 ? accentTextColor : theme.text,
            }}
            title="Далее"
          >
            {(mode === 'set' && step === 2) || (mode === 'change' && step === 3) || mode === 'disable' ? (
              <Check size={20} strokeWidth={2.5} />
            ) : (
              <ArrowRight size={20} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
