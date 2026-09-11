import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { hexToRgba, isLightColor } from '../themes';
import { X, Layers, Search, Check, FileText } from 'lucide-react';

export const CreateBlockModal: React.FC = () => {
  const {
    isCreateBlockModalOpen,
    closeCreateBlockModal,
    blockModalInitialNoteIds,
    editingBlock,
    createBlock,
    updateBlock,
    notes,
    theme,
    quickSettings,
    moveNotesToBlock,
  } = useApp();

  const [blockName, setBlockName] = useState('');
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const isLight = isLightColor(theme.bg);
  const cardBg = hexToRgba(theme.text, 0.05);
  const cardBorder = quickSettings.showBorder
    ? theme.accent
    : hexToRgba(theme.text, 0.12);

  useEffect(() => {
    if (isCreateBlockModalOpen) {
      if (editingBlock) {
        setBlockName(editingBlock.name);
        const currentBlockNoteIds = notes
          .filter(n => n.blockId === editingBlock.id)
          .map(n => n.id);
        setSelectedNoteIds(currentBlockNoteIds);
      } else {
        setBlockName('');
        setSelectedNoteIds(blockModalInitialNoteIds || []);
      }
      setSearchQuery('');
    }
  }, [isCreateBlockModalOpen, editingBlock, blockModalInitialNoteIds, notes]);

  const filteredNotes = useMemo(() => {
    const publicNotes = notes.filter(n => !n.isPrivate);
    if (!searchQuery.trim()) return publicNotes;
    const q = searchQuery.toLowerCase().trim();
    return publicNotes.filter(
      n =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q)) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(q)))
    );
  }, [notes, searchQuery]);

  if (!isCreateBlockModalOpen) return null;

  const handleSave = () => {
    const trimmed = blockName.trim();
    if (!trimmed) return;

    if (editingBlock) {
      updateBlock(editingBlock.id, trimmed);
      // Remove unselected notes from block
      const notesToRemove = notes.filter(n => n.blockId === editingBlock.id && !selectedNoteIds.includes(n.id)).map(n => n.id);
      if (notesToRemove.length > 0) {
        moveNotesToBlock(notesToRemove, null);
      }
      if (selectedNoteIds.length > 0) {
        moveNotesToBlock(selectedNoteIds, editingBlock.id);
      }
    } else {
      createBlock(trimmed, selectedNoteIds);
    }

    closeCreateBlockModal();
  };

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNoteIds(prev =>
      prev.includes(noteId) ? prev.filter(id => id !== noteId) : [...prev, noteId]
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-md animate-fadeIn"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
      onClick={closeCreateBlockModal}
    >
      <div
        className="w-full max-w-md rounded-3xl p-4 sm:p-6 shadow-2xl transition-all border backdrop-blur-2xl flex flex-col max-h-[85vh] overflow-hidden"
        style={{
          backgroundColor: hexToRgba(theme.bg, 0.96),
          color: theme.text,
          borderColor: cardBorder,
          boxShadow: `0 25px 60px ${hexToRgba(theme.text, 0.15)}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1 mb-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <Layers size={20} style={{ color: theme.accent }} />
            <h3 className="text-base font-extrabold tracking-tight">
              {editingBlock ? 'Редактировать блок' : 'Новый блок'}
            </h3>
          </div>
          <button
            onClick={closeCreateBlockModal}
            className="p-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer"
            style={{ color: theme.text }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Block Name Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider opacity-65">
              Название блока
            </label>
            <input
              type="text"
              value={blockName}
              onChange={e => setBlockName(e.target.value)}
              placeholder="Например: Проекты, Идеи, Личное..."
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-2xl border text-xs sm:text-sm font-semibold outline-none transition"
              style={{
                backgroundColor: cardBg,
                borderColor: cardBorder,
                color: theme.text,
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave();
              }}
            />
          </div>

          {/* Notes Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold uppercase tracking-wider opacity-65">
                Включить заметки
              </label>
              <span className="text-[11px] font-bold opacity-60">
                Выбрано: {selectedNoteIds.length}
              </span>
            </div>

            {/* Search within notes */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-2xl border transition"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              <Search size={14} className="opacity-40 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск заметки..."
                className="w-full bg-transparent text-xs outline-none placeholder:opacity-40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-0.5 rounded-md opacity-40 hover:opacity-100 transition cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Notes List */}
            <div
              className="max-h-48 overflow-y-auto rounded-2xl border p-1 space-y-1"
              style={{ backgroundColor: hexToRgba(theme.text, 0.02), borderColor: cardBorder }}
            >
              {filteredNotes.length === 0 ? (
                <div className="p-3 text-center text-xs opacity-50">
                  Заметки не найдены
                </div>
              ) : (
                filteredNotes.map(note => {
                  const isSelected = selectedNoteIds.includes(note.id);
                  return (
                    <div
                      key={note.id}
                      onClick={() => toggleNoteSelection(note.id)}
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
                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                        <FileText size={14} className="shrink-0 opacity-60" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate">
                            {note.title || 'Без названия'}
                          </div>
                          {note.tags && note.tags.length > 0 && (
                            <div className="text-[10px] opacity-50 truncate">
                              {note.tags.map(t => `#${t}`).join(' ')}
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition"
                        style={{
                          backgroundColor: isSelected ? theme.accent : 'transparent',
                          borderColor: isSelected ? theme.accent : hexToRgba(theme.text, 0.3),
                          color: isSelected ? '#000000' : 'transparent',
                        }}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 mt-2 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={closeCreateBlockModal}
            className="px-4 py-2.5 rounded-2xl border text-xs font-bold hover:bg-white/5 active:scale-95 transition cursor-pointer"
            style={{ borderColor: cardBorder }}
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!blockName.trim()}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-5 rounded-2xl font-bold text-xs sm:text-sm text-black transition shadow-md active:scale-98 cursor-pointer ${
              !blockName.trim() ? 'opacity-50 pointer-events-none' : 'hover:opacity-90'
            }`}
            style={{
              backgroundColor: theme.accent,
            }}
          >
            <span>{editingBlock ? 'Сохранить' : 'Создать блок'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
