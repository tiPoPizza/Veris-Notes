import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { hexToRgba, isLightColor } from '../themes';
import {
  X,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Plus,
  ArrowUp,
  Zap,
  History,
  Trash2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  FileText,
  SlidersHorizontal,
  ArrowUpDown,
  Clock,
  Pin,
  Edit2,
  MoreHorizontal,
  Square,
} from 'lucide-react';
import { WebSearchResponse, WebSearchHistoryItem } from '../types';

export const WebSearchDrawer: React.FC = () => {
  const {
    isWebSearchOpen,
    setIsWebSearchOpen,
    webSearchSettings,
    setWebSearchSettings,
    searchHistory,
    addSearchHistoryItem,
    deleteSearchHistoryItem,
    clearSearchHistory,
    updateSearchHistoryItem,
    insertTextIntoActiveNote,
    setViewMode,
    setActiveSettingsTab,
    theme,
    quickSettings,
  } = useApp();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<WebSearchResponse | null>(null);
  const [errorInfo, setErrorInfo] = useState<{ type: string; message: string } | null>(null);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [isPowerSettingsOpen, setIsPowerSettingsOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});

  const [historyItemMenuOpenId, setHistoryItemMenuOpenId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<WebSearchHistoryItem | null>(null);
  const [itemToRename, setItemToRename] = useState<WebSearchHistoryItem | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const historyItemMenuRef = useRef<HTMLDivElement>(null);

  const [isHistoryMenuOpen, setIsHistoryMenuOpen] = useState(false);
  const [historySortOrder, setHistorySortOrder] = useState<'newest' | 'oldest'>(() => {
    try {
      const saved = localStorage.getItem('websearch_history_sort_order');
      if (saved === 'oldest' || saved === 'newest') return saved;
    } catch {
      // fallback
    }
    return 'newest';
  });
  const historyMenuRef = useRef<HTMLDivElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStopSearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Close model dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    if (isModelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModelDropdownOpen]);

  // Close history menu & history item menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (historyItemMenuRef.current && !historyItemMenuRef.current.contains(e.target as Node)) {
        setHistoryItemMenuOpenId(null);
      }
      if (historyMenuRef.current && !historyMenuRef.current.contains(e.target as Node)) {
        setIsHistoryMenuOpen(false);
      }
    };
    if (historyItemMenuOpenId || isHistoryMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [historyItemMenuOpenId, isHistoryMenuOpen]);

  // Reset to new clean search session whenever drawer is opened
  useEffect(() => {
    if (isWebSearchOpen) {
      setQuery('');
      setResponse(null);
      setErrorInfo(null);
      setShowHistory(false);
      setIsPowerSettingsOpen(false);
      setIsModelDropdownOpen(false);
      setCopiedAction(null);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = '28px';
          textareaRef.current.style.overflowY = 'hidden';
          textareaRef.current.focus();
        }
      }, 150);
    }
  }, [isWebSearchOpen]);

  // Dynamically auto-resize textarea as user types, adding scrollbar ONLY when content exceeds 2+ lines
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '28px';
      textareaRef.current.style.overflowY = 'hidden';
      const scrollH = textareaRef.current.scrollHeight;
      if (!query) {
        textareaRef.current.style.height = '28px';
        textareaRef.current.style.overflowY = 'hidden';
      } else if (scrollH > 38) {
        const targetH = Math.min(scrollH, 120);
        textareaRef.current.style.height = `${targetH}px`;
        textareaRef.current.style.overflowY = scrollH > 120 ? 'auto' : 'hidden';
      } else {
        textareaRef.current.style.height = '28px';
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [query]);

  // Scroll to top when new response arrives
  useEffect(() => {
    if (response && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, [response]);

  const sortedItems = useMemo(() => {
    return [...searchHistory].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return historySortOrder === 'oldest'
        ? a.timestamp - b.timestamp
        : b.timestamp - a.timestamp;
    });
  }, [searchHistory, historySortOrder]);

  const isLight = isLightColor(theme.bg);

  // Clean aesthetics matching Veris design rules
  const drawerBg = isLight ? hexToRgba(theme.bg, 0.95) : hexToRgba(theme.bg, 0.92);
  const cardBg = hexToRgba(theme.text, isLight ? 0.04 : 0.07);
  const cardBorder = quickSettings.showBorder ? theme.accent : hexToRgba(theme.text, 0.12);
  const floatingBarBg = isLight ? hexToRgba(theme.bg, 0.88) : hexToRgba(theme.bg, 0.82);
  const glassBg = hexToRgba(theme.text, 0.08);

  const activeApiKey =
    webSearchSettings.provider === 'exa'
      ? webSearchSettings.exaApiKey?.trim()
      : webSearchSettings.tavilyApiKey?.trim();
  const hasApiKey = Boolean(activeApiKey);

  const handleSearch = async (overrideQuery?: string) => {
    const cleanQuery = (overrideQuery ?? query).trim();
    if (!cleanQuery || loading) return;

    // Reset input field so user can type a new prompt immediately
    setQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '28px';
      textareaRef.current.style.overflowY = 'hidden';
    }

    setLoading(true);
    setErrorInfo(null);
    setShowHistory(false);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          query: cleanQuery,
          apiKey: activeApiKey,
          provider: webSearchSettings.provider,
          searchDepth: webSearchSettings.searchDepth,
          answerDetail: webSearchSettings.answerDetail,
          maxResults: webSearchSettings.provider === 'exa' ? 10 : 7,
          exaModel: webSearchSettings.exaModel,
          exaIncludeAnswer: webSearchSettings.exaIncludeAnswer,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorInfo({
          type: data.error || 'ERROR',
          message: data.message || 'Произошла ошибка при поиске. Попробуйте еще раз.',
        });
        return;
      }

      setResponse(data);
      // Save in history using user prompt as title
      addSearchHistoryItem({
        query: cleanQuery,
        response: data,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      setErrorInfo({
        type: 'NETWORK_ERROR',
        message: err.message || 'Не удалось подключиться к серверу поиска.',
      });
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        e.preventDefault();
        handleSearch();
      } else {
        e.stopPropagation();
      }
    }
  };

  const handleCopySummary = () => {
    if (!response?.answer) return;
    navigator.clipboard.writeText(response.answer);
    setCopiedAction('summary');
    setTimeout(() => setCopiedAction(null), 2000);
  };

  const handleCopyAll = () => {
    if (!response) return;
    let fullText = '';
    if (response.answer) {
      fullText += `### Ответ на запрос: «${response.query}»\n\n${response.answer}\n\n`;
    }
    if (response.results && response.results.length > 0) {
      fullText += `#### Источники:\n`;
      response.results.forEach((item, idx) => {
        fullText += `${idx + 1}. [${item.title}](${item.url})\n`;
      });
    }
    navigator.clipboard.writeText(fullText.trim());
    setCopiedAction('all');
    setTimeout(() => setCopiedAction(null), 2000);
  };

  const handleInsertIntoNote = (customText?: string) => {
    if (customText) {
      insertTextIntoActiveNote(customText);
      setCopiedAction('inserted');
      setTimeout(() => setCopiedAction(null), 2000);
      return;
    }

    if (!response) return;
    let insertHtml = '';
    if (response.answer) {
      insertHtml += `<div style="padding:12px;margin:8px 0;border-left:3px solid ${theme.accent};background:${hexToRgba(theme.text, 0.05)};border-radius:10px;">`;
      insertHtml += `<strong>🔍 Веб-поиск: ${response.query}</strong><br/>`;
      insertHtml += `<p style="margin-top:6px;">${response.answer.replace(/\n/g, '<br/>')}</p>`;
      if (response.results && response.results.length > 0) {
        insertHtml += `<p style="font-size:12px;opacity:0.8;margin-top:8px;"><strong>Источники:</strong></p><ul style="font-size:12px;padding-left:18px;margin:4px 0;">`;
        response.results.slice(0, 4).forEach((r) => {
          insertHtml += `<li><a href="${r.url}" target="_blank" rel="noopener noreferrer" style="color:${theme.accent};text-decoration:underline;">${r.title}</a></li>`;
        });
        insertHtml += `</ul>`;
      }
      insertHtml += `</div>`;
    }
    insertTextIntoActiveNote(insertHtml);
    setCopiedAction('inserted');
    setTimeout(() => setCopiedAction(null), 2000);
  };

  const toggleSourceExpand = (index: number) => {
    setExpandedSources(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `Сегодня ${timeStr}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `Вчера ${timeStr}`;
    }
    const dateFormatted = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    return `${dateFormatted} ${timeStr}`;
  };

  const getSourcesCountText = (count: number) => {
    if (count % 10 === 1 && count % 100 !== 11) return `${count} источник`;
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return `${count} источника`;
    return `${count} источников`;
  };

  const handleSetHistorySortOrder = (order: 'newest' | 'oldest') => {
    setHistorySortOrder(order);
    try {
      localStorage.setItem('websearch_history_sort_order', order);
    } catch {
      // ignore
    }
  };

  const handleTogglePinItem = (item: WebSearchHistoryItem) => {
    updateSearchHistoryItem(item.id, { pinned: !item.pinned });
    setHistoryItemMenuOpenId(null);
  };

  const handleSaveRename = () => {
    if (itemToRename && renameTitle.trim()) {
      updateSearchHistoryItem(itemToRename.id, { query: renameTitle.trim() });
    }
    setItemToRename(null);
  };

  const handleConfirmDeleteItem = () => {
    if (itemToDelete) {
      deleteSearchHistoryItem(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  const handleConfirmClearAll = () => {
    clearSearchHistory();
    setShowClearAllModal(false);
  };

  const getModelDisplayName = () => {
    if (webSearchSettings.provider === 'exa') {
      if (webSearchSettings.exaModel === 'deep') return 'Exa Deep';
      if (webSearchSettings.exaModel === 'deep-reasoning') return 'Exa Deep-reasoning';
      return 'Exa Fast';
    }
    if (webSearchSettings.searchDepth === 'advanced') return 'Tavily глубокий';
    return 'Tavily быстрый';
  };

  if (!isWebSearchOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end backdrop-blur-xs animate-fadeIn"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={() => setIsWebSearchOpen(false)}
    >
      <div
        className="w-full sm:w-[460px] md:w-[500px] h-full flex flex-col shadow-2xl border-l backdrop-blur-2xl transition-all relative overflow-hidden"
        style={{
          backgroundColor: drawerBg,
          borderColor: cardBorder,
          color: theme.text,
          boxShadow: `-15px 0 50px ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.5)'}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Floating Top Action Controls (Over Content) */}
        <div
          className={
            showHistory
              ? 'absolute top-3 inset-x-0 px-4 flex items-center justify-between z-30 pointer-events-none transition-all'
              : 'pt-3 pb-1 px-4 flex items-center justify-between shrink-0 z-30 relative transition-all bg-transparent'
          }
        >
          {/* Left Area: History Toggle / Back button + Model Name Dropdown */}
          <div className="flex items-center gap-2 min-w-0">
            {showHistory ? (
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2.5 rounded-2xl border shadow-lg backdrop-blur-xl hover:opacity-80 active:scale-95 transition flex items-center justify-center cursor-pointer shrink-0"
                  style={{
                    backgroundColor: glassBg,
                    borderColor: cardBorder,
                    color: theme.text,
                  }}
                  title="Назад к поиску"
                >
                  <ArrowLeft size={18} />
                </button>
                <div
                  className="px-3.5 py-2.5 rounded-2xl border shadow-lg backdrop-blur-xl flex items-center shrink-0 select-none"
                  style={{
                    backgroundColor: glassBg,
                    borderColor: cardBorder,
                    color: theme.text,
                  }}
                >
                  <span className="text-xs sm:text-sm font-bold tracking-tight">История поисков</span>
                </div>
              </div>
            ) : (
              <>
                {/* Search History Button moved to far left */}
                <button
                  onClick={() => {
                    setShowHistory(true);
                    setIsModelDropdownOpen(false);
                    setIsPowerSettingsOpen(false);
                  }}
                  className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer"
                  style={{ color: theme.text }}
                  title="История поисков"
                >
                  <History size={18} />
                </button>

                {/* Model Selector Button with Chevron & Dropdown Submenu */}
                <div className="relative" ref={modelDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModelDropdownOpen(prev => !prev);
                      setIsPowerSettingsOpen(false);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-sm sm:text-[15px] font-bold tracking-tight select-none"
                    style={{ color: theme.text }}
                    title="Выбор параметров модели"
                  >
                    <span>{getModelDisplayName()}</span>
                    {isModelDropdownOpen ? (
                      <ChevronUp size={16} className="opacity-70 transition-transform" />
                    ) : (
                      <ChevronDown size={16} className="opacity-70 transition-transform" />
                    )}
                  </button>

                  {/* Dropdown Menu (Styled matching site) */}
                  {isModelDropdownOpen && (
                    <div
                      className="absolute top-full left-0 mt-1.5 w-64 p-2 rounded-2xl shadow-2xl border backdrop-blur-2xl z-50 space-y-1 animate-fadeIn"
                      style={{
                        backgroundColor: isLight ? hexToRgba(theme.bg, 0.96) : hexToRgba(theme.bg, 0.92),
                        borderColor: cardBorder,
                        boxShadow: `0 12px 35px ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.6)'}`,
                      }}
                    >
                      {/* Tavily Options */}
                      {webSearchSettings.provider === 'tavily' && (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setWebSearchSettings(prev => ({ ...prev, searchDepth: 'basic' }));
                              setIsModelDropdownOpen(false);
                            }}
                            className="w-full p-2.5 rounded-xl flex items-center justify-between transition cursor-pointer text-left hover:bg-white/5"
                            style={{
                              backgroundColor:
                                webSearchSettings.searchDepth === 'basic'
                                  ? hexToRgba(theme.accent, 0.18)
                                  : 'transparent',
                            }}
                          >
                            <div>
                              <div className="text-xs font-bold">Быстрый</div>
                              <div className="text-[10px] opacity-60 mt-0.5">1 кредит</div>
                            </div>
                            {webSearchSettings.searchDepth === 'basic' && (
                              <Check size={16} style={{ color: theme.accent }} />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setWebSearchSettings(prev => ({ ...prev, searchDepth: 'advanced' }));
                              setIsModelDropdownOpen(false);
                            }}
                            className="w-full p-2.5 rounded-xl flex items-center justify-between transition cursor-pointer text-left hover:bg-white/5"
                            style={{
                              backgroundColor:
                                webSearchSettings.searchDepth === 'advanced'
                                  ? hexToRgba(theme.accent, 0.18)
                                  : 'transparent',
                            }}
                          >
                            <div>
                              <div className="text-xs font-bold">Глубокий</div>
                              <div className="text-[10px] opacity-60 mt-0.5">2 кредита</div>
                            </div>
                            {webSearchSettings.searchDepth === 'advanced' && (
                              <Check size={16} style={{ color: theme.accent }} />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Exa Options */}
                      {webSearchSettings.provider === 'exa' && (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setWebSearchSettings(prev => ({ ...prev, exaModel: 'fast' }));
                              setIsModelDropdownOpen(false);
                            }}
                            className="w-full p-2.5 rounded-xl flex items-center justify-between transition cursor-pointer text-left hover:bg-white/5"
                            style={{
                              backgroundColor:
                                webSearchSettings.exaModel === 'fast'
                                  ? hexToRgba(theme.accent, 0.18)
                                  : 'transparent',
                            }}
                          >
                            <div>
                              <div className="text-xs font-bold">Fast</div>
                              <div className="text-[10px] opacity-60 mt-0.5">7$ / 1k</div>
                            </div>
                            {webSearchSettings.exaModel === 'fast' && (
                              <Check size={16} style={{ color: theme.accent }} />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setWebSearchSettings(prev => ({ ...prev, exaModel: 'deep' }));
                              setIsModelDropdownOpen(false);
                            }}
                            className="w-full p-2.5 rounded-xl flex items-center justify-between transition cursor-pointer text-left hover:bg-white/5"
                            style={{
                              backgroundColor:
                                webSearchSettings.exaModel === 'deep'
                                  ? hexToRgba(theme.accent, 0.18)
                                  : 'transparent',
                            }}
                          >
                            <div>
                              <div className="text-xs font-bold">Deep</div>
                              <div className="text-[10px] opacity-60 mt-0.5">12$ / 1k</div>
                            </div>
                            {webSearchSettings.exaModel === 'deep' && (
                              <Check size={16} style={{ color: theme.accent }} />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setWebSearchSettings(prev => ({ ...prev, exaModel: 'deep-reasoning' }));
                              setIsModelDropdownOpen(false);
                            }}
                            className="w-full p-2.5 rounded-xl flex items-center justify-between transition cursor-pointer text-left hover:bg-white/5"
                            style={{
                              backgroundColor:
                                webSearchSettings.exaModel === 'deep-reasoning'
                                  ? hexToRgba(theme.accent, 0.18)
                                  : 'transparent',
                            }}
                          >
                            <div>
                              <div className="text-xs font-bold">Deep-reasoning</div>
                              <div className="text-[10px] opacity-60 mt-0.5">15$ / 1k</div>
                            </div>
                            {webSearchSettings.exaModel === 'deep-reasoning' && (
                              <Check size={16} style={{ color: theme.accent }} />
                            )}
                          </button>

                          {/* Answer toggle row */}
                          <div
                            className="p-2.5 rounded-xl flex items-center justify-between"
                            style={{ backgroundColor: hexToRgba(theme.text, 0.03) }}
                          >
                            <div>
                              <div className="text-xs font-bold">Answer</div>
                              <div className="text-[10px] opacity-50">+5$ / 1k</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setWebSearchSettings(prev => ({ ...prev, exaIncludeAnswer: false }))
                                }
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                  !webSearchSettings.exaIncludeAnswer ? 'shadow-xs' : 'opacity-50'
                                }`}
                                style={{
                                  backgroundColor: !webSearchSettings.exaIncludeAnswer
                                    ? theme.accent
                                    : hexToRgba(theme.text, 0.08),
                                  color: !webSearchSettings.exaIncludeAnswer ? '#FFFFFF' : theme.text,
                                }}
                              >
                                Выкл
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setWebSearchSettings(prev => ({ ...prev, exaIncludeAnswer: true }))
                                }
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                  webSearchSettings.exaIncludeAnswer ? 'shadow-xs' : 'opacity-50'
                                }`}
                                style={{
                                  backgroundColor: webSearchSettings.exaIncludeAnswer
                                    ? theme.accent
                                    : hexToRgba(theme.text, 0.08),
                                  color: webSearchSettings.exaIncludeAnswer ? '#FFFFFF' : theme.text,
                                }}
                              >
                                Вкл
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Action Controls: History Menu / Zap Power Settings / Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            {showHistory ? (
              <div className="flex items-center gap-2 pointer-events-auto">
                {/* 3 Sliders Filter / Sort / Clear Menu */}
                <div className="relative shrink-0" ref={historyMenuRef}>
                  <button
                    onClick={() => setIsHistoryMenuOpen(prev => !prev)}
                    className="p-2.5 rounded-2xl border shadow-lg backdrop-blur-xl hover:opacity-80 active:scale-95 transition flex items-center justify-center cursor-pointer"
                    style={{
                      backgroundColor: isHistoryMenuOpen ? hexToRgba(theme.accent, 0.18) : glassBg,
                      borderColor: isHistoryMenuOpen ? theme.accent : cardBorder,
                      color: isHistoryMenuOpen ? theme.accent : theme.text,
                    }}
                    title="Сортировка и опции истории"
                  >
                    <SlidersHorizontal size={18} />
                  </button>

                  {/* Dropdown Menu */}
                  {isHistoryMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 rounded-2xl border shadow-2xl backdrop-blur-2xl p-2 z-50 animate-scaleUp flex flex-col gap-2"
                      style={{
                        backgroundColor: isLight ? hexToRgba(theme.bg, 0.96) : hexToRgba(theme.bg, 0.92),
                        borderColor: cardBorder,
                        color: theme.text,
                        boxShadow: isLight ? '0 10px 25px -5px rgba(0,0,0,0.1)' : '0 20px 25px -5px rgba(0,0,0,0.5)',
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="text-[11px] font-bold uppercase tracking-wider opacity-60 flex items-center justify-between px-1">
                        <span>Сортировка поисков</span>
                        <ArrowUpDown size={12} style={{ color: theme.accent }} />
                      </div>

                      <div className="space-y-1">
                        {[
                          { id: 'newest' as const, label: 'Сначала новые', icon: Clock },
                          { id: 'oldest' as const, label: 'Сначала старые', icon: Clock },
                        ].map(opt => {
                          const isSelected = historySortOrder === opt.id;
                          const IconComp = opt.icon;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                handleSetHistorySortOrder(opt.id);
                                setIsHistoryMenuOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer text-left border ${
                                isSelected ? 'shadow-xs font-bold' : 'hover:opacity-90 font-normal'
                              }`}
                              style={{
                                backgroundColor: isSelected
                                  ? hexToRgba(theme.accent, isLight ? 0.14 : 0.18)
                                  : hexToRgba(theme.text, 0.04),
                                color: isSelected ? theme.accent : theme.text,
                                borderColor: isSelected
                                  ? theme.accent
                                  : hexToRgba(theme.text, 0.08),
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <IconComp
                                  size={14}
                                  style={{ color: isSelected ? theme.accent : hexToRgba(theme.text, 0.5) }}
                                />
                                <span>{opt.label}</span>
                              </div>
                              {isSelected && <Check size={13} style={{ color: theme.accent }} />}
                            </button>
                          );
                        })}
                      </div>

                      {searchHistory.length > 0 && (
                        <div className="pt-1.5 border-t" style={{ borderColor: hexToRgba(theme.text, 0.08) }}>
                          <button
                            type="button"
                            onClick={() => {
                              setIsHistoryMenuOpen(false);
                              setShowClearAllModal(true);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 active:scale-98 transition cursor-pointer"
                          >
                            <Trash2 size={14} />
                            <span>Очистить всё</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setIsWebSearchOpen(false)}
                  className="p-2.5 rounded-2xl border shadow-lg backdrop-blur-xl hover:opacity-80 active:scale-95 transition flex items-center justify-center cursor-pointer shrink-0"
                  style={{
                    backgroundColor: glassBg,
                    borderColor: cardBorder,
                    color: theme.text,
                  }}
                  title="Закрыть"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <>
                {/* Lightning Quick Settings Button */}
                <button
                  onClick={() => {
                    setIsPowerSettingsOpen(prev => !prev);
                    setIsModelDropdownOpen(false);
                  }}
                  className="p-2.5 rounded-2xl border shadow-lg backdrop-blur-xl hover:opacity-80 active:scale-95 transition flex items-center justify-center cursor-pointer"
                  style={{
                    backgroundColor: isPowerSettingsOpen ? hexToRgba(theme.accent, 0.2) : glassBg,
                    borderColor: isPowerSettingsOpen ? theme.accent : cardBorder,
                    color: isPowerSettingsOpen ? theme.accent : theme.text,
                  }}
                  title="Параметры провайдера и поиска"
                >
                  <Zap size={16} />
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setIsWebSearchOpen(false)}
                  className="p-2.5 rounded-2xl border shadow-lg backdrop-blur-xl hover:opacity-80 active:scale-95 transition flex items-center justify-center cursor-pointer"
                  style={{
                    backgroundColor: glassBg,
                    borderColor: cardBorder,
                    color: theme.text,
                  }}
                  title="Закрыть"
                >
                  <X size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search Power Settings Dropdown */}
        {isPowerSettingsOpen && !showHistory && (
          <div
            className="p-4 border-b space-y-3.5 animate-fadeIn shrink-0 z-10"
            style={{
              backgroundColor: cardBg,
              borderColor: hexToRgba(theme.text, 0.1),
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold">Провайдер и параметры</span>
              </div>
              <button
                onClick={() => {
                  setIsWebSearchOpen(false);
                  setViewMode('settings');
                  setActiveSettingsTab('search');
                }}
                className="flex items-center gap-1 text-[11px] font-bold opacity-75 hover:opacity-100 hover:underline cursor-pointer"
                style={{ color: theme.accent }}
              >
                <span>Настройки поиска</span>
                <ExternalLink size={11} />
              </button>
            </div>

            {/* Provider Tabs in Power Dropdown */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWebSearchSettings(prev => ({ ...prev, provider: 'tavily' }))}
                className="p-2 rounded-xl border text-left transition cursor-pointer"
                style={{
                  backgroundColor:
                    webSearchSettings.provider === 'tavily'
                      ? hexToRgba(theme.accent, 0.18)
                      : 'transparent',
                  borderColor:
                    webSearchSettings.provider === 'tavily'
                      ? theme.accent
                      : hexToRgba(theme.text, 0.12),
                }}
              >
                <div className="text-xs font-bold">Tavily</div>
              </button>

              <button
                type="button"
                onClick={() => setWebSearchSettings(prev => ({ ...prev, provider: 'exa' }))}
                className="p-2 rounded-xl border text-left transition cursor-pointer"
                style={{
                  backgroundColor:
                    webSearchSettings.provider === 'exa'
                      ? hexToRgba(theme.accent, 0.18)
                      : 'transparent',
                  borderColor:
                    webSearchSettings.provider === 'exa'
                      ? theme.accent
                      : hexToRgba(theme.text, 0.12),
                }}
              >
                <div className="text-xs font-bold">Exa</div>
              </button>
            </div>

            {/* TAVILY SPECIFIC SETTINGS */}
            {webSearchSettings.provider === 'tavily' && (
              <div className="space-y-3 pt-1">
                {/* Depth selector */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="opacity-70 font-medium">Глубина поиска</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setWebSearchSettings(prev => ({ ...prev, searchDepth: 'basic' }))
                      }
                      className="p-2 rounded-xl border text-left transition cursor-pointer"
                      style={{
                        backgroundColor:
                          webSearchSettings.searchDepth === 'basic'
                            ? hexToRgba(theme.accent, 0.18)
                            : 'transparent',
                        borderColor:
                          webSearchSettings.searchDepth === 'basic'
                            ? theme.accent
                            : hexToRgba(theme.text, 0.12),
                      }}
                    >
                      <div className="text-xs font-bold">Быстрый</div>
                      <div className="text-[10px] opacity-60 mt-0.5">1 кредит</div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setWebSearchSettings(prev => ({ ...prev, searchDepth: 'advanced' }))
                      }
                      className="p-2 rounded-xl border text-left transition cursor-pointer"
                      style={{
                        backgroundColor:
                          webSearchSettings.searchDepth === 'advanced'
                            ? hexToRgba(theme.accent, 0.18)
                            : 'transparent',
                        borderColor:
                          webSearchSettings.searchDepth === 'advanced'
                            ? theme.accent
                            : hexToRgba(theme.text, 0.12),
                      }}
                    >
                      <div className="text-xs font-bold">Глубокий</div>
                      <div className="text-[10px] opacity-60 mt-0.5">2 кредита</div>
                    </button>
                  </div>
                </div>

                {/* Answer detail selector */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="opacity-70 font-medium">Детализация</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setWebSearchSettings(prev => ({ ...prev, answerDetail: 'basic' }))
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        webSearchSettings.answerDetail === 'basic' ? 'shadow-xs' : 'opacity-60'
                      }`}
                      style={{
                        backgroundColor:
                          webSearchSettings.answerDetail === 'basic'
                            ? theme.accent
                            : hexToRgba(theme.text, 0.08),
                        color: webSearchSettings.answerDetail === 'basic' ? '#FFFFFF' : theme.text,
                      }}
                    >
                      Кратко
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setWebSearchSettings(prev => ({ ...prev, answerDetail: 'advanced' }))
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        webSearchSettings.answerDetail === 'advanced' ? 'shadow-xs' : 'opacity-60'
                      }`}
                      style={{
                        backgroundColor:
                          webSearchSettings.answerDetail === 'advanced'
                            ? theme.accent
                            : hexToRgba(theme.text, 0.08),
                        color: webSearchSettings.answerDetail === 'advanced' ? '#FFFFFF' : theme.text,
                      }}
                    >
                      Подробно
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* EXA SPECIFIC SETTINGS */}
            {webSearchSettings.provider === 'exa' && (
              <div className="space-y-3 pt-1">
                {/* Exa Model selection (Fast, Deep, Deep-reasoning) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="opacity-70 font-medium">Модель Exa</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {/* Fast */}
                    <button
                      type="button"
                      onClick={() => setWebSearchSettings(prev => ({ ...prev, exaModel: 'fast' }))}
                      className="p-2 rounded-xl border text-left transition cursor-pointer"
                      style={{
                        backgroundColor:
                          webSearchSettings.exaModel === 'fast'
                            ? hexToRgba(theme.accent, 0.18)
                            : 'transparent',
                        borderColor:
                          webSearchSettings.exaModel === 'fast'
                            ? theme.accent
                            : hexToRgba(theme.text, 0.12),
                      }}
                    >
                      <div className="text-[11px] font-bold">Fast</div>
                      <div className="text-[9px] font-mono opacity-65">7$ / 1k</div>
                    </button>

                    {/* Deep */}
                    <button
                      type="button"
                      onClick={() => setWebSearchSettings(prev => ({ ...prev, exaModel: 'deep' }))}
                      className="p-2 rounded-xl border text-left transition cursor-pointer"
                      style={{
                        backgroundColor:
                          webSearchSettings.exaModel === 'deep'
                            ? hexToRgba(theme.accent, 0.18)
                            : 'transparent',
                        borderColor:
                          webSearchSettings.exaModel === 'deep'
                            ? theme.accent
                            : hexToRgba(theme.text, 0.12),
                      }}
                    >
                      <div className="text-[11px] font-bold">Deep</div>
                      <div className="text-[9px] font-mono opacity-65">12$ / 1k</div>
                    </button>

                    {/* Deep-reasoning */}
                    <button
                      type="button"
                      onClick={() => setWebSearchSettings(prev => ({ ...prev, exaModel: 'deep-reasoning' }))}
                      className="p-2 rounded-xl border text-left transition cursor-pointer"
                      style={{
                        backgroundColor:
                          webSearchSettings.exaModel === 'deep-reasoning'
                            ? hexToRgba(theme.accent, 0.18)
                            : 'transparent',
                        borderColor:
                          webSearchSettings.exaModel === 'deep-reasoning'
                            ? theme.accent
                            : hexToRgba(theme.text, 0.12),
                      }}
                    >
                      <div className="text-[11px] font-bold">Reasoning</div>
                      <div className="text-[9px] font-mono opacity-65">15$ / 1k</div>
                    </button>
                  </div>
                </div>

                {/* Exa Answer toggle (+5$ / 1k) */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <span className="opacity-85 font-semibold block">Генерация ответа</span>
                    <span className="text-[10px] opacity-50">+5$ / 1k</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setWebSearchSettings(prev => ({ ...prev, exaIncludeAnswer: false }))
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        !webSearchSettings.exaIncludeAnswer ? 'shadow-xs' : 'opacity-60'
                      }`}
                      style={{
                        backgroundColor:
                          !webSearchSettings.exaIncludeAnswer
                            ? theme.accent
                            : hexToRgba(theme.text, 0.08),
                        color: !webSearchSettings.exaIncludeAnswer ? '#FFFFFF' : theme.text,
                      }}
                    >
                      Выкл
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setWebSearchSettings(prev => ({ ...prev, exaIncludeAnswer: true }))
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        webSearchSettings.exaIncludeAnswer ? 'shadow-xs' : 'opacity-60'
                      }`}
                      style={{
                        backgroundColor:
                          webSearchSettings.exaIncludeAnswer
                            ? theme.accent
                            : hexToRgba(theme.text, 0.08),
                        color: webSearchSettings.exaIncludeAnswer ? '#FFFFFF' : theme.text,
                      }}
                    >
                      Вкл
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Scrollable Area (Content flows under floating bottom bar) */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 sm:px-5 space-y-4 pb-28 scroll-smooth"
          style={{ paddingTop: showHistory ? '72px' : '16px' }}
        >
          {/* HISTORY VIEW */}
          {showHistory ? (
            <div className="space-y-3 animate-fadeIn">
              {sortedItems.length === 0 ? (
                <div className="py-24 px-4 flex flex-col items-center justify-center text-center animate-fadeIn">
                  <p className="text-xs sm:text-sm font-medium opacity-55 max-w-[300px] leading-relaxed select-none">
                    Кто-то боится пустоты, а кого-то она успокаивает
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedItems.map(item => {
                    const isMenuOpen = historyItemMenuOpenId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setResponse(item.response);
                          setShowHistory(false);
                        }}
                        className="p-3 rounded-2xl border transition hover:border-white/30 cursor-pointer group relative flex flex-col gap-1.5"
                        style={{
                          backgroundColor: cardBg,
                          borderColor: hexToRgba(theme.text, 0.1),
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                            {item.pinned && (
                              <Pin
                                size={12}
                                className="shrink-0 fill-current rotate-45"
                                style={{ color: theme.accent }}
                              />
                            )}
                            <span className="text-xs font-bold truncate group-hover:opacity-90">
                              {item.query}
                            </span>
                          </div>

                          {/* 3-Dots Action Button & Dropdown Submenu */}
                          <div className="relative shrink-0" ref={isMenuOpen ? historyItemMenuRef : undefined}>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setHistoryItemMenuOpenId(prev => (prev === item.id ? null : item.id));
                              }}
                              className="p-1 rounded-lg opacity-50 group-hover:opacity-100 hover:bg-white/10 active:scale-90 transition cursor-pointer"
                              style={{ color: theme.text }}
                              title="Опции поиска"
                            >
                              <MoreHorizontal size={15} />
                            </button>

                            {/* Submenu Dropdown */}
                            {isMenuOpen && (
                              <div
                                className="absolute right-0 top-full mt-1 w-44 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-0.5 text-xs font-semibold animate-fadeIn"
                                style={{
                                  backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : hexToRgba(theme.bg, 0.98),
                                  borderColor: hexToRgba(theme.text, 0.15),
                                  color: theme.text,
                                  boxShadow: `0 10px 30px ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.6)'}`,
                                }}
                                onClick={e => e.stopPropagation()}
                              >
                                {/* Pin / Unpin */}
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleTogglePinItem(item);
                                  }}
                                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                                >
                                  <Pin
                                    size={13}
                                    style={{ color: theme.accent }}
                                    className={item.pinned ? 'fill-current' : ''}
                                  />
                                  <span>{item.pinned ? 'Открепить' : 'Закрепить'}</span>
                                </button>

                                {/* Rename */}
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setHistoryItemMenuOpenId(null);
                                    setRenameTitle(item.query);
                                    setItemToRename(item);
                                  }}
                                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                                >
                                  <Edit2 size={13} style={{ color: theme.accent }} />
                                  <span>Переименовать</span>
                                </button>

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setHistoryItemMenuOpenId(null);
                                    setItemToDelete(item);
                                  }}
                                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-red-500/15 text-red-500 active:scale-98 transition cursor-pointer text-left"
                                >
                                  <Trash2 size={13} />
                                  <span>Удалить</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] opacity-60">
                          <span className="font-mono">{formatTimestamp(item.timestamp)}</span>
                          <span className="font-mono opacity-80">
                            {getSourcesCountText(item.response.results?.length || 0)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* SEARCH & RESULTS VIEW */
            <>
              {/* Missing API Key Guidance Banner */}
              {!hasApiKey && (
                <div
                  className="p-4 rounded-2xl border space-y-3 transition-all"
                  style={{
                    backgroundColor: isLight ? 'rgba(234, 179, 8, 0.08)' : 'rgba(234, 179, 8, 0.12)',
                    borderColor: isLight ? 'rgba(234, 179, 8, 0.3)' : 'rgba(234, 179, 8, 0.4)',
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {webSearchSettings.provider === 'exa'
                          ? 'Необходим API-ключ Exa (BYOK)'
                          : 'Необходим API-ключ Tavily (BYOK)'}
                      </h4>
                      <p className="text-[11px] opacity-80 mt-1 leading-relaxed">
                        {webSearchSettings.provider === 'exa'
                          ? 'Веб-поиск работает через Exa Neural Search по системе собственного ключа. Получите ключ на сайте exa.ai.'
                          : 'Веб-поиск работает по системе собственного ключа (BYOK). Получите бесплатный ключ (1000 запросов/мес) на сайте Tavily.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={webSearchSettings.provider === 'exa' ? 'https://dashboard.exa.ai' : 'https://tavily.com'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition active:scale-98 shadow-xs"
                      style={{
                        backgroundColor: theme.accent,
                        color: '#FFFFFF',
                      }}
                    >
                      <span>{webSearchSettings.provider === 'exa' ? 'Получить на exa.ai' : 'Получить на tavily.com'}</span>
                      <ExternalLink size={12} />
                    </a>

                    <button
                      onClick={() => {
                        setIsWebSearchOpen(false);
                        setViewMode('settings');
                        setActiveSettingsTab('search');
                      }}
                      className="py-2 px-3 rounded-xl text-xs font-bold border hover:bg-white/10 transition active:scale-98"
                      style={{
                        borderColor: hexToRgba(theme.text, 0.2),
                        color: theme.text,
                      }}
                    >
                      Ввести в Настройках
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorInfo && (
                <div
                  className="p-3.5 rounded-2xl border flex items-start gap-2.5 animate-fadeIn"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    color: '#EF4444',
                  }}
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold">Ошибка поиска </span>
                    <span>{errorInfo.message}</span>
                  </div>
                </div>
              )}

              {/* Loading state */}
              {loading && (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-center animate-fadeIn">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center animate-spin"
                    style={{
                      backgroundColor: hexToRgba(theme.accent, 0.15),
                      color: theme.accent,
                    }}
                  >
                    <RefreshCw size={22} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-extrabold tracking-tight">
                      {webSearchSettings.provider === 'exa'
                        ? `Поиск через Exa (${webSearchSettings.exaModel})...`
                        : 'Поиск в интернете (Tavily)...'}
                    </h4>
                    <p className="text-[11px] opacity-60">
                      {webSearchSettings.provider === 'exa'
                        ? 'Ищем через нейронный поиск Exa и извлекаем контент'
                        : webSearchSettings.searchDepth === 'advanced'
                        ? 'Анализируем глубокие источники и формируем подробное саммари'
                        : 'Собираем релевантные факты и готовим выжимку'}
                    </p>
                  </div>
                </div>
              )}

              {/* Response Display */}
              {!loading && response && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Query Pill */}
                  <div className="flex items-center justify-between text-xs opacity-75 px-0.5">
                    <span className="truncate font-semibold">«{response.query}»</span>
                    <span className="shrink-0 text-[10px] font-mono">
                      {response.results.length} {response.results.length === 1 ? 'источник' : 'источников'}
                    </span>
                  </div>

                  {/* Summary Card */}
                  {response.answer && (
                    <div
                      className="p-4 rounded-2xl border space-y-3 shadow-xs transition-all"
                      style={{
                        backgroundColor: cardBg,
                        borderColor: cardBorder,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={15} style={{ color: theme.accent }} />
                          <span className="text-xs font-black uppercase tracking-wider">
                            Саммари
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={handleCopySummary}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition active:scale-95 cursor-pointer opacity-75 hover:opacity-100"
                            title="Скопировать саммари"
                          >
                            {copiedAction === 'summary' ? (
                              <Check size={14} style={{ color: theme.accent }} />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                          <button
                            onClick={() => handleInsertIntoNote()}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition active:scale-95 cursor-pointer shadow-xs"
                            style={{
                              backgroundColor: hexToRgba(theme.accent, 0.2),
                              color: theme.accent,
                            }}
                            title="Вставить саммари в заметку"
                          >
                            <Plus size={12} />
                            <span>В заметку</span>
                          </button>
                        </div>
                      </div>

                      <div className="text-xs leading-relaxed opacity-95 whitespace-pre-wrap font-normal select-text">
                        {response.answer}
                      </div>
                    </div>
                  )}

                  {/* Clean Action Buttons: Скопировать / Вставить в заметку */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleCopyAll}
                      className="flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-white/10 transition active:scale-98 cursor-pointer"
                      style={{
                        borderColor: hexToRgba(theme.text, 0.15),
                        backgroundColor: cardBg,
                      }}
                    >
                      {copiedAction === 'all' ? (
                        <>
                          <Check size={13} style={{ color: theme.accent }} />
                          <span>Скопировано!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Скопировать</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleInsertIntoNote()}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer shadow-sm"
                      style={{
                        backgroundColor: theme.accent,
                        color: '#FFFFFF',
                      }}
                    >
                      {copiedAction === 'inserted' ? (
                        <>
                          <Check size={13} />
                          <span>Вставлено в заметку!</span>
                        </>
                      ) : (
                        <>
                          <Plus size={13} />
                          <span>Вставить в заметку</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Sources Section */}
                  {response.results && response.results.length > 0 && (
                    <div className="space-y-2.5 pt-2">
                      <h4 className="text-xs font-extrabold opacity-75 uppercase tracking-wider">
                        Источники ({response.results.length})
                      </h4>

                      <div className="space-y-2">
                        {response.results.map((item, idx) => {
                          const isExpanded = expandedSources[idx];
                          let hostname = '';
                          try {
                            hostname = new URL(item.url).hostname.replace(/^www\./, '');
                          } catch {
                            hostname = item.url;
                          }

                          return (
                            <div
                              key={idx}
                              className="p-3 rounded-2xl border transition hover:border-white/30 space-y-2"
                              style={{
                                backgroundColor: cardBg,
                                borderColor: hexToRgba(theme.text, 0.1),
                              }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 text-xs font-bold hover:underline transition truncate flex items-center gap-1.5 group"
                                  style={{ color: theme.accent }}
                                >
                                  <span className="truncate">{item.title}</span>
                                  <ExternalLink
                                    size={11}
                                    className="shrink-0 opacity-60 group-hover:opacity-100"
                                  />
                                </a>

                                <span
                                  className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium opacity-60 shrink-0"
                                  style={{ backgroundColor: hexToRgba(theme.text, 0.08) }}
                                >
                                  {hostname}
                                </span>
                              </div>

                              {/* Snippet preview */}
                              <div
                                className={`text-[11px] opacity-80 leading-relaxed ${
                                  isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
                                }`}
                              >
                                {item.content}
                              </div>

                              {/* Source item action controls */}
                              <div className="flex items-center justify-between pt-1 text-[10px] opacity-75">
                                <button
                                  onClick={() => toggleSourceExpand(idx)}
                                  className="flex items-center gap-0.5 hover:opacity-100 cursor-pointer font-semibold"
                                >
                                  {isExpanded ? (
                                    <>
                                      <span>Свернуть</span>
                                      <ChevronUp size={11} />
                                    </>
                                  ) : (
                                    <>
                                      <span>Развернуть</span>
                                      <ChevronDown size={11} />
                                    </>
                                  )}
                                </button>

                                <div className="flex items-center gap-2">
                                  {/* Copy Source Link */}
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.url);
                                      setCopiedAction(`link-${idx}`);
                                      setTimeout(() => setCopiedAction(null), 1500);
                                    }}
                                    className="hover:opacity-100 cursor-pointer flex items-center gap-1 font-semibold"
                                    title="Скопировать ссылку"
                                  >
                                    {copiedAction === `link-${idx}` ? (
                                      <Check size={11} style={{ color: theme.accent }} />
                                    ) : (
                                      <Copy size={11} />
                                    )}
                                    <span>Ссылка</span>
                                  </button>

                                  {/* Copy Source Content Text */}
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.content);
                                      setCopiedAction(`txt-${idx}`);
                                      setTimeout(() => setCopiedAction(null), 1500);
                                    }}
                                    className="hover:opacity-100 cursor-pointer flex items-center gap-1 font-semibold"
                                    title="Скопировать текст источника"
                                  >
                                    {copiedAction === `txt-${idx}` ? (
                                      <Check size={11} style={{ color: theme.accent }} />
                                    ) : (
                                      <FileText size={11} />
                                    )}
                                    <span>Текст</span>
                                  </button>

                                  {/* Insert Source into active note */}
                                  <button
                                    onClick={() => {
                                      handleInsertIntoNote(
                                        `📌 **[${item.title}](${item.url})**\n> ${item.content}`
                                      );
                                    }}
                                    className="hover:opacity-100 cursor-pointer flex items-center gap-1 font-bold"
                                    style={{ color: theme.accent }}
                                  >
                                    <Plus size={11} />
                                    <span>В заметку</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Minimalist Empty State */}
              {!loading && !response && (
                <div className="py-24 px-4 flex flex-col items-center justify-center text-center animate-fadeIn">
                  <p className="text-xs sm:text-sm font-medium opacity-55 max-w-[320px] leading-relaxed select-none">
                    Со временем необъятность интернета вызывает странное чувство
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Docked Bottom Input Bar */}
        {!showHistory && (
          <div className="shrink-0 px-3 pb-3 sm:px-4 sm:pb-4 pt-1 transition-all space-y-2 relative z-30 bg-transparent">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border transition shadow-xs"
              style={{
                backgroundColor: hexToRgba(theme.text, isLight ? 0.04 : 0.08),
                borderColor: cardBorder,
              }}
            >
              <div className="flex-1 flex items-center min-w-0">
                <textarea
                  ref={textareaRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Что подсказать"
                  disabled={loading}
                  rows={1}
                  enterKeyHint="enter"
                  className="w-full bg-transparent text-xs sm:text-[13px] outline-hidden resize-none leading-[24px] py-0 transition-all placeholder:opacity-40"
                  style={{
                    color: theme.text,
                    height: '24px',
                    overflowY: 'hidden',
                  }}
                />
              </div>

              <button
                type={loading ? "button" : "submit"}
                onClick={loading ? handleStopSearch : undefined}
                disabled={!loading && (!query.trim() || !hasApiKey)}
                className="p-1.5 rounded-xl transition cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center"
                style={{
                  backgroundColor: loading
                    ? theme.text
                    : (query.trim() && hasApiKey ? theme.accent : 'transparent'),
                  color: loading
                    ? (isLight ? '#FFFFFF' : '#0F172A')
                    : (query.trim() && hasApiKey ? '#FFFFFF' : theme.text),
                }}
                title={loading ? "Остановить генерацию" : "Отправить запрос (Shift + Enter)"}
              >
                {loading ? (
                  <Square size={13} className="fill-current" />
                ) : (
                  <ArrowUp size={16} />
                )}
              </button>
            </form>
          </div>
        )}

        {/* Delete Single Search Item Confirmation Modal */}
        {itemToDelete && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            onClick={() => setItemToDelete(null)}
          >
            <div
              className="w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 border backdrop-blur-2xl animate-scaleUp"
              style={{
                backgroundColor: isLight ? hexToRgba(theme.bg, 0.98) : hexToRgba(theme.bg, 0.94),
                borderColor: cardBorder,
                color: theme.text,
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3.5">
                <div className="shrink-0 flex items-center justify-center">
                  <Trash2 size={24} style={{ color: theme.accent }} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Удалить поиск?</h3>
                  <p className="text-xs opacity-60 mt-0.5 line-clamp-2">
                    «{itemToDelete.query}» будет удален безвозвратно.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-3 px-4 rounded-2xl border font-bold text-xs hover:opacity-80 active:scale-98 transition cursor-pointer"
                  style={{
                    borderColor: cardBorder,
                    backgroundColor: hexToRgba(theme.text, 0.05),
                    color: theme.text,
                  }}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteItem}
                  className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs active:scale-98 transition cursor-pointer shadow-lg hover:opacity-90"
                  style={{
                    backgroundColor: theme.accent,
                    color: '#FFFFFF',
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rename Search Modal */}
        {itemToRename && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            onClick={() => setItemToRename(null)}
          >
            <div
              className="w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 border backdrop-blur-2xl animate-scaleUp"
              style={{
                backgroundColor: isLight ? hexToRgba(theme.bg, 0.98) : hexToRgba(theme.bg, 0.94),
                borderColor: cardBorder,
                color: theme.text,
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3.5">
                <div className="shrink-0 flex items-center justify-center">
                  <Edit2 size={24} style={{ color: theme.accent }} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Переименовать поиск</h3>
                  <p className="text-xs opacity-60 mt-0.5">
                    Укажите новое название для этого запроса
                  </p>
                </div>
              </div>

              <input
                type="text"
                value={renameTitle}
                onChange={e => setRenameTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setItemToRename(null);
                }}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-2xl border text-sm font-semibold outline-hidden transition"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.04),
                  borderColor: cardBorder,
                  color: theme.text,
                }}
                placeholder="Поисковый запрос..."
              />

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setItemToRename(null)}
                  className="flex-1 py-3 px-4 rounded-2xl border font-bold text-xs hover:opacity-80 active:scale-98 transition cursor-pointer"
                  style={{
                    borderColor: cardBorder,
                    backgroundColor: hexToRgba(theme.text, 0.05),
                    color: theme.text,
                  }}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSaveRename}
                  className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs active:scale-98 transition cursor-pointer shadow-lg hover:opacity-90"
                  style={{
                    backgroundColor: theme.accent,
                    color: '#FFFFFF',
                  }}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clear All Search History Confirmation Modal */}
        {showClearAllModal && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            onClick={() => setShowClearAllModal(false)}
          >
            <div
              className="w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 border backdrop-blur-2xl animate-scaleUp"
              style={{
                backgroundColor: isLight ? hexToRgba(theme.bg, 0.98) : hexToRgba(theme.bg, 0.94),
                borderColor: cardBorder,
                color: theme.text,
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3.5">
                <div className="shrink-0 flex items-center justify-center">
                  <Trash2 size={24} style={{ color: theme.accent }} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Очистить всю историю?</h3>
                  <p className="text-xs opacity-60 mt-0.5 line-clamp-2">
                    Все поисковые запросы будут удалены безвозвратно.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearAllModal(false)}
                  className="flex-1 py-3 px-4 rounded-2xl border font-bold text-xs hover:opacity-80 active:scale-98 transition cursor-pointer"
                  style={{
                    borderColor: cardBorder,
                    backgroundColor: hexToRgba(theme.text, 0.05),
                    color: theme.text,
                  }}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearAll}
                  className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs active:scale-98 transition cursor-pointer shadow-lg hover:opacity-90"
                  style={{
                    backgroundColor: theme.accent,
                    color: '#FFFFFF',
                  }}
                >
                  Очистить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
