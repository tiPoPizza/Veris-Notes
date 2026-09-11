import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Layers, Trash2, ArrowRightLeft, X, AlertTriangle, ChevronDown, Check } from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';

export const DeleteBlockModal: React.FC = () => {
  const {
    isDeleteBlockModalOpen,
    blockToDelete,
    closeDeleteBlockModal,
    confirmDeleteBlock,
    blocks,
    notes,
    theme,
  } = useApp();

  const isLight = isLightColor(theme.bg);

  // Target block for transferring notes (default to 'general' or first other block)
  const [targetBlockId, setTargetBlockId] = useState<string>('general');
  const [deleteOption, setDeleteOption] = useState<'transfer' | 'delete_notes'>('transfer');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Count notes currently in this block
  const blockNotes = blockToDelete
    ? notes.filter(n => {
        if (blockToDelete.id === 'pinned' || blockToDelete.type === 'pinned') return n.pinned;
        if (blockToDelete.id === 'general' || blockToDelete.type === 'general') {
          return !n.pinned && (!n.blockId || n.blockId === 'general');
        }
        return !n.pinned && n.blockId === blockToDelete.id;
      })
    : [];

  // Available target blocks (exclude the block being deleted)
  const availableTargetBlocks = blocks.filter(b => b.id !== blockToDelete?.id);
  const selectedTargetBlock = availableTargetBlocks.find(b => b.id === targetBlockId) || availableTargetBlocks[0];

  useEffect(() => {
    if (availableTargetBlocks.length > 0) {
      const defaultTarget = availableTargetBlocks.find(b => b.id === 'general') || availableTargetBlocks[0];
      setTargetBlockId(defaultTarget.id);
    }
  }, [blockToDelete, blocks]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  if (!isDeleteBlockModalOpen || !blockToDelete) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={closeDeleteBlockModal}
    >
      <div
        className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-2xl transition-all animate-scaleUp"
        style={{
          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.96)' : hexToRgba(theme.bg, 0.96),
          borderColor: hexToRgba(theme.text, 0.15),
          color: theme.text,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 border-b"
          style={{ borderColor: hexToRgba(theme.text, 0.1) }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-red-400"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)' }}
            >
              <Trash2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold line-clamp-1">Удаление блока</h2>
              <p className="text-xs opacity-60 font-medium truncate max-w-[240px]">
                «{blockToDelete.name}»
              </p>
            </div>
          </div>

          <button
            onClick={closeDeleteBlockModal}
            className="p-2 rounded-xl opacity-60 hover:opacity-100 hover:bg-white/10 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4">
          {blockNotes.length === 0 ? (
            <p className="text-xs opacity-80 leading-relaxed font-medium">
              В этом блоке нет заметок. Вы действительно хотите удалить блок <strong>«{blockToDelete.name}»</strong>?
            </p>
          ) : (
            <>
              <div
                className="p-3.5 rounded-2xl border flex items-center gap-3"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.04),
                  borderColor: hexToRgba(theme.text, 0.08),
                }}
              >
                <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                <div className="text-xs font-semibold">
                  В блоке находится{' '}
                  <span style={{ color: theme.accent }} className="font-extrabold">
                    {blockNotes.length}{' '}
                    {blockNotes.length === 1 ? 'заметка' : blockNotes.length < 5 ? 'заметки' : 'заметок'}
                  </span>
                  . Что сделать с заметками?
                </div>
              </div>

              {/* Option 1: Transfer Notes */}
              <div
                onClick={() => setDeleteOption('transfer')}
                className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col gap-2.5 ${
                  deleteOption === 'transfer' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor:
                    deleteOption === 'transfer' ? hexToRgba(theme.accent, 0.12) : hexToRgba(theme.text, 0.03),
                  borderColor:
                    deleteOption === 'transfer' ? theme.accent : hexToRgba(theme.text, 0.1),
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <ArrowRightLeft size={15} style={{ color: theme.accent }} />
                    <span>Перенести заметки в другой блок</span>
                  </div>
                  <input
                    type="radio"
                    name="delete_block_option"
                    checked={deleteOption === 'transfer'}
                    onChange={() => setDeleteOption('transfer')}
                    className="accent-purple-500 cursor-pointer"
                  />
                </div>

                {deleteOption === 'transfer' && (
                  <div className="pt-1 relative" ref={dropdownRef}>
                    <label className="text-[11px] font-bold opacity-60 block mb-1">
                      Выберите целевой блок:
                    </label>

                    {/* Custom Styled Dropdown Trigger Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDropdownOpen(!isDropdownOpen);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs active:scale-[0.99]"
                      style={{
                        backgroundColor: isLight ? '#FFFFFF' : hexToRgba(theme.bg, 0.9),
                        borderColor: isDropdownOpen ? theme.accent : hexToRgba(theme.text, 0.2),
                        color: theme.text,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Layers size={14} style={{ color: theme.accent }} />
                        <span className="truncate">{selectedTargetBlock?.name || 'Выберите блок'}</span>
                      </div>
                      <ChevronDown
                        size={15}
                        className={`opacity-70 transition-transform duration-200 ${
                          isDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Custom Styled Dropdown Menu */}
                    {isDropdownOpen && (
                      <div
                        className="mt-1.5 w-full rounded-2xl p-1.5 shadow-2xl border backdrop-blur-2xl z-50 flex flex-col gap-1 text-xs font-bold animate-fadeIn"
                        style={{
                          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : hexToRgba(theme.bg, 0.98),
                          borderColor: hexToRgba(theme.text, 0.18),
                          color: theme.text,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {availableTargetBlocks.map(b => {
                          const isSelected = b.id === targetBlockId;
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                setTargetBlockId(b.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                                isSelected
                                  ? 'shadow-xs'
                                  : 'hover:bg-white/10 opacity-75 hover:opacity-100'
                              }`}
                              style={{
                                backgroundColor: isSelected ? hexToRgba(theme.accent, 0.15) : 'transparent',
                                color: isSelected ? theme.accent : theme.text,
                              }}
                            >
                              <div className="flex items-center gap-2.5">
                                <Layers size={14} style={{ color: isSelected ? theme.accent : hexToRgba(theme.text, 0.5) }} />
                                <span>{b.name}</span>
                              </div>
                              {isSelected && (
                                <div
                                  className="w-4 h-4 rounded-full flex items-center justify-center text-white"
                                  style={{ backgroundColor: theme.accent }}
                                >
                                  <Check size={10} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Option 2: Delete Notes Too */}
              <div
                onClick={() => setDeleteOption('delete_notes')}
                className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                  deleteOption === 'delete_notes' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor:
                    deleteOption === 'delete_notes' ? 'rgba(239, 68, 68, 0.12)' : hexToRgba(theme.text, 0.03),
                  borderColor:
                    deleteOption === 'delete_notes' ? 'rgba(239, 68, 68, 0.5)' : hexToRgba(theme.text, 0.1),
                }}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-red-400">
                  <Trash2 size={15} />
                  <span>Удалить заметки вместе с блоком</span>
                </div>
                <input
                  type="radio"
                  name="delete_block_option"
                  checked={deleteOption === 'delete_notes'}
                  onChange={() => setDeleteOption('delete_notes')}
                  className="accent-red-500 cursor-pointer"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className="p-4 border-t flex items-center justify-end gap-2.5"
          style={{ borderColor: hexToRgba(theme.text, 0.1) }}
        >
          <button
            onClick={closeDeleteBlockModal}
            className="px-4 py-2.5 rounded-xl border text-xs font-bold opacity-75 hover:opacity-100 hover:bg-white/5 active:scale-95 transition cursor-pointer"
            style={{ borderColor: hexToRgba(theme.text, 0.2) }}
          >
            Отмена
          </button>

          {blockNotes.length === 0 ? (
            <button
              onClick={() => confirmDeleteBlock(blockToDelete.id, 'transfer', 'general')}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer active:scale-95 shadow-md"
              style={{
                backgroundColor: theme.accent,
                color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
              }}
            >
              Удалить блок
            </button>
          ) : deleteOption === 'delete_notes' ? (
            <button
              onClick={() => confirmDeleteBlock(blockToDelete.id, 'delete_notes')}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer bg-red-500 text-white hover:bg-red-600 active:scale-95 flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              <span>Удалить блок и заметки</span>
            </button>
          ) : (
            <button
              onClick={() => confirmDeleteBlock(blockToDelete.id, 'transfer', targetBlockId)}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer active:scale-95 shadow-md flex items-center gap-1.5"
              style={{
                backgroundColor: theme.accent,
                color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
              }}
            >
              <Layers size={14} />
              <span>Перенести и удалить блок</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
