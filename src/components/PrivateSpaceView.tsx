import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import { Note } from '../types';
import {
  Shield,
  Lock,
  Unlock,
  Plus,
  MoreHorizontal,
  Trash2,
  Download,
  Tag as TagIcon,
  X,
  Check,
  RotateCcw,
  ArrowLeft,
  KeyRound,
  AlertTriangle,
} from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';
import { stripHtmlTags } from '../utils/textUtils';
import { getFontFamilyStyle } from '../utils/fonts';
import { PinModal, PinModalMode } from './PinModal';

export const PrivateSpaceView: React.FC = () => {
  const {
    notes,
    createNote,
    updateNote,
    deleteNote,
    activeNoteId,
    setActiveNoteId,
    viewMode,
    setViewMode,
    theme,
    language,
    quickSettings,
    privatePin,
    isPrivateLocked,
    unlockPrivateSpace,
    lockPrivateSpace,
    resetPrivateSpace,
    privateLockoutUntil,
    privateFailedAttempts,
    openExportModal,
  } = useApp();

  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<PinModalMode>('set');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [openMenuNoteId, setOpenMenuNoteId] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  const t = (key: string) => getTranslation(language, key);
  const isLight = isLightColor(theme.bg);
  const cardBg = hexToRgba(theme.text, 0.05);
  const cardBorder = quickSettings.showBorder
    ? theme.accent
    : hexToRgba(theme.text, 0.12);

  // Lockout countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((privateLockoutUntil - Date.now()) / 1000));
      setLockoutRemaining(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [privateLockoutUntil]);

  // Private notes list
  const privateNotes = notes.filter(n => n.isPrivate);

  const handleUnlock = () => {
    if (lockoutRemaining > 0) return;
    if (!enteredPin) {
      setPinError('Введите пин-код');
      return;
    }
    const result = unlockPrivateSpace(enteredPin);
    if (!result.success) {
      setPinError(result.error || 'Неверный пин-код');
      setEnteredPin('');
    } else {
      setPinError('');
      setEnteredPin('');
    }
  };

  const handleKeyPress = (digit: string) => {
    if (lockoutRemaining > 0) return;
    if (enteredPin.length < 12) {
      setEnteredPin(prev => prev + digit);
      setPinError('');
    }
  };

  const handleDeleteDigit = () => {
    setEnteredPin(prev => prev.slice(0, -1));
    setPinError('');
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  // If no private PIN set yet, show setup screen
  if (!privatePin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fadeIn select-none">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-xl"
          style={{
            backgroundColor: hexToRgba(theme.accent, isLight ? 0.14 : 0.22),
            color: theme.accent,
          }}
        >
          <Shield size={40} strokeWidth={2.2} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2.5">
          Приватное пространство
        </h1>
        <p className="text-xs sm:text-sm opacity-65 max-w-md mb-8 leading-relaxed">
          Защитите свои конфиденциальные заметки отдельным цифровым пин-кодом (от 1 до 12 цифр).
        </p>

        <button
          onClick={() => {
            setPinModalMode('set');
            setIsPinModalOpen(true);
          }}
          className="py-3.5 px-7 rounded-2xl text-xs sm:text-sm font-extrabold shadow-xl hover:opacity-90 active:scale-95 transition flex items-center gap-2.5 cursor-pointer"
          style={{
            backgroundColor: theme.accent,
            color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
          }}
        >
          <KeyRound size={17} />
          <span>Настроить пин-код</span>
        </button>

        {isPinModalOpen && (
          <PinModal
            target="private"
            mode={pinModalMode}
            onClose={() => setIsPinModalOpen(false)}
            onSuccess={() => {
              setIsPinModalOpen(false);
            }}
          />
        )}
      </div>
    );
  }

  // If private space is locked, show Lock Screen for Private Space
  if (isPrivateLocked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fadeIn select-none">
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 shadow-xl"
          style={{
            backgroundColor: hexToRgba(theme.accent, isLight ? 0.14 : 0.22),
            color: theme.accent,
          }}
        >
          <Shield size={32} strokeWidth={2.2} />
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-1">
          Приватное пространство
        </h1>
        <p className="text-xs opacity-60 max-w-xs mb-6">
          Введите пин-код для доступа к скрытым заметкам
        </p>

        {/* PIN Digits Display */}
        <div className="w-full max-w-xs mb-6">
          <div
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border min-h-[48px] mb-2"
            style={{
              backgroundColor: cardBg,
              borderColor: pinError ? '#EF4444' : cardBorder,
            }}
          >
            {enteredPin.length === 0 ? (
              <span className="text-xs opacity-40">Введите пин-код</span>
            ) : (
              <div className="flex items-center gap-2">
                {enteredPin.split('').map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: theme.accent }}
                  />
                ))}
              </div>
            )}
          </div>

          {pinError && (
            <p className="text-xs text-red-500 font-bold animate-shake">{pinError}</p>
          )}

          {lockoutRemaining > 0 && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mt-2 flex items-center justify-center gap-2">
              <AlertTriangle size={15} />
              <span>Попробуйте через {lockoutRemaining} сек.</span>
            </div>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] w-full mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
            <button
              key={digit}
              disabled={lockoutRemaining > 0}
              onClick={() => handleKeyPress(digit)}
              className="h-12 rounded-2xl border text-base font-bold flex items-center justify-center hover:bg-white/10 active:scale-95 disabled:opacity-30 transition cursor-pointer"
              style={{
                borderColor: cardBorder,
                backgroundColor: cardBg,
                color: theme.text,
              }}
            >
              {digit}
            </button>
          ))}
          <button
            disabled={lockoutRemaining > 0 || enteredPin.length === 0}
            onClick={handleDeleteDigit}
            className="h-12 rounded-2xl border text-xs font-bold flex items-center justify-center hover:bg-white/10 active:scale-95 disabled:opacity-30 transition cursor-pointer"
            style={{
              borderColor: cardBorder,
              backgroundColor: cardBg,
              color: theme.text,
            }}
          >
            Удалить
          </button>
          <button
            disabled={lockoutRemaining > 0}
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-2xl border text-base font-bold flex items-center justify-center hover:bg-white/10 active:scale-95 disabled:opacity-30 transition cursor-pointer"
            style={{
              borderColor: cardBorder,
              backgroundColor: cardBg,
              color: theme.text,
            }}
          >
            0
          </button>
          <button
            disabled={lockoutRemaining > 0 || enteredPin.length === 0}
            onClick={handleUnlock}
            className="h-12 rounded-2xl font-bold text-xs flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-30 transition cursor-pointer"
            style={{
              backgroundColor: theme.accent,
              color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
            }}
          >
            Войти
          </button>
        </div>

        {/* Reset Private Space Option */}
        <button
          onClick={() => setIsResetConfirmOpen(true)}
          className="text-xs opacity-60 hover:opacity-100 hover:underline transition cursor-pointer"
        >
          Забыли пин-код? Сбросить приват
        </button>

        {/* Reset Confirmation Modal */}
        {isResetConfirmOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={() => setIsResetConfirmOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border space-y-4 text-left"
              style={{
                backgroundColor: isLight ? '#FFFFFF' : theme.bg,
                borderColor: cardBorder,
                color: theme.text,
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center shrink-0">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Сбросить приватное пространство?</h3>
                  <p className="text-xs opacity-60 mt-0.5">
                    Пин-код будет сброшен, а все скрытые заметки станут обычными.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    resetPrivateSpace();
                    setIsResetConfirmOpen(false);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 active:scale-95 transition cursor-pointer"
                >
                  Сбросить
                </button>
                <button
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold hover:bg-white/10 active:scale-95 transition cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Unlocked Private Space View
  const displayMode = quickSettings.tileDisplayMode || 'both';

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-6 md:px-12 pt-6 pb-28 select-none">
      {/* Toast Notification */}
      {copiedNotice && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-black/80 backdrop-blur-md text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <Check size={14} className="text-green-400" />
          <span>{copiedNotice}</span>
        </div>
      )}

      {/* Header bar with Lock Button and Count */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: hexToRgba(theme.accent, isLight ? 0.14 : 0.2),
              color: theme.accent,
            }}
          >
            <Shield size={18} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <span>Приватное пространство</span>
              <span className="text-xs font-normal opacity-60">({privateNotes.length})</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPinModalMode('change');
              setIsPinModalOpen(true);
            }}
            className="py-1.5 px-3 rounded-xl border text-xs font-semibold opacity-70 hover:opacity-100 hover:bg-white/10 active:scale-95 transition cursor-pointer"
            style={{ borderColor: cardBorder }}
          >
            Сменить пин
          </button>
          <button
            onClick={lockPrivateSpace}
            className="py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 hover:opacity-85 active:scale-95 transition cursor-pointer"
            style={{
              borderColor: cardBorder,
              backgroundColor: hexToRgba(theme.text, 0.06),
            }}
            title="Заблокировать приватное пространство"
          >
            <Lock size={13} style={{ color: theme.accent }} />
            <span>Заблокировать</span>
          </button>
        </div>
      </div>

      {/* Notes Grid */}
      {privateNotes.length === 0 ? (
        <div className="text-center py-20 opacity-50 flex flex-col items-center">
          <Shield size={36} className="mb-3 opacity-40" />
          <p className="text-sm font-semibold">В приватном пространстве пока нет заметок</p>
          <p className="text-xs mt-1 max-w-xs opacity-75">
            Вы можете создать новую конфиденциальную заметку или переместить существующую через меню действий заметки.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {privateNotes.map(note => {
            const plainContent = stripHtmlTags(note.content) || 'Пустая заметка';
            const titleText = note.title || 'Без названия';
            const hideDots = !!quickSettings.hideTileDots;

            return (
              <div
                key={note.id}
                onClick={() => {
                  setActiveNoteId(note.id);
                  setViewMode('editor');
                }}
                className="group relative p-3 sm:p-4 rounded-2xl border shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                style={{
                  backgroundColor: cardBg,
                  borderColor: quickSettings.showBorder ? cardBorder : 'transparent',
                }}
              >
                <div>
                  {Boolean(quickSettings.showTileMetadata) && (
                    <div className="text-[9px] sm:text-[10px] font-medium opacity-50 mb-1.5 flex items-center justify-between">
                      <span>{formatDate(note.updatedAt)}</span>
                      <Shield size={11} style={{ color: theme.accent }} />
                    </div>
                  )}

                  {displayMode !== 'content' && (
                    <h3
                      className="text-xs sm:text-sm font-bold mb-1 group-hover:underline line-clamp-1"
                      style={{ fontFamily: note.titleFont ? getFontFamilyStyle(note.titleFont) : undefined }}
                    >
                      {titleText}
                    </h3>
                  )}

                  {displayMode !== 'title' && (
                    <p className="text-[11px] sm:text-xs opacity-70 line-clamp-3 sm:line-clamp-4 leading-snug">
                      {plainContent}
                    </p>
                  )}
                </div>

                {!hideDots && (
                  <div className="flex items-center justify-end mt-2 relative">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setOpenMenuNoteId(openMenuNoteId === note.id ? null : note.id);
                      }}
                      className="p-1 rounded-lg opacity-60 hover:opacity-100 transition cursor-pointer"
                      style={{ color: theme.text }}
                      title="Действия"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {/* Popover Action Menu */}
                    {openMenuNoteId === note.id && (
                      <div
                        className="absolute right-0 bottom-full mb-1 w-48 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-2xl z-40 flex flex-col gap-0.5 text-xs font-bold animate-fadeIn"
                        style={{
                          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : hexToRgba(theme.bg, 0.98),
                          borderColor: cardBorder,
                          color: theme.text,
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Remove from private */}
                        <button
                          onClick={() => {
                            updateNote(note.id, { isPrivate: false });
                            setOpenMenuNoteId(null);
                            setCopiedNotice('Перемещено в обычные заметки');
                            setTimeout(() => setCopiedNotice(null), 2000);
                          }}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 active:scale-98 transition text-left cursor-pointer"
                        >
                          <Unlock size={13} style={{ color: theme.accent }} />
                          <span>Убрать из привата</span>
                        </button>

                        {/* Export */}
                        <button
                          onClick={() => {
                            setOpenMenuNoteId(null);
                            openExportModal(note.id);
                          }}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 active:scale-98 transition text-left cursor-pointer"
                        >
                          <Download size={13} style={{ color: theme.accent }} />
                          <span>Экспортировать</span>
                        </button>

                        <div className="h-px my-0.5" style={{ backgroundColor: hexToRgba(theme.text, 0.1) }} />

                        {/* Trash */}
                        <button
                          onClick={() => {
                            deleteNote(note.id);
                            setOpenMenuNoteId(null);
                          }}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-red-500/20 active:scale-98 transition text-left text-red-400 cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>В корзину</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Center Create Button for Private Notes */}
      <div className="fixed bottom-6 inset-x-0 z-30 pointer-events-none flex justify-center px-4">
        <button
          onClick={() => {
            const newId = createNote();
            updateNote(newId, { isPrivate: true });
          }}
          className="pointer-events-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-extrabold shadow-xl backdrop-blur-xl border hover:opacity-80 active:scale-95 transition cursor-pointer"
          style={{
            backgroundColor: hexToRgba(theme.text, 0.08),
            borderColor: quickSettings.showBorder ? theme.accent : 'transparent',
            color: theme.text,
          }}
        >
          <Shield size={14} style={{ color: theme.accent }} />
          <span>Создать в привате</span>
        </button>
      </div>

      {isPinModalOpen && (
        <PinModal
          target="private"
          mode={pinModalMode}
          onClose={() => setIsPinModalOpen(false)}
          onSuccess={() => {
            setIsPinModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
