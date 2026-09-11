import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import {
  Undo2,
  Redo2,
  Search,
  MoreHorizontal,
  Paperclip,
  Mic,
  Settings,
  Type,
  Maximize2,
} from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';
import { NoteAttachment } from '../types';
import { AudioDictationModal } from './AudioDictationModal';
import { FontPickerModal } from './FontPickerModal';

export const FloatingDock: React.FC = () => {
  const {
    viewMode,
    undoNoteContent,
    redoNoteContent,
    canUndo,
    canRedo,
    activeNoteId,
    notes,
    addAttachmentToNote,
    setIsQuickSettingsOpen,
    setIsTagSearchOpen,
    setIsNoteSearchOpen,
    theme,
    language,
    quickSettings,
    isFocusMode,
    setIsFocusMode,
  } = useApp();

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState<boolean>(false);
  const [isFontModalOpen, setIsFontModalOpen] = useState<boolean>(false);
  const [fontTarget, setFontTarget] = useState<'cursor' | 'title'>('cursor');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (viewMode !== 'editor' || isFocusMode) return null;

  const t = (key: string) => getTranslation(language, key);
  const activeNote = notes.find(n => n.id === activeNoteId);
  const isLight = isLightColor(theme.bg);

  const buttonBorder = quickSettings.showBorder ? theme.accent : hexToRgba(theme.text, 0.12);

  const glassBg = hexToRgba(theme.text, 0.08);
  const glassBorder = buttonBorder;

  const popupBg = hexToRgba(theme.bg, 0.88);
  const popupBorder = buttonBorder;

  // Trigger hidden file picker
  const handleTriggerFileSelect = () => {
    setIsMoreMenuOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Process uploaded files
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeNoteId) return;

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    Array.from(files).forEach((file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`Файл "${file.name}" превышает допустимый размер в 50 МБ.`);
        return;
      }

      const reader = new FileReader();

      // Determine if file is plain text document
      const isTextFile =
        file.type.startsWith('text/') ||
        /\.(txt|md|json|csv|js|ts|html|css|xml|py|c|cpp)$/i.test(file.name);

      if (isTextFile) {
        // Read text content as text and dataUrl as DataURL
        const textReader = new FileReader();
        textReader.onload = (te) => {
          const textVal = te.target?.result as string;

          reader.onload = (de) => {
            const dataUrlVal = de.target?.result as string;
            const newAttachment: NoteAttachment = {
              id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: file.name,
              size: file.size,
              type: file.type || 'text/plain',
              dataUrl: dataUrlVal,
              textContent: textVal,
              updatedAt: Date.now(),
            };
            addAttachmentToNote(activeNoteId, newAttachment);
            window.dispatchEvent(
              new CustomEvent('veris-insert-attachment', {
                detail: { noteId: activeNoteId, attachment: newAttachment },
              })
            );
          };
          reader.readAsDataURL(file);
        };
        textReader.readAsText(file);
      } else {
        // Read binary / audio / media file as DataURL
        reader.onload = (de) => {
          const dataUrlVal = de.target?.result as string;
          const isAudio =
            file.type.startsWith('audio/') ||
            /\.(mp3|wav|ogg|m4a|aac|flac|opus|webm|wma)$/i.test(file.name);
          const newAttachment: NoteAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: file.size,
            type: file.type || (isAudio ? 'audio/mpeg' : 'application/octet-stream'),
            dataUrl: dataUrlVal,
            updatedAt: Date.now(),
          };
          addAttachmentToNote(activeNoteId, newAttachment);
          window.dispatchEvent(
            new CustomEvent('veris-insert-attachment', {
              detail: { noteId: activeNoteId, attachment: newAttachment },
            })
          );
        };
        reader.readAsDataURL(file);
      }
    });

    // Reset input value so same file can be selected again if needed
    if (e.target) {
      e.target.value = '';
    }
  };

  return (
    <>
      {isAudioModalOpen && (
        <AudioDictationModal
          isOpen={isAudioModalOpen}
          onClose={() => setIsAudioModalOpen(false)}
          noteId={activeNoteId || ''}
        />
      )}

      <FontPickerModal
        isOpen={isFontModalOpen}
        onClose={() => setIsFontModalOpen(false)}
        activeTarget={fontTarget}
        onChangeTarget={t => setFontTarget(t)}
        currentFontValue={quickSettings.fontFamily || 'sans'}
        currentTitleFontValue={activeNote?.titleFont || quickSettings.fontFamily || 'sans'}
        onSelectFont={(fontValue, cssFamily, target) => {
          window.dispatchEvent(
            new CustomEvent('veris-apply-font', {
              detail: { fontValue, cssFamily, target },
            })
          );
        }}
      />

      <div id="floating-bottom-dock" className="fixed bottom-6 inset-x-0 z-40 pointer-events-none flex flex-col items-center justify-center px-4">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Sub-menu Popup above dock */}
        {isMoreMenuOpen && (
          <div
            className="pointer-events-auto mb-2 rounded-2xl p-1 shadow-2xl border backdrop-blur-2xl animate-fadeIn flex flex-col gap-0.5 min-w-[155px]"
            style={{
              backgroundColor: popupBg,
              borderColor: popupBorder,
              color: theme.text,
              boxShadow: `0 12px 30px ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.5)'}`,
            }}
          >
            {/* 1. Attach file button */}
            <button
              onClick={handleTriggerFileSelect}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-white/10 active:scale-98 transition text-left cursor-pointer whitespace-nowrap"
              style={{ color: theme.text }}
            >
              <Paperclip size={16} style={{ color: theme.accent }} />
              <span>Вложить файл</span>
            </button>

            {/* 2. Search button */}
            <button
              onClick={() => {
                setIsMoreMenuOpen(false);
                setIsNoteSearchOpen(true);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-white/10 active:scale-98 transition text-left cursor-pointer whitespace-nowrap"
              style={{ color: theme.text }}
            >
              <Search size={16} style={{ color: theme.accent }} />
              <span>Поиск</span>
            </button>

            {/* 3. Audio dictation button */}
            <button
              onClick={() => {
                setIsMoreMenuOpen(false);
                setIsAudioModalOpen(true);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-white/10 active:scale-98 transition text-left cursor-pointer whitespace-nowrap"
              style={{ color: theme.text }}
            >
              <Mic size={16} style={{ color: theme.accent }} />
              <span>Аудио</span>
            </button>

            {/* 3. Font selection button (Вложить файл —> аудио —> шрифт) */}
            <button
              onClick={() => {
                setIsMoreMenuOpen(false);
                setIsFontModalOpen(true);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-white/10 active:scale-98 transition text-left cursor-pointer whitespace-nowrap"
              style={{ color: theme.text }}
            >
              <Type size={16} style={{ color: theme.accent }} />
              <span>Шрифт</span>
            </button>
          </div>
        )}

        {/* Center Floating Toolbar */}
        <div
          id="floating-dock-pill"
          className="pointer-events-auto flex items-center gap-1 p-1 rounded-2xl border shadow-lg backdrop-blur-xl transition-all"
          style={{
            backgroundColor: glassBg,
            borderColor: glassBorder,
            color: theme.text,
          }}
        >
          {/* Undo */}
          <button
            onPointerDown={e => e.preventDefault()}
            onMouseDown={e => e.preventDefault()}
            onClick={() => undoNoteContent()}
            disabled={!canUndo}
            className={`p-2 rounded-xl transition ${
              canUndo
                ? 'hover:bg-white/15 active:scale-90 cursor-pointer opacity-100'
                : 'opacity-30 cursor-not-allowed'
            }`}
            style={{ color: theme.text }}
            title="Отменить (Назад)"
          >
            <Undo2 size={16} />
          </button>

          {/* Redo */}
          <button
            onPointerDown={e => e.preventDefault()}
            onMouseDown={e => e.preventDefault()}
            onClick={() => redoNoteContent()}
            disabled={!canRedo}
            className={`p-2 rounded-xl transition ${
              canRedo
                ? 'hover:bg-white/15 active:scale-90 cursor-pointer opacity-100'
                : 'opacity-30 cursor-not-allowed'
            }`}
            style={{ color: theme.text }}
            title="Повторить (Вперёд)"
          >
            <Redo2 size={16} />
          </button>

          {/* More / Sub-menu Toggle (3 dots) */}
          <button
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className="p-2 rounded-xl transition cursor-pointer"
            style={{
              backgroundColor: isMoreMenuOpen ? hexToRgba(theme.accent, 0.22) : 'transparent',
              color: isMoreMenuOpen ? theme.accent : theme.text,
            }}
            title="Меню действий"
          >
            <MoreHorizontal size={16} />
          </button>

          {/* Pinned Focus Mode button (right of 3 dots) */}
          {quickSettings.pinFocusModeToBottomBar && (
            <button
              onClick={() => setIsFocusMode(true)}
              className="p-2 rounded-xl hover:bg-white/15 active:scale-90 transition cursor-pointer flex items-center justify-center"
              style={{ color: theme.text }}
              title="Режим фокуса"
            >
              <Maximize2 size={16} style={{ color: theme.accent }} />
            </button>
          )}
        </div>
      </div>
    </>
  );
};
