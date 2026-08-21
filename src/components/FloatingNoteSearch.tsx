import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { hexToRgba, isLightColor } from '../themes';

interface FloatingNoteSearchProps {
  isOpen: boolean;
  onClose: () => void;
  editorRef: React.RefObject<HTMLDivElement | null>;
}

interface SearchMatch {
  range: Range;
  node: Node;
  startOffset: number;
  endOffset: number;
}

/**
 * Calculates optimal high-contrast search highlight colors that will be
 * vividly visible on ANY theme and on top of any text highlight formatting.
 */
function getOptimalHighlightColors(themeBg: string, themeAccent: string) {
  const isLight = isLightColor(themeBg);
  const accentLower = (themeAccent || '').toLowerCase();

  const isYellowAccent =
    accentLower.includes('fbbf24') ||
    accentLower.includes('facc15') ||
    accentLower.includes('f59e0b') ||
    accentLower.includes('eab308') ||
    accentLower.includes('ffd54f') ||
    accentLower.includes('ffc107');

  if (isYellowAccent) {
    return {
      matchBg: isLight ? '#06b6d4' : '#00e5ff',
      matchText: '#000000',
      activeBg: '#d946ef',
      activeText: '#ffffff',
    };
  }

  return {
    matchBg: isLight ? '#facc15' : '#fde047',
    matchText: '#000000',
    activeBg: '#ea580c',
    activeText: '#ffffff',
  };
}

export const FloatingNoteSearch: React.FC<FloatingNoteSearchProps> = ({
  isOpen,
  onClose,
  editorRef,
}) => {
  const { theme } = useApp();
  const [query, setQuery] = useState<string>('');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLight = isLightColor(theme.bg);

  // Set CSS variables for high-contrast highlight colors
  useEffect(() => {
    const colors = getOptimalHighlightColors(theme.bg, theme.accent);
    document.documentElement.style.setProperty('--search-highlight-bg', colors.matchBg);
    document.documentElement.style.setProperty('--search-highlight-text', colors.matchText);
    document.documentElement.style.setProperty('--search-active-bg', colors.activeBg);
    document.documentElement.style.setProperty('--search-active-text', colors.activeText);
  }, [theme.bg, theme.accent]);

  // Clean highlights from CSS Highlights API
  const clearHighlights = useCallback(() => {
    if (
      typeof CSS !== 'undefined' &&
      'highlights' in CSS &&
      typeof (CSS as any).highlights !== 'undefined'
    ) {
      try {
        (CSS as any).highlights.delete('note-search-match');
        (CSS as any).highlights.delete('note-search-active');
      } catch (e) {
        // Safe catch
      }
    }
  }, []);

  // Update highlights whenever matches or currentIndex change
  const applyHighlights = useCallback(
    (currentMatches: SearchMatch[], activeIdx: number) => {
      if (
        typeof CSS === 'undefined' ||
        !('highlights' in CSS) ||
        typeof (window as any).Highlight === 'undefined'
      ) {
        return;
      }

      const HighlightCtor = (window as any).Highlight;

      if (currentMatches.length === 0) {
        clearHighlights();
        return;
      }

      const otherRanges: Range[] = [];
      let activeRange: Range | null = null;

      currentMatches.forEach((m, idx) => {
        if (idx === activeIdx) {
          activeRange = m.range;
        } else {
          otherRanges.push(m.range);
        }
      });

      try {
        if (otherRanges.length > 0) {
          (CSS as any).highlights.set(
            'note-search-match',
            new HighlightCtor(...otherRanges)
          );
        } else {
          (CSS as any).highlights.delete('note-search-match');
        }

        if (activeRange) {
          (CSS as any).highlights.set(
            'note-search-active',
            new HighlightCtor(activeRange)
          );
        } else {
          (CSS as any).highlights.delete('note-search-active');
        }
      } catch (e) {
        // Safe catch
      }
    },
    [clearHighlights]
  );

  // Search logic across contentEditable editor
  const performSearch = useCallback(
    (searchTerm: string) => {
      if (!editorRef.current || !searchTerm.trim()) {
        setMatches([]);
        setCurrentIndex(0);
        clearHighlights();
        return;
      }

      const container = editorRef.current;
      const foundMatches: SearchMatch[] = [];
      const termLower = searchTerm.toLowerCase();

      const treeWalker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: node => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (parent.closest('[contenteditable="false"]')) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      let currentNode: Node | null = treeWalker.nextNode();
      while (currentNode) {
        const text = currentNode.nodeValue || '';
        const textLower = text.toLowerCase();
        let index = textLower.indexOf(termLower);

        while (index !== -1) {
          try {
            const range = document.createRange();
            range.setStart(currentNode, index);
            range.setEnd(currentNode, index + searchTerm.length);
            foundMatches.push({
              range,
              node: currentNode,
              startOffset: index,
              endOffset: index + searchTerm.length,
            });
          } catch (e) {
            // Ignore range creation errors
          }
          index = textLower.indexOf(termLower, index + termLower.length);
        }

        currentNode = treeWalker.nextNode();
      }

      setMatches(foundMatches);
      setCurrentIndex(0);
      applyHighlights(foundMatches, 0);

      // Smoothly scroll to the first match if found
      if (foundMatches.length > 0) {
        const first = foundMatches[0];
        first.node.parentElement?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    },
    [editorRef, clearHighlights, applyHighlights]
  );

  // When isOpen becomes true, auto-focus input immediately so keyboard opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      clearHighlights();
      setQuery('');
      setMatches([]);
      setCurrentIndex(0);
    }
  }, [isOpen, clearHighlights]);

  // Clean up highlights on unmount
  useEffect(() => {
    return () => {
      clearHighlights();
    };
  }, [clearHighlights]);

  // Re-run search when query changes
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    performSearch(val);
  };

  // Re-calculate matches if user types in the editor
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !isOpen || !query.trim()) return;

    const handleEditorInput = () => {
      performSearch(query);
    };

    editor.addEventListener('input', handleEditorInput);
    return () => {
      editor.removeEventListener('input', handleEditorInput);
    };
  }, [editorRef, isOpen, query, performSearch]);

  const handleNextMatch = () => {
    if (matches.length === 0) return;
    const nextIdx = (currentIndex + 1) % matches.length;
    setCurrentIndex(nextIdx);
    applyHighlights(matches, nextIdx);
    matches[nextIdx]?.node.parentElement?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const handlePrevMatch = () => {
    if (matches.length === 0) return;
    const prevIdx = (currentIndex - 1 + matches.length) % matches.length;
    setCurrentIndex(prevIdx);
    applyHighlights(matches, prevIdx);
    matches[prevIdx]?.node.parentElement?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevMatch();
      } else {
        handleNextMatch();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  const handleClose = () => {
    clearHighlights();
    setQuery('');
    setMatches([]);
    setCurrentIndex(0);
    onClose();
  };

  if (!isOpen) return null;

  const bgStyle = isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(28, 28, 30, 0.92)';
  const borderStyle = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.16)';

  return (
    <div
      className="fixed top-18 sm:top-20 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md animate-fadeIn"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="flex items-center gap-2 p-1.5 sm:p-2 rounded-2xl border shadow-2xl backdrop-blur-2xl transition-all"
        style={{
          backgroundColor: bgStyle,
          borderColor: borderStyle,
          color: theme.text,
          boxShadow: isLight
            ? '0 16px 36px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)'
            : '0 16px 36px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.35)',
        }}
      >
        {/* Search Icon */}
        <div className="pl-2 shrink-0 flex items-center justify-center">
          <Search size={17} style={{ color: theme.accent }} />
        </div>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          placeholder="Поиск по заметке..."
          className="flex-1 bg-transparent border-none outline-hidden text-xs sm:text-sm font-medium py-1 px-1 min-w-0"
          style={{ color: theme.text }}
        />

        {/* Clear query button */}
        {query.length > 0 && (
          <button
            onClick={() => {
              setQuery('');
              performSearch('');
              inputRef.current?.focus();
            }}
            className="p-1 rounded-lg opacity-50 hover:opacity-100 hover:bg-white/10 active:scale-95 transition cursor-pointer shrink-0"
            title="Очистить"
          >
            <X size={14} />
          </button>
        )}

        {/* Match Count Badge */}
        {query.trim().length > 0 && (
          <div
            className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full shrink-0 select-none ${
              matches.length > 0
                ? 'bg-amber-500/20 text-amber-500 dark:text-amber-300'
                : 'bg-red-500/20 text-red-500'
            }`}
          >
            {matches.length > 0 ? `${currentIndex + 1} / ${matches.length}` : '0 найдено'}
          </div>
        )}

        {/* Prev / Next Match Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={handlePrevMatch}
            disabled={matches.length === 0}
            className={`p-1.5 rounded-xl transition ${
              matches.length > 0
                ? 'hover:bg-white/10 active:scale-95 cursor-pointer opacity-80 hover:opacity-100'
                : 'opacity-25 cursor-not-allowed'
            }`}
            title="Предыдущее совпадение (Shift+Enter)"
          >
            <ChevronUp size={16} />
          </button>
          <button
            onClick={handleNextMatch}
            disabled={matches.length === 0}
            className={`p-1.5 rounded-xl transition ${
              matches.length > 0
                ? 'hover:bg-white/10 active:scale-95 cursor-pointer opacity-80 hover:opacity-100'
                : 'opacity-25 cursor-not-allowed'
            }`}
            title="Следующее совпадение (Enter)"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-4 bg-current opacity-15 my-auto shrink-0" />

        {/* Dedicated Close Button (крестик) */}
        <button
          onClick={handleClose}
          className="p-1.5 rounded-xl hover:bg-white/15 active:scale-90 transition cursor-pointer shrink-0 opacity-70 hover:opacity-100"
          style={{ color: theme.text }}
          title="Закрыть поиск (Esc)"
        >
          <X size={17} />
        </button>
      </div>
    </div>
  );
};
