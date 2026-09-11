import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import { hexToRgba, isLightColor } from '../themes';
import {
  X,
  Download,
  Search,
  FileText,
  FileCode,
  FileSpreadsheet,
  BookOpen,
  Printer,
  Check,
  CheckCircle2,
  FileCheck,
  Copy,
} from 'lucide-react';
import { EXPORT_FORMATS, ExportFormatOption, exportNoteToFile, htmlToPlainText } from '../utils/fileExporter';

export const ExportNoteModal: React.FC = () => {
  const {
    isExportModalOpen,
    setIsExportModalOpen,
    exportTargetNoteId,
    notes,
    theme,
    language,
    activeNoteId,
  } = useApp();

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>('txt');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Sync selectedNoteId when modal opens
  useEffect(() => {
    if (isExportModalOpen) {
      if (exportTargetNoteId) {
        setSelectedNoteId(exportTargetNoteId);
      } else if (activeNoteId) {
        setSelectedNoteId(activeNoteId);
      } else if (notes.length > 0) {
        setSelectedNoteId(notes[0].id);
      }
      setSearchQuery('');
      setExportSuccessMessage(null);
      setIsExporting(false);
    }
  }, [isExportModalOpen, exportTargetNoteId, activeNoteId, notes]);

  const t = (key: string) => getTranslation(language, key);
  const isLight = isLightColor(theme.bg);
  const cardBg = hexToRgba(theme.text, 0.05);
  const cardBorder = hexToRgba(theme.text, 0.12);

  const isDirectMode = Boolean(exportTargetNoteId);

  const selectedNote = useMemo(() => {
    return notes.find(n => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase().trim();
    return notes.filter(
      n =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.tags && n.tags.some(tag => tag.toLowerCase().includes(q))) ||
        (n.content && n.content.toLowerCase().includes(q))
    );
  }, [notes, searchQuery]);

  if (!isExportModalOpen) return null;

  const handleExport = async () => {
    if (!selectedNote) return;
    setIsExporting(true);
    setExportSuccessMessage(null);

    try {
      await exportNoteToFile(selectedNote, selectedFormat);
      const fmt = EXPORT_FORMATS.find(f => f.id === selectedFormat);
      setExportSuccessMessage(`Файл успешно сохранен в формате ${fmt?.badge || selectedFormat.toUpperCase()}`);
      setTimeout(() => {
        setExportSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      setExportSuccessMessage(`Ошибка экспорта: ${err?.message || 'Не удалось сохранить файл'}`);
      setTimeout(() => setExportSuccessMessage(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!selectedNote) return;
    const textToCopy = `${selectedNote.title ? selectedNote.title + '\n\n' : ''}${htmlToPlainText(selectedNote.content)}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setExportSuccessMessage('Текст заметки успешно скопирован в буфер обмена!');
      setTimeout(() => {
        setExportSuccessMessage(null);
      }, 3500);
    } catch (err: any) {
      setExportSuccessMessage(`Не удалось скопировать: ${err?.message || 'Ошибка буфера обмена'}`);
      setTimeout(() => setExportSuccessMessage(null), 4000);
    }
  };

  const renderFormatIcon = (iconType: ExportFormatOption['iconType']) => {
    switch (iconType) {
      case 'doc':
        return <FileCheck size={18} />;
      case 'code':
        return <FileCode size={18} />;
      case 'table':
        return <FileSpreadsheet size={18} />;
      case 'book':
        return <BookOpen size={18} />;
      case 'pdf':
        return <Printer size={18} />;
      default:
        return <FileText size={18} />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-md animate-fadeIn"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
      onClick={() => setIsExportModalOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-3xl p-4 sm:p-6 shadow-2xl transition-all border backdrop-blur-2xl flex flex-col max-h-[88vh] overflow-hidden"
        style={{
          backgroundColor: hexToRgba(theme.bg, 0.96),
          color: theme.text,
          borderColor: cardBorder,
          boxShadow: `0 25px 60px ${hexToRgba(theme.text, 0.15)}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <Download size={20} style={{ color: theme.accent }} />
            <h3 className="text-base font-extrabold tracking-tight">Экспорт заметки</h3>
          </div>
          <button
            onClick={() => setIsExportModalOpen(false)}
            className="p-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer"
            style={{ color: theme.text }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* If Direct Mode (e.g. from Quick Settings): Show clean Target Note banner */}
          {isDirectMode ? (
            <div
              className="p-3 rounded-2xl border flex items-center justify-between gap-3"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-50">Экспортируемая заметка</div>
                <div className="text-xs sm:text-sm font-bold truncate mt-0.5" style={{ color: theme.text }}>
                  {selectedNote?.title || 'Без названия'}
                </div>
                {selectedNote?.tags && selectedNote.tags.length > 0 && (
                  <div className="text-[10px] opacity-50 truncate mt-0.5">
                    {selectedNote.tags.map(t => `#${t}`).join(' ')}
                  </div>
                )}
              </div>
              <div
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 border"
                style={{
                  backgroundColor: hexToRgba(theme.accent, 0.15),
                  borderColor: hexToRgba(theme.accent, 0.3),
                  color: theme.accent,
                }}
              >
                Текущая
              </div>
            </div>
          ) : (
            /* General Settings Mode: Note Selection with search */
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold uppercase tracking-wider opacity-65 flex items-center gap-1.5">
                <span>1. Выбор заметки</span>
                {selectedNote && (
                  <span className="text-[10px] lowercase opacity-50 font-normal">
                    (выбрана: «{selectedNote.title || 'Без названия'}»)
                  </span>
                )}
              </label>

              {/* Note search input */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-2xl border transition"
                style={{ backgroundColor: cardBg, borderColor: cardBorder }}
              >
                <Search size={15} className="opacity-40 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Поиск заметки по названию..."
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold outline-none placeholder:opacity-40"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-md opacity-40 hover:opacity-100 transition cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Note options list */}
              <div
                className="max-h-32 overflow-y-auto rounded-2xl border p-1 space-y-1"
                style={{ backgroundColor: hexToRgba(theme.text, 0.02), borderColor: cardBorder }}
              >
                {filteredNotes.length === 0 ? (
                  <div className="p-3 text-center text-xs opacity-50">
                    Заметки не найдены
                  </div>
                ) : (
                  filteredNotes.map(note => {
                    const isSelected = selectedNoteId === note.id;
                    return (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => setSelectedNoteId(note.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer border ${
                          isSelected ? 'font-bold' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: isSelected
                            ? hexToRgba(theme.accent, 0.15)
                            : hexToRgba(theme.text, 0.02),
                          borderColor: isSelected ? theme.accent : 'transparent',
                          color: theme.text,
                        }}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="text-xs font-bold truncate flex items-center gap-1.5">
                            {note.pinned && (
                              <span className="text-[10px] px-1 py-0.2 rounded-sm bg-amber-500/20 text-amber-400 shrink-0 font-normal">
                                закреп
                              </span>
                            )}
                            <span className="truncate">{note.title || 'Без названия'}</span>
                          </div>
                          {note.tags && note.tags.length > 0 && (
                            <div className="text-[10px] opacity-50 truncate mt-0.5">
                              {note.tags.map(t => `#${t}`).join(' ')}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: theme.accent }}
                          >
                            <Check size={12} />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Format Selection Grid */}
          <div className="space-y-2">
            <label className="text-[11px] font-extrabold uppercase tracking-wider opacity-65">
              {isDirectMode ? 'Формат файла' : '2. Формат файла'}
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXPORT_FORMATS.map(fmt => {
                const isSelected = selectedFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 relative ${
                      isSelected ? 'shadow-sm' : 'opacity-85 hover:opacity-100 hover:bg-white/5'
                    }`}
                    style={{
                      backgroundColor: isSelected
                        ? hexToRgba(theme.accent, 0.15)
                        : cardBg,
                      borderColor: isSelected ? theme.accent : cardBorder,
                      borderWidth: isSelected ? '1.5px' : '1px',
                      color: theme.text,
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border tracking-wider"
                        style={{
                          backgroundColor: isSelected
                            ? hexToRgba(theme.accent, 0.3)
                            : hexToRgba(theme.text, 0.06),
                          borderColor: isSelected ? theme.accent : hexToRgba(theme.text, 0.15),
                          color: isSelected ? theme.accent : theme.text,
                        }}
                      >
                        {fmt.badge}
                      </span>
                      <div style={{ color: isSelected ? theme.accent : hexToRgba(theme.text, 0.6) }}>
                        {renderFormatIcon(fmt.iconType)}
                      </div>
                    </div>

                    <div className="text-xs font-bold leading-tight">{fmt.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Export notification status */}
          {exportSuccessMessage && (
            <div
              className="p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 border bg-green-500/15 border-green-500/30 text-green-400 animate-fadeIn"
            >
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{exportSuccessMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3.5 mt-2 border-t flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 shrink-0" style={{ borderColor: cardBorder }}>
          <button
            type="button"
            onClick={() => setIsExportModalOpen(false)}
            className="px-3.5 py-2.5 rounded-2xl border text-xs font-bold hover:bg-white/5 active:scale-95 transition cursor-pointer"
            style={{ borderColor: cardBorder }}
          >
            Закрыть
          </button>

          <button
            type="button"
            onClick={handleCopyToClipboard}
            disabled={!selectedNote}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-2xl border text-xs font-bold hover:bg-white/10 active:scale-98 transition cursor-pointer ${
              !selectedNote ? 'opacity-50 pointer-events-none' : ''
            }`}
            style={{
              borderColor: hexToRgba(theme.accent, 0.4),
              backgroundColor: hexToRgba(theme.accent, 0.12),
              color: theme.text,
            }}
            title="Скопировать текст в буфер обмена"
          >
            <Copy size={15} style={{ color: theme.accent }} />
            <span>Скопировать в буфер</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={!selectedNote || isExporting}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl font-bold text-xs sm:text-sm text-black transition shadow-md active:scale-98 cursor-pointer ${
              !selectedNote || isExporting ? 'opacity-50 pointer-events-none' : 'hover:opacity-90'
            }`}
            style={{
              backgroundColor: theme.accent,
            }}
          >
            <Download size={16} />
            <span className="truncate">
              {isExporting ? 'Сохранение файла...' : `Экспорт в ${selectedFormat.toUpperCase()}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
