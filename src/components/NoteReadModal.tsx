import React from 'react';
import { useApp } from '../context/AppContext';
import { hexToRgba, isLightColor } from '../themes';
import { X, FileText, ArrowUpRight } from 'lucide-react';
import { getFontFamilyStyle } from '../utils/fonts';

interface NoteReadModalProps {
  noteId: string;
  onClose: () => void;
}

export const NoteReadModal: React.FC<NoteReadModalProps> = ({ noteId, onClose }) => {
  const { notes, theme, quickSettings, setActiveNoteId, setViewMode } = useApp();

  const note = notes.find(n => n.id === noteId);

  if (!note) return null;

  const isLight = isLightColor(theme.bg);
  const modalBg = isLight ? '#FFFFFF' : hexToRgba(theme.bg, 0.98);
  const cardBorder = quickSettings.showBorder ? theme.accent : hexToRgba(theme.text, 0.15);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md animate-fadeIn"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-2xl transition-all"
        style={{
          backgroundColor: modalBg,
          borderColor: cardBorder,
          color: theme.text,
          boxShadow: `0 24px 60px ${isLight ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.6)'}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Clean Header with Title and Actions */}
        <div className="px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <FileText size={20} style={{ color: theme.accent }} className="shrink-0" />
            <h3
              className="font-bold text-sm sm:text-base truncate"
              style={{
                fontFamily: getFontFamilyStyle(quickSettings.fontFamily),
              }}
            >
              {note.title || 'Без названия'}
            </h3>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Switch to this note button */}
            <button
              type="button"
              onClick={() => {
                setActiveNoteId(note.id);
                setViewMode('editor');
                onClose();
              }}
              className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer opacity-70 hover:opacity-100"
              title="Перейти к редактированию этой заметки"
            >
              <ArrowUpRight size={18} />
            </button>

            {/* Close (X) button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer opacity-75 hover:opacity-100"
              title="Закрыть и вернуться к заметке"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Note Content in Reading Mode */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-4 select-text">
          {/* Note Body */}
          <div
            className="prose max-w-none text-sm sm:text-base leading-relaxed break-words"
            style={{
              fontFamily: getFontFamilyStyle(quickSettings.fontFamily),
              lineHeight: quickSettings.lineHeight || 1.6,
            }}
            dangerouslySetInnerHTML={{
              __html:
                note.content ||
                '<p class="opacity-40 italic">Заметка не содержит текста.</p>',
            }}
          />
        </div>
      </div>
    </div>
  );
};
