import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import {
  Lock,
  Unlock,
  Plus,
  MoreHorizontal,
  Trash2,
  Download,
  Check,
  RotateCcw,
  KeyRound,
  Delete,
  ArrowRight,
  ShieldAlert,
  Shield,
  ArrowUp,
  ArrowDown,
  Pin,
  CopyPlus,
  Search,
  X,
} from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';
import { stripHtmlTags } from '../utils/textUtils';
import { getFontFamilyStyle } from '../utils/fonts';
import { PinModal, PinModalMode } from './PinModal';
import { PinnedSearchBar } from './PinnedSearchBar';
import { Note } from '../types';

export const PrivateSpaceView: React.FC = () => {
  const {
    notes,
    createNote,
    updateNote,
    deleteNote,
    duplicateNote,
    moveNoteInBlock,
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
    resetPrivateSpace,
    privateLockoutUntil,
    openExportModal,
    searchQuery,
    setSearchQuery,
    searchTarget,
  } = useApp();

  const [enteredPin, setEnteredPin] = useState<string>('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<PinModalMode>('set');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [openMenuNoteId, setOpenMenuNoteId] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);
  const [remainingLockout, setRemainingLockout] = useState<number>(0);

  // Long press refs
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef<boolean>(false);

  const t = (key: string) => getTranslation(language, key);
  const isLight = isLightColor(theme.bg);
  const accentTextColor = isLightColor(theme.accent) ? '#000000' : '#FFFFFF';

  const cardBg = isLight ? 'rgba(255, 255, 255, 0.75)' : 'rgba(28, 28, 30, 0.75)';
  const cardBorder = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)';
  const keyBg = isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';
  const keyHoverBg = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)';

  // Lockout countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      if (privateLockoutUntil && privateLockoutUntil > now) {
        setRemainingLockout(Math.ceil((privateLockoutUntil - now) / 1000));
      } else {
        setRemainingLockout(0);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [privateLockoutUntil]);

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
    if (isLockedOut || enteredPin.length === 0) return;

    const result = unlockPrivateSpace(enteredPin);
    if (!result.success) {
      setIsShaking(true);
      setErrorText(result.error || 'Неверный пин-код');
      setEnteredPin('');
      setTimeout(() => setIsShaking(false), 500);
    } else {
      setEnteredPin('');
      setErrorText(null);
    }
  }, [enteredPin, isLockedOut, unlockPrivateSpace]);

  // Physical keyboard listener when private space is locked
  useEffect(() => {
    if (!isPrivateLocked || isResetConfirmOpen || isLockedOut) return;

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
  }, [handleDigit, handleBackspace, handleSubmit, isPrivateLocked, isResetConfirmOpen, isLockedOut]);

  // Long press interaction handlers
  const handlePointerDown = (noteId: string) => {
    isLongPressRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setOpenMenuNoteId(noteId);
    }, 500);
  };

  const handlePointerUpOrLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuNoteId(noteId);
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const months = [
      'янв', 'фев', 'мар', 'апр', 'май', 'июн',
      'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
    ];
    return `${d.getDate()} ${months[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const allPrivateNotes = notes.filter(n => n.isPrivate);

  // Search filtering
  const filteredPrivateNotes = allPrivateNotes.filter(n => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const titleMatch = (n.title || '').toLowerCase().includes(q);
    const contentMatch = stripHtmlTags(n.content || '').toLowerCase().includes(q);
    if (searchTarget === 'title') return titleMatch;
    if (searchTarget === 'content') return contentMatch;
    return titleMatch || contentMatch;
  });

  const pinnedNotes = filteredPrivateNotes.filter(n => n.pinned);
  const unpinnedNotes = filteredPrivateNotes.filter(n => !n.pinned);

  // Locked State View (Styled exactly like LockScreen)
  if (!privatePin || isPrivateLocked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-between min-h-0 p-6 sm:p-10 select-none overflow-y-auto">
        {/* Top subtle branding icon */}
        <div className="w-full flex justify-center pt-2 sm:pt-4">
          <div
            className="w-14 h-14 rounded-3xl flex items-center justify-center border shadow-sm transition-all duration-300"
            style={{
              backgroundColor: hexToRgba(theme.accent, isLight ? 0.12 : 0.18),
              borderColor: hexToRgba(theme.accent, 0.3),
              color: theme.accent,
            }}
          >
            <Shield size={26} strokeWidth={2.2} />
          </div>
        </div>

        {/* Center Content: Title, PIN Display & Keypad */}
        <div className="w-full max-w-xs flex flex-col items-center my-auto">
          <h1 className="text-xl font-bold tracking-tight mb-1 opacity-90 text-center leading-snug">
            {privatePin ? (
              <>
                <span>Приватное</span>
                <br />
                <span>пространство</span>
              </>
            ) : (
              'Создайте пин-код'
            )}
          </h1>
          <p className="text-xs opacity-60 mb-2 text-center">
            {privatePin
              ? 'Введите пин-код для доступа'
              : 'Задайте пин-код для защиты приватного пространства'}
          </p>

          {/* Lockout Warning or Dynamic PIN Indicator Dots */}
          {isLockedOut ? (
            <div
              className="flex flex-col items-center justify-center p-4 my-3 rounded-2xl border text-center w-full animate-fadeIn"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: '#EF4444',
              }}
            >
              <ShieldAlert size={26} className="mb-1 animate-pulse" />
              <p className="text-xs font-bold">Слишком много неверных попыток</p>
              <p className="text-sm font-black tracking-widest mt-1">
                Повторите через {remainingLockout} сек.
              </p>
            </div>
          ) : (
            <>
              <div
                className={`flex items-center justify-center gap-2.5 h-10 my-3 transition-transform ${
                  isShaking ? 'animate-shake' : ''
                }`}
              >
                {Array.from({ length: Math.max(4, enteredPin.length) }).map((_, index) => {
                  const isFilled = index < enteredPin.length;
                  return (
                    <div
                      key={index}
                      className="w-3.5 h-3.5 rounded-full transition-all duration-200"
                      style={{
                        backgroundColor: isFilled ? theme.accent : hexToRgba(theme.text, 0.15),
                        transform: isFilled ? 'scale(1.15)' : 'scale(1)',
                        boxShadow: isFilled ? `0 0 10px ${hexToRgba(theme.accent, 0.5)}` : 'none',
                      }}
                    />
                  );
                })}
              </div>

              {errorText && (
                <p className="text-xs font-semibold text-red-500 mb-2 animate-fadeIn text-center">
                  {errorText}
                </p>
              )}
            </>
          )}

          {/* Android 17 / Material You Style Keypad Grid (3x4) */}
          <div className="w-full max-w-[260px] grid grid-cols-3 gap-2.5 sm:gap-3 select-none mt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
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
              title="Удалить цифру"
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
              <ArrowRight size={22} />
            </button>
          </div>
        </div>

        {/* Bottom Actions: Forgot PIN & Back */}
        <div className="w-full flex items-center justify-center gap-4 pb-2 sm:pb-4">
          <button
            type="button"
            onClick={() => setViewMode('notes')}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-white/10 transition opacity-60 hover:opacity-100 cursor-pointer"
          >
            Назад к заметкам
          </button>
          <span className="opacity-20">•</span>
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="text-xs font-medium opacity-50 hover:opacity-90 transition-opacity cursor-pointer text-center"
          >
            Забыли пин-код?
          </button>
        </div>

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
  const tileCardBg = isLight ? '#FFFFFF' : hexToRgba(theme.text, 0.05);
  const tileCardBorder = quickSettings.showBorder
    ? theme.accent
    : hexToRgba(theme.text, 0.12);

  const activeMenuNote = allPrivateNotes.find(n => n.id === openMenuNoteId);

  const renderNoteCard = (note: Note) => {
    const plainContent = stripHtmlTags(note.content) || 'Пустая заметка';
    const titleText = note.title || 'Без названия';
    const hideDots = !!quickSettings.hideTileDots;

    return (
      <div
        key={note.id}
        onPointerDown={() => handlePointerDown(note.id)}
        onPointerUp={() => handlePointerUpOrLeave()}
        onPointerLeave={() => handlePointerUpOrLeave()}
        onContextMenu={e => handleContextMenu(e, note.id)}
        onClick={() => {
          if (isLongPressRef.current) {
            isLongPressRef.current = false;
            return;
          }
          setActiveNoteId(note.id);
          setViewMode('editor');
        }}
        className="group relative p-3 sm:p-4 rounded-2xl border shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        style={{
          backgroundColor: tileCardBg,
          borderColor: quickSettings.showBorder ? tileCardBorder : 'transparent',
        }}
      >
        <div>
          {Boolean(quickSettings.showTileMetadata) && (
            <div className="text-[9px] sm:text-[10px] font-medium opacity-50 mb-1.5 flex items-center justify-between">
              <span>{formatDate(note.updatedAt)}</span>
              <div className="flex items-center gap-1">
                {note.pinned && <Pin size={10} style={{ color: theme.accent }} className="fill-current" />}
                <Lock size={10} style={{ color: theme.accent }} />
              </div>
            </div>
          )}

          {displayMode !== 'content' && (
            <h3
              className="text-xs sm:text-sm font-bold mb-1 group-hover:underline line-clamp-1 flex items-center gap-1.5"
              style={{ fontFamily: note.titleFont ? getFontFamilyStyle(note.titleFont) : undefined }}
            >
              {note.pinned && !quickSettings.showTileMetadata && (
                <Pin size={12} style={{ color: theme.accent }} className="fill-current shrink-0" />
              )}
              <span className="truncate">{titleText}</span>
            </h3>
          )}

          {displayMode !== 'title' && (
            <p className="text-[11px] sm:text-xs opacity-70 line-clamp-3 sm:line-clamp-4 leading-snug">
              {plainContent}
            </p>
          )}
        </div>

        {!hideDots && (
          <div className="flex items-center justify-end mt-2">
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
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-y-auto px-6 md:px-12 pt-6 pb-28 select-none"
      onClick={() => setOpenMenuNoteId(null)}
    >
      {/* Toast Notification */}
      {copiedNotice && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-black/80 backdrop-blur-md text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <Check size={14} className="text-green-400" />
          <span>{copiedNotice}</span>
        </div>
      )}

      {/* Header: Centered 2-line title without count */}
      <div className="flex flex-col items-center justify-center pt-2 mb-6 text-center">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug inline-block">
          <span>Приватное</span>
          <br />
          <span>пространство</span>
        </h1>
      </div>

      {/* Pinned Search Bar (if enabled in settings) */}
      {quickSettings.pinSearchToHomeScreen && (
        <PinnedSearchBar />
      )}

      {/* Active Search Filter Banner */}
      {!quickSettings.pinSearchToHomeScreen && searchQuery.trim() && (
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold mb-4 shrink-0 animate-fadeIn self-start"
          style={{
            backgroundColor: hexToRgba(theme.accent, 0.2),
            color: theme.accent,
          }}
        >
          <Search size={12} />
          <span>
            «{searchQuery}» ({searchTarget === 'title' ? 'Название' : searchTarget === 'content' ? 'Текст' : 'Все'})
          </span>
          <button
            onClick={() => setSearchQuery('')}
            className="hover:opacity-75 cursor-pointer ml-0.5"
            title="Очистить поиск"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Notes Grid */}
      {filteredPrivateNotes.length === 0 ? (
        <div className="text-center py-20 opacity-50 flex flex-col items-center">
          <Lock size={36} className="mb-3 opacity-40" />
          <p className="text-sm font-semibold">
            {searchQuery.trim()
              ? `По запросу «${searchQuery}» ничего не найдено`
              : 'В приватном пространстве пока нет заметок'}
          </p>
          <p className="text-xs mt-1 max-w-xs opacity-75">
            {!searchQuery.trim() && 'Вы можете создать новую конфиденциальную заметку кнопкой ниже.'}
          </p>
        </div>
      ) : pinnedNotes.length > 0 ? (
        /* Render Pinned & Unpinned blocks if pinned notes exist */
        <div className="space-y-6">
          {/* Pinned Notes Section */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 opacity-60 text-xs font-bold uppercase tracking-wider px-1">
              <Pin size={12} style={{ color: theme.accent }} className="fill-current" />
              <span>Закрепленные</span>
              <span className="text-[11px] font-normal ml-0.5">({pinnedNotes.length})</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
              {pinnedNotes.map(note => renderNoteCard(note))}
            </div>
          </div>

          {/* Other Private Notes Section */}
          {unpinnedNotes.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 opacity-60 text-xs font-bold uppercase tracking-wider px-1">
                <span>Заметки</span>
                <span className="text-[11px] font-normal ml-0.5">({unpinnedNotes.length})</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                {unpinnedNotes.map(note => renderNoteCard(note))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Unified Grid when no notes are pinned */
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {filteredPrivateNotes.map(note => renderNoteCard(note))}
        </div>
      )}

      {/* Floating Bottom Center Create Button for Private Notes (Iconless as requested) */}
      <div className="fixed bottom-6 inset-x-0 z-30 pointer-events-none flex justify-center px-4">
        <button
          onClick={() => {
            const newNote = createNote();
            updateNote(newNote.id, { isPrivate: true });
            setActiveNoteId(newNote.id);
            setViewMode('editor');
          }}
          className="pointer-events-auto flex items-center justify-center px-6 py-3 rounded-2xl text-xs font-extrabold shadow-xl backdrop-blur-xl border hover:opacity-80 active:scale-95 transition cursor-pointer"
          style={{
            backgroundColor: hexToRgba(theme.text, 0.08),
            borderColor: quickSettings.showBorder ? theme.accent : 'transparent',
            color: theme.text,
          }}
        >
          <span>Создать в привате</span>
        </button>
      </div>

      {/* Modal Action Menu for Private Notes */}
      {activeMenuNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={e => {
            e.stopPropagation();
            setOpenMenuNoteId(null);
          }}
        >
          <div
            className="w-full max-w-[170px] p-2 rounded-2xl border shadow-2xl backdrop-blur-2xl transition-all animate-fadeIn"
            style={{
              backgroundColor: isLight ? 'rgba(255, 255, 255, 0.92)' : hexToRgba(theme.bg, 0.92),
              borderColor: hexToRgba(theme.text, 0.15),
              color: theme.text,
              boxShadow: isLight ? '0 10px 30px rgba(0, 0, 0, 0.15)' : '0 10px 30px rgba(0, 0, 0, 0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const isPinned = Boolean(activeMenuNote.pinned);
              const sameGroupNotes = allPrivateNotes.filter(n => Boolean(n.pinned) === isPinned);
              const noteIndexInGroup = sameGroupNotes.findIndex(n => n.id === activeMenuNote.id);
              const canMoveUp = noteIndexInGroup > 0;
              const canMoveDown = noteIndexInGroup !== -1 && noteIndexInGroup < sameGroupNotes.length - 1;

              return (
                <div className="flex flex-col gap-0.5 text-xs font-bold">
                  {/* 1. "Вверх / вниз" Reorder Actions */}
                  <div className="grid grid-cols-2 gap-1 pb-1 border-b" style={{ borderColor: hexToRgba(theme.text, 0.1) }}>
                    <button
                      disabled={!canMoveUp}
                      onClick={e => {
                        e.stopPropagation();
                        moveNoteInBlock(activeMenuNote.id, 'up');
                      }}
                      className={`flex items-center justify-center gap-1 py-1.5 rounded-xl transition cursor-pointer text-xs ${
                        !canMoveUp
                          ? 'opacity-30 cursor-not-allowed bg-white/5'
                          : 'hover:bg-white/10 active:scale-95 bg-white/5'
                      }`}
                      title="Переместить вверх"
                    >
                      <ArrowUp size={14} style={{ color: theme.accent }} />
                      <span>Вверх</span>
                    </button>

                    <button
                      disabled={!canMoveDown}
                      onClick={e => {
                        e.stopPropagation();
                        moveNoteInBlock(activeMenuNote.id, 'down');
                      }}
                      className={`flex items-center justify-center gap-1 py-1.5 rounded-xl transition cursor-pointer text-xs ${
                        !canMoveDown
                          ? 'opacity-30 cursor-not-allowed bg-white/5'
                          : 'hover:bg-white/10 active:scale-95 bg-white/5'
                      }`}
                      title="Переместить вниз"
                    >
                      <ArrowDown size={14} style={{ color: theme.accent }} />
                      <span>Вниз</span>
                    </button>
                  </div>

                  {/* 2. "Закрепить / открепить" */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      updateNote(activeMenuNote.id, { pinned: !activeMenuNote.pinned });
                      setOpenMenuNoteId(null);
                    }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left whitespace-nowrap"
                  >
                    <Pin
                      size={14}
                      style={{ color: theme.accent }}
                      className={activeMenuNote.pinned ? 'fill-current' : ''}
                    />
                    <span>{activeMenuNote.pinned ? 'Открепить' : 'Закрепить'}</span>
                  </button>

                  {/* 3. "Дублировать" */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      duplicateNote(activeMenuNote.id);
                      setOpenMenuNoteId(null);
                    }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left whitespace-nowrap"
                  >
                    <CopyPlus size={14} style={{ color: theme.accent }} />
                    <span>Дублировать</span>
                  </button>

                  {/* 4. "Экспорт" */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setOpenMenuNoteId(null);
                      openExportModal(activeMenuNote.id);
                    }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left whitespace-nowrap"
                  >
                    <Download size={14} style={{ color: theme.accent }} />
                    <span>Экспорт</span>
                  </button>

                  {/* 5. "Убрать из привата" */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      updateNote(activeMenuNote.id, { isPrivate: false });
                      setOpenMenuNoteId(null);
                      setCopiedNotice('Перемещено в обычные заметки');
                      setTimeout(() => setCopiedNotice(null), 2000);
                    }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition text-left cursor-pointer whitespace-nowrap"
                  >
                    <Unlock size={14} style={{ color: theme.accent }} />
                    <span>В общие</span>
                  </button>

                  <div className="h-px my-0.5" style={{ backgroundColor: hexToRgba(theme.text, 0.1) }} />

                  {/* 6. "В корзину" */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      deleteNote(activeMenuNote.id);
                      setOpenMenuNoteId(null);
                    }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-red-500/20 active:scale-98 transition cursor-pointer text-left text-red-500 whitespace-nowrap"
                  >
                    <Trash2 size={14} />
                    <span>В корзину</span>
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

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
