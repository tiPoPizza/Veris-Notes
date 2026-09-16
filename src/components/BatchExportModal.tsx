import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Note, NoteBlock } from '../types';
import { exportNotesBatch } from '../utils/fileExporter';
import { hexToRgba, isLightColor } from '../themes';
import { X, Check, Search, Loader2 } from 'lucide-react';

interface BatchExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'notes' | 'block';
  initialBlockId?: string | null;
}

const FORMATS = [
  { id: 'docx', label: 'DOCX' },
  { id: 'txt', label: 'TXT' },
  { id: 'md', label: 'MD' },
  { id: 'html', label: 'HTML' },
  { id: 'rtf', label: 'RTF' },
  { id: 'json', label: 'JSON' },
  { id: 'pdf', label: 'PDF' },
];

export const BatchExportModal: React.FC<BatchExportModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'notes',
  initialBlockId = null,
}) => {
  const { notes, blocks, theme } = useApp();

  const [exportScope, setExportScope] = useState<'notes' | 'block'>(initialMode);
  const [selectedBlockId, setSelectedBlockId] = useState<string>(() => {
    if (initialBlockId && blocks.some(b => b.id === initialBlockId)) {
      return initialBlockId;
    }
    return blocks.length > 0 ? blocks[0].id : '';
  });

  // Array of note IDs preserving the user's click order:
  // First selected is first in array (top in merged doc), last selected is last
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [packagingMode, setPackagingMode] = useState<'single' | 'separate'>('single');
  const [formatId, setFormatId] = useState<string>('docx');

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter out private notes
  const activeNotes = useMemo(() => {
    return notes.filter(n => !n.isPrivate);
  }, [notes]);

  const getNotesForBlock = (block: NoteBlock, notesList: Note[]) => {
    const list = notesList.filter(n => !n.isPrivate);
    if (block.id === 'pinned' || block.type === 'pinned') {
      return list.filter(n => n.pinned);
    } else if (block.id === 'general' || block.type === 'general') {
      return list.filter(n => !n.pinned && (!n.blockId || n.blockId === 'general'));
    } else {
      return list.filter(n => !n.pinned && n.blockId === block.id);
    }
  };

  // Synchronize on open
  useEffect(() => {
    if (isOpen) {
      setExportScope(initialMode);
      if (initialBlockId && blocks.some(b => b.id === initialBlockId)) {
        setSelectedBlockId(initialBlockId);
      } else if (blocks.length > 0) {
        setSelectedBlockId(blocks[0].id);
      }
      setSelectedNoteIds([]);
      setSearchQuery('');
      setExportSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen, initialMode, initialBlockId, blocks, activeNotes]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return activeNotes;
    const q = searchQuery.toLowerCase();
    return activeNotes.filter(
      n =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q)) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(q)))
    );
  }, [activeNotes, searchQuery]);

  const blockNotes = useMemo(() => {
    if (!selectedBlockId) return [];
    const block = blocks.find(b => b.id === selectedBlockId);
    if (!block) return [];
    return getNotesForBlock(block, activeNotes);
  }, [selectedBlockId, blocks, activeNotes]);

  // Notes ordered strictly by user's selection order:
  // First chosen is top (index 0), last chosen is bottom
  const notesToExport = useMemo(() => {
    if (exportScope === 'block') {
      return blockNotes;
    }
    const noteMap = new Map(activeNotes.map(n => [n.id, n]));
    return selectedNoteIds
      .map(id => noteMap.get(id))
      .filter((n): n is Note => Boolean(n));
  }, [exportScope, blockNotes, activeNotes, selectedNoteIds]);

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNoteIds(prev => {
      if (prev.includes(noteId)) {
        return prev.filter(id => id !== noteId);
      }
      return [...prev, noteId];
    });
  };

  const allFilteredSelected =
    filteredNotes.length > 0 && filteredNotes.every(n => selectedNoteIds.includes(n.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedNoteIds(prev => prev.filter(id => !filteredNotes.some(fn => fn.id === id)));
    } else {
      setSelectedNoteIds(prev => [
        ...prev,
        ...filteredNotes.filter(fn => !prev.includes(fn.id)).map(fn => fn.id),
      ]);
    }
  };

  const handleExport = async () => {
    if (notesToExport.length === 0) return;

    setIsExporting(true);
    setErrorMessage(null);

    try {
      let collectionTitle = 'Заметки';
      let customFilename = '';

      if (exportScope === 'block') {
        const block = blocks.find(b => b.id === selectedBlockId);
        if (block) {
          collectionTitle = block.name;
          customFilename = block.name;
        }
      } else if (notesToExport.length === 1) {
        collectionTitle = notesToExport[0].title?.trim() || 'Заметка';
        customFilename = notesToExport[0].title?.trim() || 'Заметка';
      } else if (notesToExport.length > 1) {
        const first = notesToExport[0].title?.trim();
        const last = notesToExport[notesToExport.length - 1].title?.trim();
        if (first && last && first !== last) {
          collectionTitle = `${first} - ${last}`;
          customFilename = `${first} - ${last}`;
        } else if (first) {
          collectionTitle = `${first} (+${notesToExport.length - 1})`;
          customFilename = `${first}_и_еще_${notesToExport.length - 1}`;
        } else {
          collectionTitle = `Заметки_${notesToExport.length}`;
          customFilename = `Заметки_${notesToExport.length}`;
        }
      }

      await exportNotesBatch(notesToExport, packagingMode, formatId, {
        collectionTitle,
        customFilename,
      });

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ошибка экспорта');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const accentContrast = isLightColor(theme.accent) ? '#111111' : '#ffffff';

  return (
    <div
      id="batch-export-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="batch-export-modal-container"
        className="w-full max-w-sm rounded-3xl p-5 shadow-2xl flex flex-col space-y-4"
        style={{
          backgroundColor: hexToRgba(theme.bg, 0.98),
          color: theme.text,
          boxShadow: `0 24px 60px -12px ${hexToRgba(theme.text, 0.18)}`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-base font-bold">Экспорт</span>
          <button
            type="button"
            id="close-batch-export-modal-btn"
            onClick={onClose}
            className="p-1 rounded-full opacity-60 hover:opacity-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. Функция: Блок / Заметки */}
        <div className="flex rounded-xl p-0.5" style={{ backgroundColor: hexToRgba(theme.text, 0.05) }}>
          <button
            type="button"
            id="export-scope-block-btn"
            onClick={() => setExportScope('block')}
            style={{
              backgroundColor: exportScope === 'block' ? theme.accent : 'transparent',
              color: exportScope === 'block' ? accentContrast : hexToRgba(theme.text, 0.7),
            }}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer text-center"
          >
            Блок
          </button>
          <button
            type="button"
            id="export-scope-notes-btn"
            onClick={() => setExportScope('notes')}
            style={{
              backgroundColor: exportScope === 'notes' ? theme.accent : 'transparent',
              color: exportScope === 'notes' ? accentContrast : hexToRgba(theme.text, 0.7),
            }}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer text-center"
          >
            Заметки
          </button>
        </div>

        {/* 2. Выбор: блок или заметки */}
        {exportScope === 'block' ? (
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto py-1">
            {blocks.length === 0 ? (
              <div className="text-xs opacity-50 py-2">Нет блоков</div>
            ) : (
              blocks.map(block => {
                const isSelected = selectedBlockId === block.id;
                const count = getNotesForBlock(block, activeNotes).length;
                return (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => setSelectedBlockId(block.id)}
                    style={{
                      backgroundColor: isSelected ? theme.accent : hexToRgba(theme.text, 0.04),
                      color: isSelected ? accentContrast : hexToRgba(theme.text, 0.85),
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{block.name}</span>
                    <span className="opacity-50 text-[10px]">({count})</span>
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl flex-1 text-xs"
                style={{ backgroundColor: hexToRgba(theme.text, 0.04) }}
              >
                <Search size={13} className="opacity-40 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full bg-transparent outline-none placeholder:opacity-40"
                />
              </div>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-semibold px-2 py-1 opacity-70 hover:opacity-100 transition cursor-pointer shrink-0"
              >
                {allFilteredSelected ? 'Снять' : 'Все'}
              </button>
            </div>

            {selectedNoteIds.length > 0 && (
              <div className="text-[10px] opacity-65 flex items-center justify-between px-1">
                <span>Выбрано: {selectedNoteIds.length}</span>
                <span>Порядок: 1 (вверху) → {selectedNoteIds.length} (внизу)</span>
              </div>
            )}

            <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5">
              {filteredNotes.length === 0 ? (
                <div className="text-xs opacity-50 py-3 text-center">Заметки не найдены</div>
              ) : (
                filteredNotes.map(note => {
                  const orderIndex = selectedNoteIds.indexOf(note.id);
                  const isChecked = orderIndex !== -1;
                  return (
                    <div
                      key={note.id}
                      onClick={() => toggleNoteSelection(note.id)}
                      className="flex items-center gap-2 py-1.5 px-2 rounded-xl cursor-pointer transition select-none text-xs"
                      style={{
                        backgroundColor: isChecked ? hexToRgba(theme.accent, 0.08) : 'transparent',
                        color: isChecked ? theme.accent : theme.text,
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center border text-[10px] font-bold transition shrink-0"
                        style={{
                          borderColor: isChecked ? theme.accent : hexToRgba(theme.text, 0.3),
                          backgroundColor: isChecked ? theme.accent : 'transparent',
                          color: accentContrast,
                        }}
                      >
                        {isChecked ? orderIndex + 1 : null}
                      </div>
                      <span className="truncate flex-1 font-medium">
                        {note.title?.trim() || 'Без названия'}
                      </span>
                      {isChecked && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.2 rounded-md shrink-0 opacity-70"
                          style={{ backgroundColor: hexToRgba(theme.accent, 0.15), color: theme.accent }}
                        >
                          #{orderIndex + 1}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 3. Как экспортировать: Один файл / Архив ZIP */}
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <button
              type="button"
              id="packaging-single-btn"
              onClick={() => setPackagingMode('single')}
              style={{
                backgroundColor: packagingMode === 'single' ? theme.accent : hexToRgba(theme.text, 0.04),
                color: packagingMode === 'single' ? accentContrast : hexToRgba(theme.text, 0.75),
              }}
              className="flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer text-center"
            >
              Один файл ({formatId.toUpperCase()})
            </button>
            <button
              type="button"
              id="packaging-separate-btn"
              onClick={() => setPackagingMode('separate')}
              style={{
                backgroundColor: packagingMode === 'separate' ? theme.accent : hexToRgba(theme.text, 0.04),
                color: packagingMode === 'separate' ? accentContrast : hexToRgba(theme.text, 0.75),
              }}
              className="flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer text-center"
            >
              Архив (ZIP)
            </button>
          </div>
          <div className="text-[10px] opacity-50 text-center px-1">
            {packagingMode === 'single'
              ? `Все заметки будут объединены в 1 файл .${formatId} (первая выбранная — в самом верху)`
              : `Каждая заметка сохранится отдельным файлом внутри архива .zip`}
          </div>
        </div>

        {/* 4. Формат */}
        <div className="flex flex-wrap gap-1.5">
          {FORMATS.map(f => {
            const isSelected = formatId === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormatId(f.id)}
                style={{
                  backgroundColor: isSelected ? theme.accent : hexToRgba(theme.text, 0.04),
                  color: isSelected ? accentContrast : hexToRgba(theme.text, 0.75),
                }}
                className="flex-1 min-w-[42px] py-1.5 px-2 rounded-xl text-xs font-semibold transition cursor-pointer text-center"
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Messages */}
        {errorMessage && (
          <div className="text-xs text-center text-red-500 font-medium">{errorMessage}</div>
        )}
        {exportSuccess && (
          <div className="text-xs text-center font-medium" style={{ color: theme.accent }}>
            Готово! Загрузка началась
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          id="confirm-batch-export-btn"
          disabled={isExporting || notesToExport.length === 0}
          onClick={handleExport}
          style={{
            backgroundColor: theme.accent,
            color: accentContrast,
          }}
          className="w-full py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-md"
        >
          {isExporting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Экспорт...</span>
            </>
          ) : (
            <span>
              {packagingMode === 'single'
                ? `Скачать один файл .${formatId} (${notesToExport.length})`
                : `Скачать архив .zip (${notesToExport.length})`}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default BatchExportModal;
