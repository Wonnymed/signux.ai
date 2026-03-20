"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { ArrowUp, Paperclip, Globe, X, FileText, FileCode, Mic, MicOff, Wand2, Loader2, Link as LinkIcon } from "lucide-react";
import { useEnhance } from "../lib/useEnhance";
import { t, getLanguage } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 10;

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const PDF_TYPE = "application/pdf";
const TEXT_EXTENSIONS = [
  ".txt", ".md", ".csv", ".json", ".py", ".js", ".ts", ".html", ".css",
  ".xml", ".yaml", ".yml", ".sql", ".sh", ".bash", ".java", ".go",
  ".rs", ".rb", ".php", ".swift", ".kt", ".tsx", ".jsx",
];

const ACCEPT_STRING = "image/png,image/jpeg,image/gif,image/webp,application/pdf," +
  TEXT_EXTENSIONS.join(",");

const CODE_EXTENSIONS = [
  ".py", ".js", ".ts", ".tsx", ".jsx", ".html", ".css", ".json",
  ".java", ".go", ".rs", ".rb", ".php", ".swift", ".kt", ".sql",
  ".sh", ".bash", ".xml", ".yaml", ".yml",
];

const LANG_TO_BCP47: Record<string, string> = {
  "en": "en-US", "pt-BR": "pt-BR", "es": "es-ES", "fr": "fr-FR",
  "de": "de-DE", "it": "it-IT", "nl": "nl-NL", "ru": "ru-RU",
  "zh-Hans": "zh-CN", "zh-Hant": "zh-TW", "ja": "ja-JP", "ko": "ko-KR",
  "ar": "ar-SA", "hi": "hi-IN", "tr": "tr-TR", "pl": "pl-PL",
  "sv": "sv-SE", "da": "da-DK", "no": "nb-NO", "fi": "fi-FI",
  "cs": "cs-CZ", "ro": "ro-RO", "hu": "hu-HU", "uk": "uk-UA",
  "el": "el-GR", "id": "id-ID", "vi": "vi-VN", "th": "th-TH", "he": "he-IL",
};

export type FileAttachment = {
  file: File;
  type: "image" | "document";
  preview?: string;
  id: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function isCodeFile(name: string): boolean {
  return CODE_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));
}

function isSupportedFile(file: File): boolean {
  if (IMAGE_TYPES.includes(file.type)) return true;
  if (file.type === PDF_TYPE) return true;
  return TEXT_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));
}

function isSpeechSupported(): boolean {
  return typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
}

/* ═══ Paperclip Popover ═══ */
function PaperclipPopover({ onFileClick, isMobile }: { onFileClick: () => void; isMobile: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const btnSize = isMobile ? 40 : 32;

  return (
    <div ref={popoverRef} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: btnSize, height: btnSize, borderRadius: 8,
          background: isOpen ? "rgba(212,175,55,0.08)" : "transparent",
          border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          color: isOpen ? "var(--accent)" : "var(--text-tertiary)",
          transition: "all 150ms ease",
        }}
        onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.color = "var(--accent)"; }}
        onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.color = isOpen ? "var(--accent)" : "var(--text-tertiary)"; }}
        aria-label="Add photos & files"
      >
        <Paperclip size={16} />
      </button>

      {isOpen && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: isMobile ? "50%" : 0,
          transform: isMobile ? "translateX(-50%)" : "none",
          minWidth: isMobile ? "calc(100vw - 64px)" : 240,
          maxWidth: 320,
          padding: 6,
          borderRadius: 14,
          background: "var(--card-bg)",
          border: "1px solid var(--border-secondary)",
          boxShadow: "var(--shadow-lg)",
          zIndex: 100,
          animation: "popoverSlideUp 150ms ease-out",
        }}>
          <div style={{
            padding: "6px 10px 8px",
            fontSize: 10, fontWeight: 600,
            color: "var(--text-tertiary)",
            letterSpacing: 0.5,
            textTransform: "uppercase" as const,
          }}>
            Add to conversation
          </div>

          <button onClick={() => { onFileClick(); setIsOpen(false); }} style={{
            display: "flex", alignItems: "center", gap: 10,
            width: "100%", padding: "8px 10px", borderRadius: 10,
            background: "transparent", border: "none",
            cursor: "pointer", textAlign: "left" as const,
            transition: "background 150ms ease",
            color: "var(--text-primary)",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: "var(--accent-bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--accent)", flexShrink: 0,
            }}>
              <FileText size={14} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Upload files & images</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
                PDF, CSV, DOC, images
              </div>
            </div>
          </button>

          <button onClick={() => { setIsOpen(false); }} style={{
            display: "flex", alignItems: "center", gap: 10,
            width: "100%", padding: "8px 10px", borderRadius: 10,
            background: "transparent", border: "none",
            cursor: "pointer", textAlign: "left" as const,
            transition: "background 150ms ease",
            color: "var(--text-primary)",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: "var(--accent-bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--accent)", flexShrink: 0,
            }}>
              <LinkIcon size={14} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Paste a URL</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
                Website, article, or document
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

type ChatInputProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  loading: boolean;
  placeholder?: string;
  searchActive?: boolean;
  onToggleSearch?: () => void;
  showDisclaimer?: boolean;
  attachments: FileAttachment[];
  onAttachmentsChange: (atts: FileAttachment[]) => void;
  onToast?: (msg: string, type: "success" | "error" | "info") => void;
  mode?: string;
  showVoice?: boolean;
};

export default function ChatInput({
  value, onChange, onSend, loading, placeholder,
  searchActive, onToggleSearch, showDisclaimer = true,
  attachments, onAttachmentsChange, onToast, mode, showVoice = true,
}: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);
  const { enhance, enhancing, wasEnhanced } = useEnhance(mode || "chat");

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  const handleEnhance = async () => {
    if (!value.trim() || value.trim().length < 10 || enhancing) return;
    const improved = await enhance(value);
    if (improved !== value) {
      onChange(improved);
      setTimeout(() => {
        const ta = ref.current;
        if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 160) + "px"; }
      }, 50);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "e") {
      e.preventDefault();
      handleEnhance();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const growRaf = useRef(0);
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    const ta = e.target;
    cancelAnimationFrame(growRaf.current);
    growRaf.current = requestAnimationFrame(() => {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    });
  };

  const processFiles = async (files: File[]) => {
    const newAttachments: FileAttachment[] = [];
    for (const file of files) {
      if (!isSupportedFile(file)) { onToast?.(t("file.not_supported"), "error"); continue; }
      if (file.size > MAX_FILE_SIZE) { onToast?.(t("file.too_large"), "error"); continue; }
      const isImage = IMAGE_TYPES.includes(file.type);
      let preview: string | undefined;
      if (isImage) {
        preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }
      newAttachments.push({ file, type: isImage ? "image" : "document", preview, id: Math.random().toString(36).slice(2) });
    }
    if (newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments].slice(0, MAX_FILES));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter(a => a.id !== id));
  };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; if (e.dataTransfer.types.includes("Files")) setDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setDragging(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = async (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragging(false); dragCounter.current = 0; const files = Array.from(e.dataTransfer.files); if (files.length > 0) await processFiles(files); };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith("image/"));
    if (imageItems.length > 0) {
      e.preventDefault();
      const files: File[] = [];
      for (const item of imageItems) { const file = item.getAsFile(); if (file) files.push(file); }
      await processFiles(files);
    }
  };

  const startListening = useCallback(() => {
    if (!isSpeechSupported()) { onToast?.(t("voice.not_supported"), "error"); return; }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    const bcp47 = LANG_TO_BCP47[getLanguage()] || "en-US";
    recognition.lang = bcp47;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    const baseText = value;
    finalTranscriptRef.current = "";
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      let interim = "", final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      if (final) finalTranscriptRef.current += final;
      const separator = baseText && (finalTranscriptRef.current || interim) ? " " : "";
      onChange(baseText + separator + finalTranscriptRef.current + interim);
    };
    recognition.onerror = (event: any) => { if (event.error === "not-allowed") onToast?.(t("voice.denied"), "error"); setIsListening(false); };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }, [value, onChange, onToast]);

  const stopListening = useCallback(() => { if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} } setIsListening(false); }, []);
  const toggleVoice = useCallback(() => { if (isListening) stopListening(); else startListening(); }, [isListening, startListening, stopListening]);

  /* ═══ Smart Context Detector ═══ */
  const [suggestion, setSuggestion] = useState<{tool: string; label: string; color: string; command: string} | null>(null);

  const detectIntent = useCallback((text: string) => {
    const lower = text.toLowerCase();
    const patterns: Array<{keywords: string[]; tool: string; label: string; color: string; command: string}> = [
      { keywords: ["deal", "pitch deck", "investing", "acquisition", "term sheet", "due diligence", "partnership offer", "evaluate this", "is this legit", "trust", "scam"], tool: "Deal X-Ray", label: "Analyze with Deal X-Ray?", color: "#F59E0B", command: "/xray" },
      { keywords: ["threat", "risk", "danger", "vulnerable", "security", "attack", "competitor threat", "what could go wrong"], tool: "Threat Radar", label: "Run Threat Radar?", color: "#DC2626", command: "/threats" },
      { keywords: ["competitor", "competition", "market share", "they launched", "competing", "how will they react", "competitive"], tool: "War Game", label: "Simulate with War Game?", color: "#8B5CF6", command: "/wargame" },
      { keywords: ["caused", "because of", "led to", "resulted in", "why did", "correlation", "impact of", "dropped after", "increased when"], tool: "Causal Map", label: "Map with Causal Map?", color: "#06B6D4", command: "/causal" },
      { keywords: ["negotiat", "meeting tomorrow", "pitch to", "asking for", "salary", "raise", "contract", "close the deal", "convince"], tool: "Negotiation War Room", label: "Prepare with War Room?", color: "#F97316", command: "/negotiate" },
      { keywords: ["what if", "next year", "future", "scenario", "12 months", "what could happen", "plan for", "prepare for"], tool: "Scenario Planner", label: "Plan with Scenarios?", color: "#22C55E", command: "/scenarios" },
      { keywords: ["simulate", "stress test", "what would happen", "test my idea", "agents", "debate"], tool: "Simulate", label: "Run Simulation?", color: "#D4AF37", command: "" },
      { keywords: ["start a business", "startup", "launch", "side project", "business idea", "validate", "mvp"], tool: "Launchpad", label: "Start with Launchpad?", color: "#14B8A6", command: "" },
    ];
    for (const pattern of patterns) {
      if (pattern.keywords.some(kw => lower.includes(kw))) { setSuggestion({ tool: pattern.tool, label: pattern.label, color: pattern.color, command: pattern.command }); return; }
    }
    setSuggestion(null);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { if (value.length >= 15) detectIntent(value); else setSuggestion(null); }, 500);
    return () => clearTimeout(timer);
  }, [value, detectIntent]);

  const isMobile = useIsMobile();
  const [focused, setFocused] = useState(false);
  const canSend = (value.trim() || attachments.length > 0) && !loading;
  const speechSupported = typeof window !== "undefined" && isSpeechSupported();
  const hasAttachments = attachments.length > 0;

  /* ═══ Computed border radius — rounded when empty, softer when content ═══ */
  const radius = hasAttachments ? 20 : 24;

  return (
    <div
      style={{ width: "100%", position: "relative" }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Smart context suggestion */}
      {suggestion && (
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 12px", borderRadius: 8,
            background: `${suggestion.color}08`, border: `1px solid ${suggestion.color}15`,
            marginBottom: 6, fontSize: 12, color: suggestion.color,
            animation: "fadeIn 300ms ease", cursor: "pointer",
          }}
          onClick={() => { if (suggestion.command) onChange(`${suggestion.command} ${value}`); setSuggestion(null); }}
        >
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: suggestion.color, flexShrink: 0 }} />
          <span>{suggestion.label}</span>
          <span style={{ fontSize: 10, opacity: 0.6, marginLeft: "auto", whiteSpace: "nowrap" }}>Click to activate</span>
          <button onClick={(e) => { e.stopPropagation(); setSuggestion(null); }} style={{
            background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 0, fontSize: 12, lineHeight: 1, flexShrink: 0,
          }}>&#x2715;</button>
        </div>
      )}

      {/* Drop overlay */}
      {dragging && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          background: "var(--bg-primary)", borderRadius: radius,
          border: "2px dashed var(--accent)", display: "flex",
          alignItems: "center", justifyContent: "center",
          color: "var(--accent)", fontSize: 14, fontWeight: 500,
          pointerEvents: "none",
        }}>
          {t("file.drop_here")}
        </div>
      )}

      {/* ═══ Composer Shell ═══ */}
      <div
        style={{
          borderRadius: radius,
          border: `1px solid ${focused ? "rgba(212,175,55,0.4)" : "var(--border-secondary)"}`,
          background: "var(--card-bg)",
          boxShadow: focused
            ? "0 0 0 1px rgba(212,175,55,0.12), 0 2px 24px rgba(212,175,55,0.06)"
            : "0 1px 3px rgba(0,0,0,0.06)",
          transition: "border-color 200ms ease, box-shadow 200ms ease",
          overflow: "hidden",
          ...(isListening ? { borderColor: "var(--error)", boxShadow: "none" } : {}),
        }}
      >
        {/* Listening bar */}
        {isListening && (
          <div style={{ height: 2, background: "var(--error)", animation: "pulse 1.5s ease-in-out infinite" }} />
        )}

        {/* Attachments */}
        {hasAttachments && (
          <div style={{ display: "flex", gap: 8, padding: "12px 16px 4px", overflowX: "auto", alignItems: "center" }}>
            {attachments.map(att => (
              <div key={att.id} style={{ position: "relative", flexShrink: 0 }}>
                {att.type === "image" && att.preview ? (
                  <div style={{ position: "relative" }}>
                    <img src={att.preview} alt={att.file.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", display: "block" }} />
                    <button onClick={() => removeAttachment(att.id)} style={{
                      position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%",
                      background: "var(--text-primary)", border: "none", color: "var(--text-inverse)",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
                    }}><X size={10} /></button>
                  </div>
                ) : (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                    background: "var(--bg-secondary)", border: "1px solid var(--border-secondary)",
                    borderRadius: 8, height: 48,
                  }}>
                    {isCodeFile(att.file.name) ? <FileCode size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} /> : <FileText size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
                        {att.file.name}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{formatFileSize(att.file.size)}</div>
                    </div>
                    <button onClick={() => removeAttachment(att.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", display: "flex", padding: 2 }}>
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Analysis badge */}
        {hasAttachments && (
          <div style={{
            fontSize: 11, color: "var(--accent)", fontFamily: "var(--font-mono)",
            padding: "4px 16px 0", display: "flex", alignItems: "center", gap: 4, letterSpacing: 0.3,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            Smart Analysis active
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={ref}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKey}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={isListening ? t("voice.listening") : (placeholder || t("chat.placeholder"))}
          rows={1}
          style={{
            width: "100%",
            resize: "none",
            padding: isMobile ? "14px 16px 6px" : "16px 20px 6px",
            background: "transparent",
            border: "none",
            color: "var(--text-primary)",
            fontSize: 16,
            outline: "none",
            lineHeight: "24px",
            minHeight: 24,
            maxHeight: 140,
            opacity: enhancing ? 0.5 : 1,
            transition: "opacity 150ms ease",
            caretColor: "var(--accent)",
            fontFamily: "var(--font-body)",
          }}
        />

        {/* ═══ Toolbar ═══ */}
        <div style={{
          display: "flex",
          alignItems: "center",
          padding: isMobile ? "2px 8px 8px" : "2px 12px 10px",
          gap: 2,
        }}>
          {/* Left actions */}
          <PaperclipPopover onFileClick={() => fileInputRef.current?.click()} isMobile={isMobile} />
          <input ref={fileInputRef} type="file" multiple accept={ACCEPT_STRING} style={{ display: "none" }} onChange={handleFileSelect} />

          {onToggleSearch && (
            <button
              onClick={onToggleSearch}
              style={{
                width: isMobile ? 40 : 32, height: isMobile ? 40 : 32, borderRadius: 8,
                background: searchActive ? "var(--accent-bg)" : "transparent",
                border: searchActive ? "1px solid var(--accent)" : "none",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: searchActive ? "var(--accent)" : "var(--text-tertiary)",
                transition: "all 0.15s",
              }}
              aria-label="Web search"
            >
              <Globe size={16} />
            </button>
          )}

          {showVoice && (
            <button
              onClick={toggleVoice}
              style={{
                width: isMobile ? 40 : 32, height: isMobile ? 40 : 32, borderRadius: 8,
                background: "transparent", border: "none",
                cursor: speechSupported ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: isListening ? "var(--error)" : "var(--text-tertiary)",
                opacity: speechSupported ? 1 : 0.3,
                transition: "color 0.15s",
                animation: isListening ? "voicePulse 1.5s ease-in-out infinite" : "none",
              }}
              onMouseEnter={(e) => { if (!isListening) e.currentTarget.style.color = "var(--accent)"; }}
              onMouseLeave={(e) => { if (!isListening) e.currentTarget.style.color = "var(--text-tertiary)"; }}
              aria-label={t("voice.tooltip")}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}

          {value.trim().length >= 10 && (
            <button
              onClick={handleEnhance}
              disabled={enhancing}
              title={`Enhance (${navigator?.platform?.includes("Mac") ? "\u2318" : "Ctrl"}+E)`}
              style={{
                width: isMobile ? 40 : 32, height: isMobile ? 40 : 32, borderRadius: 8,
                border: "none",
                background: wasEnhanced ? "rgba(212,175,55,0.1)" : enhancing ? "var(--bg-tertiary)" : "transparent",
                cursor: enhancing ? "wait" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: wasEnhanced ? "var(--accent)" : enhancing ? "var(--text-tertiary)" : "var(--text-tertiary)",
                transition: "all 200ms",
              }}
              onMouseEnter={e => { if (!enhancing && !wasEnhanced) { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--accent)"; } }}
              onMouseLeave={e => { if (!enhancing && !wasEnhanced) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)"; } }}
            >
              {enhancing ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Wand2 size={15} />}
            </button>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Enhanced badge */}
          {wasEnhanced && (
            <div style={{
              fontSize: 10, color: "var(--accent)", fontFamily: "var(--font-mono)",
              letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 4,
              animation: "fadeIn 200ms ease", whiteSpace: "nowrap", marginRight: 8,
            }}>
              <Wand2 size={10} /> Enhanced
            </div>
          )}

          {/* Send */}
          <button
            onClick={onSend}
            disabled={!canSend}
            style={{
              width: 36, height: 36,
              borderRadius: "50%",
              background: canSend ? "var(--accent)" : "var(--bg-tertiary)",
              border: "none",
              cursor: canSend ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 200ms ease",
              flexShrink: 0,
              opacity: canSend ? 1 : 0.5,
            }}
          >
            <ArrowUp size={16} style={{ color: canSend ? "#000" : "var(--text-tertiary)" }} />
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      {showDisclaimer && (
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "var(--text-tertiary)" }}>
          {t("common.disclaimer")}
        </div>
      )}
    </div>
  );
}
