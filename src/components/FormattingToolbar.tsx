import React, { useState, useEffect, useRef } from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading,
  Quote,
  Code,
  Highlighter,
  Check,
  Scissors,
  Copy,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { hexToRgba, isLightColor } from '../themes';
import { isColorLight } from '../utils/textUtils';

export const HIGHLIGHT_COLORS = [
  { id: 'mustard', color: '#9E862B', label: 'Горчичный' },
  { id: 'dusty-red', color: '#8C4343', label: 'Пыльно-красный' },
  { id: 'slate-blue', color: '#3B6584', label: 'Серо-синий' },
  { id: 'forest-green', color: '#3D7043', label: 'Лесной зелёный' },
  { id: 'slate-grey', color: '#6B6B6B', label: 'Сланцевый серый' },
  { id: 'deep-purple', color: '#60316E', label: 'Тёмно-фиолетовый' },
  { id: 'bronze', color: '#8C6023', label: 'Бронзовый' },
  { id: 'burgundy', color: '#7A2838', label: 'Бордовый' },
];

interface FormattingToolbarProps {
  selectionRect: DOMRect | null;
  onApplyFormat: () => void;
  oneTimeFormatting: boolean;
}

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  selectionRect,
  onApplyFormat,
  oneTimeFormatting,
}) => {
  const { theme, quickSettings } = useApp();
  const [activeSubmenu, setActiveSubmenu] = useState<'align' | 'heading' | 'color' | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarSize, setToolbarSize] = useState<{ width: number; height: number }>({
    width: 320,
    height: 44,
  });

  // Measure actual toolbar size on render/update
  useEffect(() => {
    if (toolbarRef.current) {
      const rect = toolbarRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setToolbarSize({ width: rect.width, height: rect.height });
      }
    }
  }, [selectionRect, activeSubmenu]);

  // Close submenus when selection disappears
  useEffect(() => {
    if (!selectionRect) {
      setActiveSubmenu(null);
    }
  }, [selectionRect]);

  if (!selectionRect) return null;

  // Compute theme palette colors
  const isLight = isLightColor(theme.bg);

  // Menu backdrop: slightly darker in light theme, slightly lighter in dark theme
  const menuBg = isLight
    ? hexToRgba(theme.text, 0.88)
    : hexToRgba(theme.text, 0.18);

  const menuText = isLight ? theme.bg : theme.text;
  const menuBorder = quickSettings.showBorder ? theme.accent : hexToRgba(menuText, 0.2);

  // Calculate position strictly clamped within viewport boundaries
  const padX = 8;
  const padY = 8;
  const idealLeft = selectionRect.left + selectionRect.width / 2 - toolbarSize.width / 2;
  const maxLeft = Math.max(padX, window.innerWidth - toolbarSize.width - padX);
  const leftPos = Math.max(padX, Math.min(maxLeft, idealLeft));

  // Determine whether to place above or below selection
  const showSubmenuBelow = selectionRect.top < 70;
  const topPos = showSubmenuBelow
    ? Math.min(window.innerHeight - toolbarSize.height - padY, selectionRect.bottom + 8)
    : Math.max(padY, selectionRect.top - toolbarSize.height - 8);

  const submenuPosClass = showSubmenuBelow ? 'top-full mt-2' : 'bottom-full mb-2';

  // Helper to execute document commands safely
  const exec = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    onApplyFormat();
  };

  const handleCut = () => {
    document.execCommand('cut');
    onApplyFormat();
  };

  const handleCopy = () => {
    document.execCommand('copy');
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25);
    }
  };

  // Helper to find existing highlight span in selection or its ancestors
  const getHighlightSpanInSelection = (): HTMLElement | null => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return null;

    let node: Node | null = sel.anchorNode;
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    let span = (node as HTMLElement)?.closest('span[data-highlight="true"]') as HTMLElement | null;
    if (span) return span;

    try {
      const range = sel.getRangeAt(0);
      const container = document.createElement('div');
      container.appendChild(range.cloneContents());
      const internalSpan = container.querySelector('span[data-highlight="true"]');
      if (internalSpan) {
        const allSpans = document.querySelectorAll('span[data-highlight="true"]');
        for (let i = 0; i < allSpans.length; i++) {
          if (sel.containsNode(allSpans[i], true)) {
            return allSpans[i] as HTMLElement;
          }
        }
      }
    } catch (e) {
      // ignore
    }

    return null;
  };

  // Helper to normalize hex or rgb strings for accurate comparison
  const hexOrRgbMatch = (c1: string | null, c2: string | null): boolean => {
    if (!c1 || !c2) return false;
    const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, '');
    if (normalize(c1) === normalize(c2)) return true;

    const hexToRgb = (hex: string) => {
      let cleanHex = hex.replace('#', '');
      if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(x => x + x).join('');
      }
      if (cleanHex.length === 6) {
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);
        return `rgb(${r},${g},${b})`;
      }
      return null;
    };

    const n1 = normalize(c1);
    const n2 = normalize(c2);

    if (n1.startsWith('#')) {
      const rgb = hexToRgb(n1);
      if (rgb && normalize(rgb) === n2) return true;
    }
    if (n2.startsWith('#')) {
      const rgb = hexToRgb(n2);
      if (rgb && normalize(rgb) === n1) return true;
    }

    return false;
  };

  // Detect active styles on current selection for accessible indicators
  const checkFormatState = () => {
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) {
      return {
        isBold: false,
        isItalic: false,
        isUnderline: false,
        isQuoteActive: false,
        isCodeActive: false,
        activeHeadingTag: 'p',
        activeAlignment: 'left' as 'left' | 'center' | 'right',
        isHighlightActive: false,
        activeColorHex: null,
      };
    }

    let node: Node | null = sel.anchorNode;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    const el = node as HTMLElement | null;

    let isBold = false;
    let isItalic = false;
    let isUnderline = false;

    try {
      isBold = document.queryCommandState('bold');
      isItalic = document.queryCommandState('italic');
      isUnderline = document.queryCommandState('underline');
    } catch (e) {
      // fallback
    }

    const isQuoteActive = !!el?.closest('blockquote');
    const isCodeActive = !!el?.closest('pre, code');

    const headingEl = el?.closest('h1, h2, h3, h4');
    const activeHeadingTag = headingEl ? headingEl.tagName.toLowerCase() : 'p';

    const alignElem = el?.closest('p, div, h1, h2, h3, h4') as HTMLElement | null;
    const textAlign = alignElem?.style?.textAlign || '';
    let activeAlignment: 'left' | 'center' | 'right' = 'left';
    if (textAlign === 'center') activeAlignment = 'center';
    else if (textAlign === 'right') activeAlignment = 'right';

    const highlightSpan = getHighlightSpanInSelection();
    const isHighlightActive = !!highlightSpan;
    const activeColorHex = highlightSpan
      ? highlightSpan.getAttribute('data-color') || highlightSpan.style.backgroundColor
      : null;

    return {
      isBold,
      isItalic,
      isUnderline,
      isQuoteActive,
      isCodeActive,
      activeHeadingTag,
      activeAlignment,
      isHighlightActive,
      activeColorHex,
    };
  };

  const {
    isBold,
    isItalic,
    isUnderline,
    isQuoteActive,
    isCodeActive,
    activeHeadingTag,
    activeAlignment,
    isHighlightActive,
    activeColorHex,
  } = checkFormatState();

  // Toggle Quote on / off
  const handleQuoteToggle = () => {
    if (isQuoteActive) {
      document.execCommand('formatBlock', false, '<p>');
    } else {
      document.execCommand('formatBlock', false, '<blockquote>');
    }
    onApplyFormat();
  };

  // Toggle Code on / off
  const handleCodeToggle = () => {
    if (isCodeActive) {
      document.execCommand('formatBlock', false, '<p>');
    } else {
      document.execCommand('formatBlock', false, '<pre>');
    }
    onApplyFormat();
  };

  // Handle color highlight toggle / switch
  const handleColorClick = (colorHex: string) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;

    const existingSpan = getHighlightSpanInSelection();

    if (existingSpan) {
      const existingColor =
        existingSpan.getAttribute('data-color') || existingSpan.style.backgroundColor;

      // If clicking same color -> REMOVE highlight
      if (hexOrRgbMatch(existingColor, colorHex)) {
        const parent = existingSpan.parentNode;
        if (parent) {
          while (existingSpan.firstChild) {
            parent.insertBefore(existingSpan.firstChild, existingSpan);
          }
          parent.removeChild(existingSpan);
        }
        onApplyFormat();
        return;
      } else {
        // Change color on existing span
        const isLightTxt = isColorLight(colorHex);
        existingSpan.style.backgroundColor = colorHex;
        existingSpan.style.color = isLightTxt ? '#000000' : '#FFFFFF';
        existingSpan.setAttribute('data-color', colorHex);

        // Remove any nested highlight spans
        const innerSpans = existingSpan.querySelectorAll('span[data-highlight="true"]');
        innerSpans.forEach(inner => {
          while (inner.firstChild) {
            inner.parentNode?.insertBefore(inner.firstChild, inner);
          }
          inner.parentNode?.removeChild(inner);
        });

        onApplyFormat();
        return;
      }
    }

    // Wrap selection in a new highlight span
    const range = sel.getRangeAt(0);
    const isLightTxt = isColorLight(colorHex);
    const span = document.createElement('span');
    span.setAttribute('data-highlight', 'true');
    span.setAttribute('data-color', colorHex);
    span.style.backgroundColor = colorHex;
    span.style.color = isLightTxt ? '#000000' : '#FFFFFF';
    span.style.padding = '2px 8px';
    span.style.borderRadius = '8px';
    span.style.display = 'inline';
    span.style.boxDecorationBreak = 'clone';
    (span.style as any).webkitBoxDecorationBreak = 'clone';

    try {
      range.surroundContents(span);
    } catch (e) {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
    }

    onApplyFormat();
  };

  // Active button inline styling per prompt requirement
  const getBtnStyle = (isActive: boolean) => {
    if (isActive) {
      return {
        color: theme.accent,
        backgroundColor: theme.bg,
      };
    }
    return {
      color: menuText,
      backgroundColor: 'transparent',
    };
  };

  // Dynamic Alignment Icon for main toolbar button
  const AlignmentIcon =
    activeAlignment === 'center'
      ? AlignCenter
      : activeAlignment === 'right'
      ? AlignRight
      : AlignLeft;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 animate-fadeIn pointer-events-auto select-none"
      style={{
        top: `${topPos}px`,
        left: `${leftPos}px`,
      }}
      onContextMenu={e => e.preventDefault()}
      onMouseDown={e => e.preventDefault()} // Keep text selection active when clicking toolbar
    >
      {/* Main Bar */}
      <div
        className="flex items-center gap-0.5 sm:gap-1 p-1 sm:p-1.5 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all max-w-[calc(100vw-16px)] overflow-x-auto no-scrollbar"
        style={{
          backgroundColor: menuBg,
          borderColor: menuBorder,
          color: menuText,
        }}
      >
        {/* Cut Button */}
        <button
          onClick={handleCut}
          style={getBtnStyle(false)}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-medium text-xs flex items-center justify-center shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95 shadow-2xs"
          title="Вырезать"
        >
          <Scissors size={14} className="sm:w-[15px] sm:h-[15px]" />
        </button>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          style={getBtnStyle(false)}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-medium text-xs flex items-center justify-center shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95 shadow-2xs"
          title="Копировать"
        >
          <Copy size={14} className="sm:w-[15px] sm:h-[15px]" />
        </button>

        <div
          className="w-[1px] h-4 sm:h-5 my-auto mx-0.5 shrink-0"
          style={{ backgroundColor: hexToRgba(menuText, 0.2) }}
        />

        {/* Bold B */}
        <button
          onClick={() => exec('bold')}
          style={getBtnStyle(isBold)}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95 shadow-2xs"
          title="Жирный"
        >
          B
        </button>

        {/* Italic I */}
        <button
          onClick={() => exec('italic')}
          style={getBtnStyle(isItalic)}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-extrabold italic text-xs sm:text-sm flex items-center justify-center shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95 shadow-2xs"
          title="Курсив"
        >
          I
        </button>

        {/* Underline U */}
        <button
          onClick={() => exec('underline')}
          style={getBtnStyle(isUnderline)}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-extrabold underline text-xs sm:text-sm flex items-center justify-center shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95 shadow-2xs"
          title="Подчёркнутый"
        >
          U
        </button>

        <div
          className="w-[1px] h-4 sm:h-5 my-auto mx-0.5 shrink-0"
          style={{ backgroundColor: hexToRgba(menuText, 0.2) }}
        />

        {/* Alignment Submenu Button */}
        <button
          onClick={() => setActiveSubmenu(prev => (prev === 'align' ? null : 'align'))}
          style={
            activeSubmenu === 'align'
              ? { color: theme.accent, backgroundColor: hexToRgba(menuText, 0.15) }
              : { color: menuText }
          }
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95"
          title="Выравнивание"
        >
          <AlignmentIcon size={14} className="sm:w-4 sm:h-4" />
        </button>

        {/* Heading Submenu Button */}
        <button
          onClick={() => setActiveSubmenu(prev => (prev === 'heading' ? null : 'heading'))}
          style={
            activeSubmenu === 'heading'
              ? { color: theme.accent, backgroundColor: hexToRgba(menuText, 0.15) }
              : { color: menuText }
          }
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95"
          title="Заголовки (H1-H4)"
        >
          H
        </button>

        {/* Quote Button (Toggle) */}
        <button
          onClick={handleQuoteToggle}
          style={getBtnStyle(isQuoteActive)}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95 shadow-2xs"
          title="Цитата (повторное нажатие отменяет)"
        >
          <Quote size={14} className="sm:w-[15px] sm:h-[15px]" />
        </button>

        {/* Code Button (Toggle) */}
        <button
          onClick={handleCodeToggle}
          style={getBtnStyle(isCodeActive)}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95 shadow-2xs"
          title="Код (повторное нажатие отменяет)"
        >
          <Code size={14} className="sm:w-[15px] sm:h-[15px]" />
        </button>

        <div
          className="w-[1px] h-4 sm:h-5 my-auto mx-0.5 shrink-0"
          style={{ backgroundColor: hexToRgba(menuText, 0.2) }}
        />

        {/* Highlight Color Button */}
        <button
          onClick={() => setActiveSubmenu(prev => (prev === 'color' ? null : 'color'))}
          style={
            isHighlightActive && activeColorHex
              ? {
                  backgroundColor: activeColorHex,
                  color: isColorLight(activeColorHex) ? '#000000' : '#FFFFFF',
                }
              : getBtnStyle(activeSubmenu === 'color')
          }
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95 shadow-2xs"
          title="Выделение цветом"
        >
          <Highlighter size={14} className="sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Submenu 1: Alignment */}
      {activeSubmenu === 'align' && (
        <div
          className={`absolute left-0 ${submenuPosClass} w-36 p-1.5 rounded-2xl shadow-2xl border backdrop-blur-xl animate-fadeIn space-y-1 text-xs font-bold z-50`}
          style={{
            backgroundColor: menuBg,
            borderColor: menuBorder,
            color: menuText,
          }}
        >
          <button
            onClick={() => {
              exec('justifyLeft');
              setActiveSubmenu(null);
            }}
            style={{
              backgroundColor: activeAlignment === 'left' ? theme.bg : 'transparent',
              color: activeAlignment === 'left' ? theme.accent : menuText,
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition cursor-pointer text-left hover:opacity-90"
          >
            <div className="flex items-center gap-1.5">
              <AlignLeft size={14} />
              <span>Слева</span>
            </div>
            {activeAlignment === 'left' && (
              <Check size={16} strokeWidth={3} style={{ color: theme.accent }} />
            )}
          </button>

          <button
            onClick={() => {
              exec('justifyCenter');
              setActiveSubmenu(null);
            }}
            style={{
              backgroundColor: activeAlignment === 'center' ? theme.bg : 'transparent',
              color: activeAlignment === 'center' ? theme.accent : menuText,
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition cursor-pointer text-left hover:opacity-90"
          >
            <div className="flex items-center gap-1.5">
              <AlignCenter size={14} />
              <span>По центру</span>
            </div>
            {activeAlignment === 'center' && (
              <Check size={16} strokeWidth={3} style={{ color: theme.accent }} />
            )}
          </button>

          <button
            onClick={() => {
              exec('justifyRight');
              setActiveSubmenu(null);
            }}
            style={{
              backgroundColor: activeAlignment === 'right' ? theme.bg : 'transparent',
              color: activeAlignment === 'right' ? theme.accent : menuText,
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition cursor-pointer text-left hover:opacity-90"
          >
            <div className="flex items-center gap-1.5">
              <AlignRight size={14} />
              <span>Справа</span>
            </div>
            {activeAlignment === 'right' && (
              <Check size={16} strokeWidth={3} style={{ color: theme.accent }} />
            )}
          </button>
        </div>
      )}

      {/* Submenu 2: Headings (H1 - H4) */}
      {activeSubmenu === 'heading' && (
        <div
          className={`absolute left-4 sm:left-10 ${submenuPosClass} w-44 p-1.5 rounded-2xl shadow-2xl border backdrop-blur-xl animate-fadeIn space-y-1 text-xs font-bold z-50 max-h-[80vh] overflow-y-auto`}
          style={{
            backgroundColor: menuBg,
            borderColor: menuBorder,
            color: menuText,
          }}
        >
          <button
            onClick={() => {
              exec('formatBlock', '<h1>');
              setActiveSubmenu(null);
            }}
            style={{
              backgroundColor: activeHeadingTag === 'h1' ? theme.bg : 'transparent',
              color: activeHeadingTag === 'h1' ? theme.accent : menuText,
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition cursor-pointer text-left font-extrabold text-base hover:opacity-90"
          >
            <span>Заголовок H1</span>
            {activeHeadingTag === 'h1' && (
              <Check size={16} strokeWidth={3} style={{ color: theme.accent }} />
            )}
          </button>

          <button
            onClick={() => {
              exec('formatBlock', '<h2>');
              setActiveSubmenu(null);
            }}
            style={{
              backgroundColor: activeHeadingTag === 'h2' ? theme.bg : 'transparent',
              color: activeHeadingTag === 'h2' ? theme.accent : menuText,
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition cursor-pointer text-left font-bold text-sm hover:opacity-90"
          >
            <span>Заголовок H2</span>
            {activeHeadingTag === 'h2' && (
              <Check size={16} strokeWidth={3} style={{ color: theme.accent }} />
            )}
          </button>

          <button
            onClick={() => {
              exec('formatBlock', '<h3>');
              setActiveSubmenu(null);
            }}
            style={{
              backgroundColor: activeHeadingTag === 'h3' ? theme.bg : 'transparent',
              color: activeHeadingTag === 'h3' ? theme.accent : menuText,
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition cursor-pointer text-left font-semibold text-xs hover:opacity-90"
          >
            <span>Заголовок H3</span>
            {activeHeadingTag === 'h3' && (
              <Check size={16} strokeWidth={3} style={{ color: theme.accent }} />
            )}
          </button>

          <button
            onClick={() => {
              exec('formatBlock', '<h4>');
              setActiveSubmenu(null);
            }}
            style={{
              backgroundColor: activeHeadingTag === 'h4' ? theme.bg : 'transparent',
              color: activeHeadingTag === 'h4' ? theme.accent : menuText,
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition cursor-pointer text-left font-medium text-xs hover:opacity-90"
          >
            <span>Заголовок H4</span>
            {activeHeadingTag === 'h4' && (
              <Check size={16} strokeWidth={3} style={{ color: theme.accent }} />
            )}
          </button>

          <div
            className="h-px my-1"
            style={{ backgroundColor: hexToRgba(menuText, 0.15) }}
          />

          <button
            onClick={() => {
              exec('formatBlock', '<p>');
              setActiveSubmenu(null);
            }}
            style={{
              backgroundColor: activeHeadingTag === 'p' ? theme.bg : 'transparent',
              color: activeHeadingTag === 'p' ? theme.accent : menuText,
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition cursor-pointer text-left opacity-90 hover:opacity-100"
          >
            <span>Обычный текст</span>
            {activeHeadingTag === 'p' && (
              <Check size={16} strokeWidth={3} style={{ color: theme.accent }} />
            )}
          </button>
        </div>
      )}

      {/* Submenu 3: Color Palette */}
      {activeSubmenu === 'color' && (
        <div
          className={`absolute ${leftPos + toolbarSize.width > 220 ? 'right-0' : 'left-0'} ${submenuPosClass} p-2.5 sm:p-3 rounded-2xl shadow-2xl border backdrop-blur-xl animate-fadeIn z-50`}
          style={{
            backgroundColor: menuBg,
            borderColor: menuBorder,
          }}
        >
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-44 sm:w-48">
            {HIGHLIGHT_COLORS.map(c => {
              const isColorActive =
                activeColorHex && hexOrRgbMatch(activeColorHex, c.color);

              return (
                <button
                  key={c.id}
                  onClick={() => handleColorClick(c.color)}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl transition cursor-pointer flex items-center justify-center relative shadow-sm ${
                    isColorActive
                      ? 'ring-2 ring-white ring-offset-2 scale-105'
                      : 'hover:scale-105 opacity-90 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.label}
                >
                  {isColorActive && (
                    <Check size={15} strokeWidth={3} className="text-white drop-shadow-md font-extrabold" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
