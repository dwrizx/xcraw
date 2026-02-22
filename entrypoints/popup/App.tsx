import { useState, useMemo, useEffect } from "react";
import { sendMessage } from "@/lib/messaging";
import type {
  ExtractionResult,
  ExtractionSource,
  HistoryEntry,
  OutputFormat,
} from "@/lib/types";
import {
  DEFAULT_TEMPLATE,
  DEFAULT_AI_PROMPT,
  DEFAULT_AI_URL,
} from "@/lib/types";
import { loadLocalState, saveLocalState } from "@/lib/local-state";
import { loadHistoryFromDb, saveHistoryToDb } from "@/lib/history-db";
import {
  createHistoryEntry,
  insertHistoryEntry,
  removeHistoryEntry,
} from "@/lib/history-utils";
import {
  FileText,
  Copy,
  Check,
  Download,
  RefreshCw,
  Zap,
  Clock,
  Hash,
  ExternalLink,
  Target,
  FileCode,
  Type,
  MousePointer2,
  Trash2,
  AlertCircle,
  Sparkles,
  Settings,
  ChevronLeft,
  RotateCcw,
  Save,
  BrainCircuit,
  MessageSquare,
  History,
} from "lucide-react";
import "./App.css";

function App() {
  const LOCAL_UI_KEY = "smartExtract.uiState";
  const LOCAL_DRAFT_KEY = "smartExtract.draftSettings";
  const MAX_HISTORY = 50;

  const [extractedData, setExtractedData] = useState<ExtractionResult | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<OutputFormat>("MD");
  const [wasAutoCopied, setWasAutoCopied] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [customTemplate, setCustomTemplate] = useState(DEFAULT_TEMPLATE);
  const [aiPrompt, setAiPrompt] = useState(DEFAULT_AI_PROMPT);
  const [aiUrl, setAiUrl] = useState(DEFAULT_AI_URL);
  const [templateSaved, setTemplateSaved] = useState(false);

  useEffect(() => {
    const uiState = loadLocalState<{
      format: OutputFormat;
      extractedData: ExtractionResult | null;
    }>(LOCAL_UI_KEY, {
      format: "MD",
      extractedData: null,
    });
    setFormat(uiState.format);
    setExtractedData(uiState.extractedData);

    const draftSettings = loadLocalState<{
      customTemplate: string;
      aiPrompt: string;
      aiUrl: string;
    }>(LOCAL_DRAFT_KEY, {
      customTemplate: DEFAULT_TEMPLATE,
      aiPrompt: DEFAULT_AI_PROMPT,
      aiUrl: DEFAULT_AI_URL,
    });
    setCustomTemplate(draftSettings.customTemplate);
    setAiPrompt(draftSettings.aiPrompt);
    setAiUrl(draftSettings.aiUrl);

    loadHistoryFromDb()
      .then((entries) => setHistory(entries))
      .catch(console.error);

    if (typeof browser === "undefined" || !browser.storage) return;

    browser.storage.local
      .get("lastVisualExtraction")
      .then(async (res) => {
        const data = res as { lastVisualExtraction?: ExtractionResult };
        const visualExtraction = data.lastVisualExtraction;
        if (!visualExtraction) return;

        setExtractedData(visualExtraction);
        setWasAutoCopied(true);
        setTimeout(() => setWasAutoCopied(false), 3000);
        await browser.storage.local.remove("lastVisualExtraction");

        setHistory((prev) => {
          const entry = createHistoryEntry(visualExtraction, "picker", "MD");
          const next = insertHistoryEntry(prev, entry, MAX_HISTORY);
          saveHistoryToDb(next).catch(console.error);
          return next;
        });
      })
      .catch(console.error);

    browser.storage.sync
      .get(["customTemplate", "aiPrompt", "aiUrl"])
      .then((res) => {
        const data = res as {
          customTemplate?: string;
          aiPrompt?: string;
          aiUrl?: string;
        };
        if (data.customTemplate) setCustomTemplate(data.customTemplate);
        if (data.aiPrompt) setAiPrompt(data.aiPrompt);
        if (data.aiUrl) setAiUrl(data.aiUrl);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    saveLocalState(LOCAL_UI_KEY, { format, extractedData });
  }, [format, extractedData]);

  useEffect(() => {
    saveLocalState(LOCAL_DRAFT_KEY, { customTemplate, aiPrompt, aiUrl });
  }, [customTemplate, aiPrompt, aiUrl]);

  const saveSettings = async () => {
    await browser.storage.sync.set({ customTemplate, aiPrompt, aiUrl });
    setTemplateSaved(true);
    setTimeout(() => setTemplateSaved(false), 2000);
  };

  const resetSettings = () => {
    setCustomTemplate(DEFAULT_TEMPLATE);
    setAiPrompt(DEFAULT_AI_PROMPT);
    setAiUrl(DEFAULT_AI_URL);
  };

  const stats = useMemo(() => {
    if (!extractedData) return { words: 0, time: 0 };
    const wordCount = extractedData.textContent.trim().split(/\s+/).length;
    return {
      words: wordCount,
      time: Math.max(1, Math.ceil(wordCount / 200)),
    };
  }, [extractedData]);

  const persistExtraction = (
    result: ExtractionResult,
    source: ExtractionSource,
    usedFormat: OutputFormat,
  ) => {
    setExtractedData(result);
    setHistory((prev) => {
      const entry = createHistoryEntry(result, source, usedFormat);
      const next = insertHistoryEntry(prev, entry, MAX_HISTORY);
      saveHistoryToDb(next).catch(console.error);
      return next;
    });
  };

  const handleRestoreHistory = (entry: HistoryEntry) => {
    setExtractedData({
      title: entry.title,
      byline: "",
      dir: "ltr",
      content: entry.content,
      textContent: entry.textContent,
      length: entry.textContent.length,
      excerpt: "",
      siteName: entry.siteName,
      url: entry.url,
    });
    setFormat(entry.format);
    setShowHistory(false);
    setError(null);
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => {
      const next = removeHistoryEntry(prev, id);
      saveHistoryToDb(next).catch(console.error);
      return next;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    saveHistoryToDb([]).catch(console.error);
  };

  const handleAskAI = async () => {
    if (!extractedData) return;

    const fullText =
      format === "MD" ? extractedData.content : extractedData.textContent;

    try {
      if (typeof browser !== "undefined" && browser.storage) {
        await browser.storage.local.set({
          pendingChatGPTUpload: {
            text: fullText,
            prompt: aiPrompt,
            title: extractedData.title,
          },
        });
      }

      const baseUrl = aiUrl.split("?")[0];
      window.open(baseUrl, "_blank");
    } catch (err) {
      console.error("Failed to save to storage:", err);
      const finalPrompt = `${aiPrompt}\n\n---\n${fullText}`;
      navigator.clipboard.writeText(finalPrompt);
      alert(
        "Gagal menyiapkan file otomatis. Prompt sudah disalin ke Clipboard. Silakan paste (Ctrl+V) manual di ChatGPT.",
      );
      window.open(aiUrl.split("?")[0], "_blank");
    }
  };

  const safeSendMessage = async (
    tabId: number,
    action: "extractContent" | "extractSelection" | "startInspector",
  ) => {
    try {
      return await sendMessage(action, customTemplate, { tabId });
    } catch (err: any) {
      const msg = err.message || "";
      if (
        msg.includes("connection") ||
        msg.includes("exist") ||
        msg.includes("sendMessage")
      ) {
        await browser.scripting.executeScript({
          target: { tabId },
          files: ["content-scripts/content.js"],
        });
        await new Promise((r) => setTimeout(r, 600));
        return await sendMessage(action, customTemplate, { tabId });
      }
      throw err;
    }
  };

  const handleFullExtract = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);
    setWasAutoCopied(false);

    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id || !tab.url) throw new Error("No active tab found.");
      const result = await safeSendMessage(tab.id, "extractContent");
      if (result) persistExtraction(result, "full", format);
      else throw new Error("No readable content found.");
    } catch (err: any) {
      setError(err.message || "Extraction failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectionExtract = async () => {
    setLoading(true);
    setError(null);
    setWasAutoCopied(false);
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) throw new Error("No active tab found.");
      const result = await safeSendMessage(tab.id, "extractSelection");
      if (result) persistExtraction(result, "selection", format);
    } catch (err: any) {
      if (err.message?.includes("selected")) setError("Highlight text first!");
      else setError(err.message || "Selection failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartInspector = async () => {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) throw new Error("No active tab found.");
      await safeSendMessage(tab.id, "startInspector");
      window.close();
    } catch (err: any) {
      setError(err.message || "Could not start inspector.");
    }
  };

  const handleCopy = () => {
    const content =
      format === "MD" ? extractedData?.content : extractedData?.textContent;
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!extractedData) return;
    const content =
      format === "MD" ? extractedData.content : extractedData.textContent;
    const blob = new Blob([content || ""], {
      type: format === "MD" ? "text/markdown" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${extractedData.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.${format.toLowerCase()}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (showSettings) {
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-all duration-300 min-w-[420px]">
        <header className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(false)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-lg tracking-tight">Settings & AI</h1>
          </div>
        </header>
        <main className="flex-1 p-5 overflow-y-auto space-y-6">
          {/* Header Template */}
          <section>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Markdown Template
            </label>
            <textarea
              className="w-full h-40 p-3 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              value={customTemplate}
              onChange={(e) => setCustomTemplate(e.target.value)}
            />
          </section>

          {/* AI Settings */}
          <section className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <BrainCircuit className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider">
                AI Configuration
              </h2>
            </div>
            <div>
              <label className="block text-[10px] font-semibold mb-1 text-slate-600 dark:text-slate-400">
                AI Tool URL
              </label>
              <input
                type="text"
                className="w-full p-2 text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                value={aiUrl}
                onChange={(e) => setAiUrl(e.target.value)}
                placeholder="https://chatgpt.com/"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold mb-1 text-slate-600 dark:text-slate-400">
                Default AI Prompt
              </label>
              <textarea
                className="w-full h-20 p-2 text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none resize-none"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
            </div>
          </section>
        </main>
        <footer className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex justify-between gap-3">
          <button
            onClick={resetSettings}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button
            onClick={saveSettings}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-95"
          >
            {templateSaved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {templateSaved ? "Settings Saved!" : "Save Changes"}
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-all duration-300 min-w-[420px]">
      {/* Header */}
      <header className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">
            SmartExtract{" "}
            <span className="text-[10px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-600 px-1.5 py-0.5 rounded ml-1">
              v2.5
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setFormat("MD")}
              className={`px-3 py-1 text-[11px] font-bold rounded flex items-center gap-1 transition-all ${format === "MD" ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-800"}`}
            >
              <FileCode className="w-3.5 h-3.5" /> MD
            </button>
            <button
              onClick={() => setFormat("TXT")}
              className={`px-3 py-1 text-[11px] font-bold rounded flex items-center gap-1 transition-all ${format === "TXT" ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-800"}`}
            >
              <Type className="w-3.5 h-3.5" /> TXT
            </button>
          </div>
          <button
            onClick={() => setShowHistory((prev) => !prev)}
            className={`p-2 rounded-lg transition-colors ${
              showHistory
                ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            title="History"
          >
            <History className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 p-5 overflow-y-auto min-h-[440px]">
        {!extractedData && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-[340px] text-center space-y-6 animate-in fade-in duration-700">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-900/30 rounded-3xl flex items-center justify-center shadow-inner relative">
              <div className="absolute inset-0 bg-blue-400 blur-2xl opacity-10 animate-pulse rounded-full"></div>
              <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400 relative z-10" />
            </div>
            <div className="max-w-[240px]">
              <p className="font-bold text-slate-800 dark:text-slate-200 text-lg tracking-tight">
                Instant Extraction
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Professional tool to extract and process web content with AI.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-[320px]">
              <button
                onClick={handleFullExtract}
                className="col-span-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-white" /> Full Page
              </button>
              <button
                onClick={handleStartInspector}
                className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-2xl text-xs font-bold transition-all flex flex-col items-center gap-2 shadow-sm active:scale-[0.98]"
              >
                <MousePointer2 className="w-5 h-5" /> Picker
              </button>
              <button
                onClick={handleSelectionExtract}
                className="px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all flex flex-col items-center gap-2 shadow-sm active:scale-[0.98]"
              >
                <Target className="w-5 h-5" /> Selection
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-[340px] space-y-5">
            <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Processing...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-3xl p-8 text-center animate-in zoom-in duration-500">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400 text-sm font-bold leading-relaxed mb-6">
              {error}
            </p>
            <button
              onClick={() => setError(null)}
              className="w-full py-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/40 text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-widest rounded-xl"
            >
              Go Back
            </button>
          </div>
        )}

        {showHistory && !loading && (
          <section className="space-y-3 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Extraction History
              </h2>
              <button
                onClick={handleClearHistory}
                disabled={history.length === 0}
                className="text-[10px] font-bold text-red-500 disabled:text-slate-300 uppercase tracking-wider"
              >
                Clear All
              </button>
            </div>

            {history.length === 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-500">
                Belum ada history ekstraksi.
              </div>
            )}

            {history.map((item) => (
              <article
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 truncate">
                      {item.siteName || item.url}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(item.createdAt).toLocaleString()} •{" "}
                      {item.source} • {item.format}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleRestoreHistory(item)}
                      className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold"
                    >
                      Pakai Lagi
                    </button>
                    <button
                      onClick={() => handleDeleteHistory(item.id)}
                      className="p-1.5 rounded-md bg-red-50 text-red-600"
                      title="Hapus item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {extractedData && !loading && !showHistory && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-2">
            {/* Metadata Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl border-l-4 border-l-blue-600 relative group">
              <div className="absolute top-0 right-0 p-3 flex gap-2">
                {wasAutoCopied && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[9px] font-bold rounded-full animate-in zoom-in">
                    <Sparkles className="w-2.5 h-2.5" /> Auto-copied
                  </div>
                )}
                <button
                  onClick={() => setExtractedData(null)}
                  className="text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h2 className="font-bold text-slate-800 dark:text-white leading-tight pr-12 text-sm tracking-tight mb-4">
                {extractedData.title}
              </h2>
              <div className="flex flex-wrap gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                  <Clock className="w-3 h-3 text-blue-500" />
                  {stats.time} Min
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                  <Hash className="w-3 h-3 text-indigo-500" />
                  {stats.words} Words
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                  <ExternalLink className="w-3 h-3 text-emerald-500" />
                  {extractedData.siteName}
                </div>
              </div>
            </div>

            {/* Preview Box */}
            <div className="relative group">
              <textarea
                readOnly
                className="w-full h-80 bg-slate-100 dark:bg-slate-900/50 border-none rounded-3xl p-5 text-xs font-mono text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500/20 resize-none transition-all scrollbar-thin leading-relaxed"
                value={
                  format === "MD"
                    ? extractedData.content
                    : extractedData.textContent
                }
              />
              <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <button
                  onClick={handleAskAI}
                  className="p-3 bg-indigo-600 text-white shadow-xl rounded-2xl hover:bg-indigo-700 transition-all active:scale-90"
                  title="Ask AI Summary"
                >
                  <BrainCircuit className="w-5 h-5 fill-white/20" />
                </button>
                <button
                  onClick={handleCopy}
                  className="p-3 bg-white/95 dark:bg-slate-800/95 shadow-xl rounded-2xl hover:bg-white transition-all border border-slate-200 dark:border-slate-700 active:scale-90"
                  title="Copy"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="p-3 bg-white/95 dark:bg-slate-800/95 shadow-xl rounded-2xl hover:bg-white transition-all border border-slate-200 dark:border-slate-700 active:scale-90"
                  title="Download"
                >
                  <Download className="w-5 h-5 text-blue-500" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Actions */}
      {!showSettings && !showHistory && extractedData && (
        <footer className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex gap-3 animate-in slide-in-from-bottom-6 duration-700">
          <button
            onClick={handleFullExtract}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Zap className="w-4 h-4 fill-white" /> Whole Page
          </button>
          <button
            onClick={handleAskAI}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <MessageSquare className="w-4 h-4 fill-white/20" /> Summarize with
            AI
          </button>
        </footer>
      )}
    </div>
  );
}

export default App;
