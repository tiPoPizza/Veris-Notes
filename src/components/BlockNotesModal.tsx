import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { hexToRgba, isLightColor } from '../themes';
import {
  X,
  Layers,
  FileText,
  ArrowLeft,
  ArrowUpRight,
  Search,
  Calendar,
  Tag as TagIcon,
  Paperclip,
  Eye,
  Pin,
} from 'lucide-react';
import { getFontFamilyStyle } from '../utils/fonts';
import { stripHtmlTags } from '../utils/textUtils';

interface BlockNotesModalProps {
  blockId: string;
  onClose: () => void;
}

export const BlockNotesModal: React.FC<BlockNotesModalProps> = ({ blockId, onClose }) => {
  const {
    blocks,
    notes,
    theme,
    quickSettings,
    setActiveNoteId,
    setViewMode,
  } = useApp();

  const [previewingNoteId, setPreviewingNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isLight = isLightColor(theme.bg);
  const modalBg = isLight ? '#FFFFFF' : hexToRgba(theme.bg, 0.98);
  const cardBorder = quickSettings.showBorder ? theme.accent : hexToRgba(theme.text, 0.14);
  const cardBg = isLight ? hexToRgba(theme.text, 0.04) : hexToRgba(theme.text, 0.07);

  const block = blocks.find(b => b.id === blockId);

  // Get notes for this block
  const blockNotes = useMemo(() => {
    if (!block) return [];
    const list = notes.filter(n => !n.isPrivate && !n.deletedAt);
    let result = [];
    if (block.id === 'pinned' || block.type === 'pinned') {
      result = list.filter(n => n.pinned);
    } else if (block.id === 'general' || block.type === 'general') {
      result = list.filter(n => !n.pinned && (!n.blockId || n.blockId === 'general'));
    } else {
      result = list.filter(n => !n.pinned && n.blockId === block.id);
    }
    return result;
  }, [block, notes]);

  // Filter notes by search query if any
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return blockNotes;
    const q = searchQuery.toLowerCase().trim();
    return blockNotes.filter(
      n =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && stripHtmlTags(n.content).toLowerCase().includes(q)) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(q)))
    );
  }, [blockNotes, searchQuery]);

  const previewNote = useMemo(() => {
    if (!previewingNoteId) return null;
    return notes.find(n => n.id === previewingNoteId) || null;
  }, [previewingNoteId, notes]);

  if (!block) return null;

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const months = [
      'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
      'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getNotesCountLabel = (count: number) => {
    const rem10 = count % 10;
    const rem100 = count % 100;
    if (rem100 >= 11 && rem100 <= 19) return `${count} заметок`;
    if (rem10 === 1) return `${count} заметка`;
    if (rem10 >= 2 && rem10 <= 4) return `${count} заметки`;
    return `${count} заметок`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md animate-fadeIn"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
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
        {previewNote ? (
          /* ================= MODE: Note Preview inside Block Modal ================= */
          <>
            {/* Header with "Back to Block Notes", Note Title and "Close directly to Editor" */}
            <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between shrink-0 gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setPreviewingNoteId(null)}
                  className="py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer hover:bg-white/10 active:scale-95 shrink-0 border"
                  style={{
                    backgroundColor: hexToRgba(theme.accent, 0.1),
                    borderColor: hexToRgba(theme.accent, 0.3),
                    color: theme.accent,
                  }}
                  title="Назад к списку заметок блока"
                >
                  <ArrowLeft size={15} />
                  <span className="hidden xs:inline">К списку блока</span>
                </button>

                <div className="flex items-center gap-2 min-w-0 pl-1">
                  <FileText size={18} style={{ color: theme.accent }} className="shrink-0" />
                  <span
                    className="font-bold text-sm sm:text-base truncate"
                    style={{
                      fontFamily: getFontFamilyStyle(quickSettings.fontFamily),
                    }}
                  >
                    {previewNote.title || 'Без названия'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Switch to this note in editor */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveNoteId(previewNote.id);
                    setViewMode('editor');
                    onClose();
                  }}
                  className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer opacity-70 hover:opacity-100"
                  title="Перейти к редактированию этой заметки"
                >
                  <ArrowUpRight size={18} />
                </button>

                {/* Close straight to editor */}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer opacity-75 hover:opacity-100"
                  title="Закрыть и вернуться в редактор"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Note Content Preview */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-4 select-text">
              {/* Note Metadata */}
              <div className="flex flex-wrap items-center gap-2 text-xs opacity-60 pb-2 border-b" style={{ borderColor: hexToRgba(theme.text, 0.08) }}>
                <div className="flex items-center gap-1">
                  <Calendar size={13} />
                  <span>{formatDate(previewNote.updatedAt || previewNote.createdAt)}</span>
                </div>
                {previewNote.pinned && (
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      backgroundColor: hexToRgba(theme.accent, 0.15),
                      color: theme.accent,
                    }}
                  >
                    <Pin size={11} />
                    Закреплена
                  </span>
                )}
                {previewNote.tags && previewNote.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {previewNote.tags.map(tag => (
                      <span
                        key={tag}
                        className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: hexToRgba(theme.text, 0.08),
                          color: theme.text,
                        }}
                      >
                        <TagIcon size={10} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Note Body */}
              <div
                className="prose max-w-none text-sm sm:text-base leading-relaxed break-words"
                style={{
                  fontFamily: getFontFamilyStyle(quickSettings.fontFamily),
                  lineHeight: quickSettings.lineHeight || 1.6,
                }}
                dangerouslySetInnerHTML={{
                  __html: previewNote.content || '<p class="opacity-40 italic">Заметка пуста</p>',
                }}
              />

              {/* Attachments if any */}
              {previewNote.attachments && previewNote.attachments.length > 0 && (
                <div className="pt-4 border-t space-y-2" style={{ borderColor: hexToRgba(theme.text, 0.1) }}>
                  <div className="text-xs font-bold opacity-60 flex items-center gap-1">
                    <Paperclip size={13} />
                    <span>Вложения ({previewNote.attachments.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {previewNote.attachments.map(att => (
                      <div
                        key={att.id}
                        className="px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-1.5"
                        style={{
                          backgroundColor: cardBg,
                          borderColor: hexToRgba(theme.text, 0.1),
                        }}
                      >
                        <Paperclip size={12} className="opacity-60" />
                        <span className="truncate max-w-[150px]">{att.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* ================= MODE: Block Notes List ================= */
          <>
            {/* Header with Block Info and Close */}
            <div className="px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0 pr-3">
                <Layers size={22} style={{ color: theme.accent }} className="shrink-0" />
                <div className="min-w-0">
                  <h3
                    className="font-bold text-base sm:text-lg truncate leading-tight"
                    style={{
                      fontFamily: getFontFamilyStyle(quickSettings.fontFamily),
                    }}
                  >
                    {block.name}
                  </h3>
                  <p className="text-xs opacity-50 font-medium mt-0.5">
                    {getNotesCountLabel(blockNotes.length)}
                  </p>
                </div>
              </div>

              {/* Close directly to editor */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer opacity-75 hover:opacity-100"
                title="Закрыть и вернуться в редактор"
              >
                <X size={20} />
              </button>
            </div>

            {/* Optional search input when multiple notes */}
            {blockNotes.length > 3 && (
              <div className="px-5 pt-3 pb-1 shrink-0">
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-2xl border transition"
                  style={{
                    backgroundColor: cardBg,
                    borderColor: hexToRgba(theme.text, 0.12),
                  }}
                >
                  <Search size={14} className="opacity-50 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Поиск по заметкам в блоке..."
                    className="w-full bg-transparent text-xs sm:text-sm outline-none"
                    style={{ color: theme.text }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-0.5 rounded-full hover:bg-white/10 opacity-60 hover:opacity-100 transition cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable list of notes */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
              {filteredNotes.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center opacity-50 space-y-2">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{
                      backgroundColor: hexToRgba(theme.text, 0.05),
                    }}
                  >
                    <Layers size={22} className="opacity-60" />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold">
                    {searchQuery ? 'Ничего не найдено' : 'В этом блоке пока нет заметок'}
                  </p>
                </div>
              ) : (
                filteredNotes.map(n => {
                  const plainText = stripHtmlTags(n.content || '').trim();
                  const snippet = plainText ? plainText.slice(0, 110) : 'Пустая заметка';

                  return (
                    <div
                      key={n.id}
                      onClick={() => setPreviewingNoteId(n.id)}
                      className="p-3 sm:p-3.5 rounded-2xl border transition cursor-pointer flex flex-col gap-1.5 hover:shadow-md group active:scale-[0.99]"
                      style={{
                        backgroundColor: cardBg,
                        borderColor: hexToRgba(theme.text, 0.1),
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {n.pinned && (
                            <Pin
                              size={12}
                              className="shrink-0"
                              style={{ color: theme.accent }}
                            />
                          )}
                          <h4 className="font-bold text-xs sm:text-sm truncate group-hover:underline">
                            {n.title || 'Без названия'}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setActiveNoteId(n.id);
                              setViewMode('editor');
                              onClose();
                            }}
                            className="p-1 rounded-lg opacity-40 hover:opacity-100 hover:bg-white/10 transition"
                            title="Открыть в редакторе"
                          >
                            <ArrowUpRight size={14} />
                          </button>
                          <div
                            className="p-1 rounded-lg opacity-50 group-hover:opacity-100 group-hover:text-amber-500 transition"
                            style={{ color: theme.accent }}
                          >
                            <Eye size={14} />
                          </div>
                        </div>
                      </div>

                      {/* Excerpt */}
                      <p className="text-xs opacity-60 line-clamp-2 leading-relaxed">
                        {snippet}
                      </p>

                      {/* Metadata Footer */}
                      <div className="flex items-center justify-between gap-2 text-[10px] opacity-45 pt-1">
                        <div className="flex items-center gap-2 truncate">
                          <span>{formatDate(n.updatedAt || n.createdAt)}</span>
                          {n.attachments && n.attachments.length > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Paperclip size={10} />
                              {n.attachments.length}
                            </span>
                          )}
                        </div>

                        {n.tags && n.tags.length > 0 && (
                          <div className="flex items-center gap-1 shrink-0 overflow-hidden">
                            {n.tags.slice(0, 2).map(tag => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.2 rounded-md bg-black/5 dark:bg-white/5 font-medium truncate max-w-[80px]"
                              >
                                #{tag}
                              </span>
                            ))}
                            {n.tags.length > 2 && (
                              <span>+{n.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
