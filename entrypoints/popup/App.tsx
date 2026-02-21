import { useState, useMemo, useEffect } from "react";
import { sendMessage } from "@/lib/messaging";
import type { ExtractionResult } from "@/lib/types";
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
} from "lucide-react";
import "./App.css";

function App() {
  const [extractedData, setExtractedData] = useState<ExtractionResult | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<"MD" | "TXT">("MD");
  const [wasAutoCopied, setWasAutoCopied] = useState(false);

  // Load last visual extraction on popup open
  useEffect(() => {
    if (
      typeof browser !== "undefined" &&
      browser.storage &&
      browser.storage.local
    ) {
      browser.storage.local
        .get("lastVisualExtraction")
        .then((res) => {
          const data = res as { lastVisualExtraction?: ExtractionResult };
          if (data.lastVisualExtraction) {
            setExtractedData(data.lastVisualExtraction);
            setWasAutoCopied(true);
            // Reset status copied setelah 3 detik
            setTimeout(() => setWasAutoCopied(false), 3000);
            browser.storage.local.remove("lastVisualExtraction");
          }
        })
        .catch((err) => console.error("Storage Error:", err));
    }
  }, []);

  const stats = useMemo(() => {
    if (!extractedData) return { words: 0, time: 0 };
    const wordCount = extractedData.textContent.trim().split(/\s+/).length;
    return {
      words: wordCount,
      time: Math.max(1, Math.ceil(wordCount / 200)),
    };
  }, [extractedData]);

  const safeSendMessage = async (
    tabId: number,
    action: "extractContent" | "extractSelection" | "startInspector",
  ) => {
    try {
      return await sendMessage(action, undefined, { tabId });
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
        return await sendMessage(action, undefined, { tabId });
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
      if (result) setExtractedData(result);
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
      if (result) setExtractedData(result);
    } catch (err: any) {
      if (err.message?.includes("selected")) {
        setError("Please highlight/select some text first!");
      } else {
        setError(err.message || "Selection extraction failed.");
      }
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
      window.close(); // Popup close to allow picking
    } catch (err: any) {
      setError(err.message || "Could not start visual picker.");
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
              v2.4
            </span>
          </h1>
        </div>
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
              <p className="font-bold text-slate-800 dark:text-slate-200 text-lg">
                Instant Extraction
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Pick an element, select text, or extract the whole page in one
                click.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-[320px]">
              <button
                onClick={handleFullExtract}
                className="col-span-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-white" /> Extract Full Page
              </button>
              <button
                onClick={handleStartInspector}
                className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-2xl text-xs font-bold transition-all flex flex-col items-center gap-2 shadow-sm active:scale-[0.98]"
              >
                <MousePointer2 className="w-5 h-5" /> Visual Picker
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
            <div className="relative">
              <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
              <div className="absolute inset-0 blur-xl bg-blue-400 opacity-20 animate-pulse"></div>
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Processing Content...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-3xl p-8 text-center animate-in zoom-in duration-500">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <p className="text-red-600 dark:text-red-400 text-sm font-bold leading-relaxed mb-6">
              {error}
            </p>
            <button
              onClick={() => setError(null)}
              className="w-full py-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/40 text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-widest rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            >
              Go Back
            </button>
          </div>
        )}

        {extractedData && !loading && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-2">
            {/* Metadata Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl shadow-slate-200/50 dark:shadow-none border-l-4 border-l-blue-600 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3">
                <button
                  onClick={() => setExtractedData(null)}
                  className="text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {wasAutoCopied && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-full mb-3 animate-in fade-in zoom-in">
                  <Sparkles className="w-3 h-3 fill-green-600" /> Auto-copied to
                  Clipboard!
                </div>
              )}
              <div className="flex items-start justify-between mb-4">
                <h2 className="font-bold text-slate-800 dark:text-white leading-tight pr-6 text-base tracking-tight">
                  {extractedData.title}
                </h2>
              </div>
              <div className="flex flex-wrap gap-4 text-[11px] font-bold text-slate-500 tracking-tight">
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  {stats.time} min read
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full">
                  <Hash className="w-3.5 h-3.5 text-indigo-500" />
                  {stats.words} words
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full">
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
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
                  onClick={handleCopy}
                  className="p-3 bg-white/95 dark:bg-slate-800/95 shadow-xl rounded-2xl hover:bg-white dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 active:scale-90"
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
                  className="p-3 bg-white/95 dark:bg-slate-800/95 shadow-xl rounded-2xl hover:bg-white dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 active:scale-90"
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
      {extractedData && (
        <footer className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex gap-3 animate-in slide-in-from-bottom-6 duration-700">
          <button
            onClick={handleFullExtract}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
          >
            Extract Whole Page
          </button>
          <button
            onClick={handleStartInspector}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
          >
            <MousePointer2 className="w-4 h-4" /> Change Picker
          </button>
        </footer>
      )}
    </div>
  );
}

export default App;
