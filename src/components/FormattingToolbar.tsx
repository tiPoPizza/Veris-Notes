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
import { FormattingToolbarButtonId, ALL_FORMATTING_TOOLBAR_BUTTONS, DEFAULT_PASTEL_HIGHLIGHT_COLORS } from '../types';

export const HIGHLIGHT_COLORS = DEFAULT_PASTEL_HIGHLIGHT_COLORS;

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
  const alignBtnRef = useRef<HTMLButtonElement>(null);
  const headingBtnRef = useRef<HTMLButtonElement>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);

  const [toolbarSize, setToolbarSize] = useState<{ width: number; height: number }>({
    width: 320,
    height: 44,
  });

  const activeHighlightColors = React.useMemo(() => {
    if (quickSettings.customHighlightColors && quickSettings.customHighlightColors.length === 8) {
      return quickSettings.customHighlightColors.map((color, idx) => ({
        id: `custom-color-${idx}`,
        color,
        label: DEFAULT_PASTEL_HIGHLIGHT_COLORS[idx]?.label || `Цвет ${idx + 1}`,
      }));
    }
    return DEFAULT_PASTEL_HIGHLIGHT_COLORS;
  }, [quickSettings.customHighlightColors]);

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
  const HEADER_HEIGHT = 72;
  const BOTTOM_MARGIN = 16;
  const padX = 8;

  const idealLeft = selectionRect.left + selectionRect.width / 2 - toolbarSize.width / 2;
  const maxLeft = Math.max(padX, window.innerWidth - toolbarSize.width - padX);
  const leftPos = Math.max(padX, Math.min(maxLeft, idealLeft));

  // Determine whether toolbar is placed above or below selection
  const canFitToolbarAbove = selectionRect.top - toolbarSize.height - 8 >= HEADER_HEIGHT;
  const canFitToolbarBelow =
    selectionRect.bottom + 8 + toolbarSize.height <= window.innerHeight - BOTTOM_MARGIN;

  let placeToolbarBelow = false;
  if (!canFitToolbarAbove && canFitToolbarBelow) {
    placeToolbarBelow = true;
  } else if (!canFitToolbarAbove && !canFitToolbarBelow) {
    const spaceBelow = window.innerHeight - selectionRect.bottom;
    const spaceAbove = selectionRect.top - HEADER_HEIGHT;
    placeToolbarBelow = spaceBelow > spaceAbove;
  } else {
    placeToolbarBelow = false;
  }

  const topPos = placeToolbarBelow
    ? Math.min(
        window.innerHeight - toolbarSize.height - BOTTOM_MARGIN,
        Math.max(HEADER_HEIGHT, selectionRect.bottom + 8)
      )
    : Math.max(
        HEADER_HEIGHT,
        Math.min(
          window.innerHeight - toolbarSize.height - BOTTOM_MARGIN,
          selectionRect.top - toolbarSize.height - 8
        )
      );

  // Compute submenu style to guarantee it never extends outside viewport or behind top header
  const getSubmenuPlacementStyle = (
    btnRef: React.RefObject<HTMLButtonElement | null>,
    submenuWidth: number,
    submenuHeight: number
  ): React.CSSProperties => {
    let leftOffset = 0;
    if (btnRef.current && toolbarRef.current) {
      const btnLeft = btnRef.current.offsetLeft;
      const btnWidth = btnRef.current.offsetWidth;
      const idealCenter = btnLeft + btnWidth / 2 - submenuWidth / 2;

      // Since toolbar is at leftPos on screen, screenX = leftPos + leftOffset.
      // We want: padX <= screenX <= window.innerWidth - submenuWidth - padX.
      const minOffset = padX - leftPos;
      const maxOffset = window.innerWidth - submenuWidth - padX - leftPos;
      leftOffset = Math.max(minOffset, Math.min(maxOffset, idealCenter));
    }

    const spaceAbove = topPos - HEADER_HEIGHT;
    const spaceBelow = window.innerHeight - (topPos + toolbarSize.height) - BOTTOM_MARGIN;

    const fitsAbove = spaceAbove >= submenuHeight + 8;
    const fitsBelow = spaceBelow >= submenuHeight + 8;

    const placeBelow =
      (!fitsAbove && fitsBelow) ||
      (!fitsAbove && !fitsBelow && spaceBelow >= spaceAbove) ||
      (fitsBelow && spaceBelow > spaceAbove && spaceAbove < 180);

    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${leftOffset}px`,
      width: `${submenuWidth}px`,
      zIndex: 60,
    };

    if (placeBelow) {
      style.top = 'calc(100% + 8px)';
      style.maxHeight = `${Math.max(120, spaceBelow - 12)}px`;
    } else {
      style.bottom = 'calc(100% + 8px)';
      style.maxHeight = `${Math.max(120, spaceAbove - 12)}px`;
    }

    return style;
  };

  // Helper to execute document commands safely
  const exec = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    onApplyFormat();
    if (oneTimeFormatting) {
      try {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        if (document.queryCommandState(command)) {
          document.execCommand(command, false, undefined);
        }
      } catch {}
    }
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

  // Helper to extract text nodes intersecting range
  const getTextNodesInRange = (range: Range): Text[] => {
    const textNodes: Text[] = [];
    const root = range.commonAncestorContainer;

    if (root.nodeType === Node.TEXT_NODE) {
      textNodes.push(root as Text);
      return textNodes;
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        try {
          if (!range.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
          if (!node.nodeValue || node.nodeValue.length === 0) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        } catch (e) {
          return NodeFilter.FILTER_REJECT;
        }
      },
    });

    let currentNode = walker.nextNode();
    while (currentNode) {
      textNodes.push(currentNode as Text);
      currentNode = walker.nextNode();
    }
    return textNodes;
  };

  // Toggle Quote on / off preserving empty lines intact
  const handleQuoteToggle = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const existingQuote = sel.anchorNode
      ? ((sel.anchorNode.nodeType === Node.ELEMENT_NODE ? sel.anchorNode as HTMLElement : sel.anchorNode.parentElement)?.closest('blockquote') as HTMLElement | null)
      : null;

    if (existingQuote || isQuoteActive) {
      const bq = existingQuote || (sel.anchorNode ? (sel.anchorNode.parentElement?.closest('blockquote') as HTMLElement | null) : null);
      if (bq && bq.parentNode) {
        const parent = bq.parentNode;
        const frag = document.createDocumentFragment();
        while (bq.firstChild) {
          frag.appendChild(bq.firstChild);
        }
        parent.replaceChild(frag, bq);
      } else {
        document.execCommand('formatBlock', false, '<p>');
      }
      onApplyFormat();
      return;
    }

    // Find the editor container
    const editorEl = (range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer as HTMLElement
      : range.commonAncestorContainer.parentElement)?.closest('[contenteditable="true"]') as HTMLElement | null;

    if (!editorEl) {
      document.execCommand('formatBlock', false, '<blockquote>');
      onApplyFormat();
      return;
    }

    // Collect all top-level children of editorEl that intersect the selection
    const childrenToQuote: Node[] = [];
    for (let i = 0; i < editorEl.childNodes.length; i++) {
      const child = editorEl.childNodes[i];
      if (range.intersectsNode(child)) {
        childrenToQuote.push(child);
      }
    }

    if (childrenToQuote.length === 0) {
      let block: HTMLElement | null = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer as HTMLElement : range.startContainer.parentElement;
      while (block && block.parentElement !== editorEl && block !== editorEl) {
        block = block.parentElement;
      }
      if (block && block !== editorEl) {
        childrenToQuote.push(block);
      }
    }

    if (childrenToQuote.length > 0) {
      const bq = document.createElement('blockquote');
      editorEl.insertBefore(bq, childrenToQuote[0]);
      childrenToQuote.forEach(child => {
        bq.appendChild(child);
      });

      const newRange = document.createRange();
      newRange.selectNodeContents(bq);
      sel.removeAllRanges();
      sel.addRange(newRange);
      onApplyFormat();
      return;
    }

    document.execCommand('formatBlock', false, '<blockquote>');
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

  // Handle color highlight toggle / switch with multi-line, newline, and empty line safety
  const handleColorClick = (colorHex: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    const isLightTxt = isColorLight(colorHex);

    // Collect all text nodes in selection
    const textNodes = getTextNodesInRange(range);
    if (textNodes.length === 0) return;

    // Check if all selected text nodes are already highlighted with the requested colorHex
    const existingSpansInSelection = new Set<HTMLElement>();
    textNodes.forEach(tn => {
      const sp = (tn.parentElement?.closest('span[data-highlight="true"]') as HTMLElement | null);
      if (sp) existingSpansInSelection.add(sp);
    });

    const isAllSameColor =
      existingSpansInSelection.size > 0 &&
      Array.from(existingSpansInSelection).every(sp => {
        const col = sp.getAttribute('data-color') || sp.style.backgroundColor;
        return hexOrRgbMatch(col, colorHex);
      });

    if (isAllSameColor) {
      // Toggle off: remove highlight
      existingSpansInSelection.forEach(sp => {
        const parent = sp.parentNode;
        if (parent) {
          while (sp.firstChild) {
            parent.insertBefore(sp.firstChild, sp);
          }
          parent.removeChild(sp);
        }
      });
      onApplyFormat();
      return;
    }

    // Apply color: process nodes in reverse order so splitting doesn't invalidate offsets of earlier nodes
    const processedSpans: HTMLElement[] = [];

    for (let i = textNodes.length - 1; i >= 0; i--) {
      const node = textNodes[i];
      if (!node.nodeValue) continue;

      const isStart = (node === range.startContainer);
      const isEnd = (node === range.endContainer);
      const start = isStart ? range.startOffset : 0;
      const end = isEnd ? range.endOffset : node.nodeValue.length;

      if (start >= end) continue;

      // Skip whitespace-only nodes that are purely inter-block whitespace
      const content = node.nodeValue.substring(start, end);
      if (/^[\r\n\t]+$/.test(content)) continue;

      let targetNode = node;
      if (end < targetNode.nodeValue.length) {
        targetNode.splitText(end);
      }
      if (start > 0) {
        targetNode = targetNode.splitText(start);
      }

      // Check if targetNode is already inside a highlight span
      const parentSpan = targetNode.parentElement?.closest('span[data-highlight="true"]') as HTMLElement | null;
      if (parentSpan) {
        parentSpan.style.backgroundColor = colorHex;
        parentSpan.style.color = isLightTxt ? '#000000' : '#FFFFFF';
        parentSpan.setAttribute('data-color', colorHex);
        processedSpans.unshift(parentSpan);
      } else {
        const span = document.createElement('span');
        span.setAttribute('data-highlight', 'true');
        span.setAttribute('data-color', colorHex);
        span.style.backgroundColor = colorHex;
        span.style.color = isLightTxt ? '#000000' : '#FFFFFF';
        span.style.padding = '0.32em 4px';
        span.style.borderRadius = '2px';
        span.style.display = 'inline';
        span.style.boxDecorationBreak = 'clone';
        (span.style as any).webkitBoxDecorationBreak = 'clone';

        targetNode.parentNode?.insertBefore(span, targetNode);
        span.appendChild(targetNode);
        processedSpans.unshift(span);
      }
    }

    if (processedSpans.length > 0) {
      try {
        if (oneTimeFormatting) {
          const lastSpan = processedSpans[processedSpans.length - 1];
          const newRange = document.createRange();
          newRange.setStartAfter(lastSpan);
          newRange.setEndAfter(lastSpan);
          sel.removeAllRanges();
          sel.addRange(newRange);
        } else {
          const newRange = document.createRange();
          newRange.setStartBefore(processedSpans[0]);
          newRange.setEndAfter(processedSpans[processedSpans.length - 1]);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
      } catch (e) {
        // ignore selection restore error
      }
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

  const enabledButtons = quickSettings.formattingToolbarButtons || ALL_FORMATTING_TOOLBAR_BUTTONS;
  const isBtnEnabled = (id: FormattingToolbarButtonId) => enabledButtons.includes(id);

  const hasClipboard = isBtnEnabled('cut') || isBtnEnabled('copy');
  const hasInline = isBtnEnabled('bold') || isBtnEnabled('italic') || isBtnEnabled('underline');
  const hasBlock = isBtnEnabled('align') || isBtnEnabled('heading') || isBtnEnabled('quote') || isBtnEnabled('code');
  const hasColor = isBtnEnabled('color');

  if (!hasClipboard && !hasInline && !hasBlock && !hasColor) {
    return null;
  }

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
        {isBtnEnabled('cut') && (
          <button
            onClick={handleCut}
            style={getBtnStyle(false)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-medium text-xs flex items-center justify-center shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95 shadow-2xs"
            title="Вырезать"
          >
            <Scissors size={14} className="sm:w-[15px] sm:h-[15px]" />
          </button>
        )}

        {/* Copy Button */}
        {isBtnEnabled('copy') && (
          <button
            onClick={handleCopy}
            style={getBtnStyle(false)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-medium text-xs flex items-center justify-center shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95 shadow-2xs"
            title="Копировать"
          >
            <Copy size={14} className="sm:w-[15px] sm:h-[15px]" />
          </button>
        )}

        {hasClipboard && (hasInline || hasBlock || hasColor) && (
          <div
            className="w-[1px] h-4 sm:h-5 my-auto mx-0.5 shrink-0"
            style={{ backgroundColor: hexToRgba(menuText, 0.2) }}
          />
        )}

        {/* Bold B */}
        {isBtnEnabled('bold') && (
          <button
            onClick={() => exec('bold')}
            style={getBtnStyle(isBold)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95 shadow-2xs"
            title="Жирный"
          >
            B
          </button>
        )}

        {/* Italic I */}
        {isBtnEnabled('italic') && (
          <button
            onClick={() => exec('italic')}
            style={getBtnStyle(isItalic)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-extrabold italic text-xs sm:text-sm flex items-center justify-center shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95 shadow-2xs"
            title="Курсив"
          >
            I
          </button>
        )}

        {/* Underline U */}
        {isBtnEnabled('underline') && (
          <button
            onClick={() => exec('underline')}
            style={getBtnStyle(isUnderline)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-extrabold underline text-xs sm:text-sm flex items-center justify-center shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95 shadow-2xs"
            title="Подчёркнутый"
          >
            U
          </button>
        )}

        {hasInline && (hasBlock || hasColor) && (
          <div
            className="w-[1px] h-4 sm:h-5 my-auto mx-0.5 shrink-0"
            style={{ backgroundColor: hexToRgba(menuText, 0.2) }}
          />
        )}

        {/* Alignment Submenu Button */}
        {isBtnEnabled('align') && (
          <button
            ref={alignBtnRef}
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
        )}

        {/* Heading Submenu Button */}
        {isBtnEnabled('heading') && (
          <button
            ref={headingBtnRef}
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
        )}

        {/* Quote Button (Toggle) */}
        {isBtnEnabled('quote') && (
          <button
            onClick={handleQuoteToggle}
            style={getBtnStyle(isQuoteActive)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95 shadow-2xs"
            title="Цитата (повторное нажатие отменяет)"
          >
            <Quote size={14} className="sm:w-[15px] sm:h-[15px]" />
          </button>
        )}

        {/* Code Button (Toggle) */}
        {isBtnEnabled('code') && (
          <button
            onClick={handleCodeToggle}
            style={getBtnStyle(isCodeActive)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95 shadow-2xs"
            title="Код (повторное нажатие отменяет)"
          >
            <Code size={14} className="sm:w-[15px] sm:h-[15px]" />
          </button>
        )}

        {hasBlock && hasColor && (
          <div
            className="w-[1px] h-4 sm:h-5 my-auto mx-0.5 shrink-0"
            style={{ backgroundColor: hexToRgba(menuText, 0.2) }}
          />
        )}

        {/* Highlight Color Button */}
        {isBtnEnabled('color') && (
          <button
            ref={colorBtnRef}
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
        )}
      </div>

      {/* Submenu 1: Alignment */}
      {activeSubmenu === 'align' && isBtnEnabled('align') && (
        <div
          className="p-1.5 rounded-2xl shadow-2xl border backdrop-blur-xl animate-fadeIn space-y-1 text-xs font-bold overflow-y-auto custom-scrollbar"
          style={{
            ...getSubmenuPlacementStyle(alignBtnRef, 144, 130),
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
      {activeSubmenu === 'heading' && isBtnEnabled('heading') && (
        <div
          className="p-1.5 rounded-2xl shadow-2xl border backdrop-blur-xl animate-fadeIn space-y-1 text-xs font-bold overflow-y-auto custom-scrollbar"
          style={{
            ...getSubmenuPlacementStyle(headingBtnRef, 176, 220),
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
      {activeSubmenu === 'color' && isBtnEnabled('color') && (
        <div
          className="p-2.5 sm:p-3 rounded-2xl shadow-2xl border backdrop-blur-xl animate-fadeIn overflow-y-auto custom-scrollbar"
          style={{
            ...getSubmenuPlacementStyle(colorBtnRef, 196, 160),
            backgroundColor: menuBg,
            borderColor: menuBorder,
          }}
        >
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-44 sm:w-48">
            {activeHighlightColors.map(c => {
              const isColorActive =
                activeColorHex && hexOrRgbMatch(activeColorHex, c.color);
              const checkColor = isColorLight(c.color) ? '#000000' : '#FFFFFF';

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
                    <Check size={15} strokeWidth={3} style={{ color: checkColor }} className="drop-shadow-xs font-extrabold" />
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
