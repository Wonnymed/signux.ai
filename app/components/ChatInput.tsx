"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { ArrowUp, Paperclip, Globe, X, FileText, FileCode, Mic, MicOff, Wand2, Loader2 } from "lucide-react";
import { useEnhance } from "../lib/useEnhance";
import { t, getLanguage } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
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
  "en": "en-US",
  "pt-BR": "pt-BR",
  "es": "es-ES",
  "fr": "fr-FR",
  "de": "de-DE",
  "it": "it-IT",
  "nl": "nl-NL",
  "ru": "ru-RU",
  "zh-Hans": "zh-CN",
  "zh-Hant": "zh-TW",
  "ja": "ja-JP",
  "ko": "ko-KR",
  "ar": "ar-SA",
  "hi": "hi-IN",
  "tr": "tr-TR",
  "pl": "pl-PL",
  "sv": "sv-SE",
  "da": "da-DK",
  "no": "nb-NO",
  "fi": "fi-FI",
  "cs": "cs-CZ",
  "ro": "ro-RO",
  "hu": "hu-HU",
  "uk": "uk-UA",
  "el": "el-GR",
  "id": "id-ID",
  "vi": "vi-VN",
  "th": "th-TH",
  "he": "he-IL",
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
};

export default function ChatInput({
  value, onChange, onSend, loading, placeholder,
  searchActive, onToggleSearch, showDisclaimer = true,
  attachments, onAttachmentsChange, onToast, mode,
}: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);
  const { enhance, enhancing, wasEnhanced } = useEnhance(mode || "chat");

  /* Voice state */
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

  /* Cleanup recognition on unmount */
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

  /* ═══ File Processing ═══ */
  const processFiles = async (files: File[]) => {
    const newAttachments: FileAttachment[] = [];
    for (const file of files) {
      if (!isSupportedFile(file)) {
        onToast?.(t("file.not_supported"), "error");
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        onToast?.(t("file.too_large"), "error");
        continue;
      }
      const isImage = IMAGE_TYPES.includes(file.type);
      let preview: string | undefined;
      if (isImage) {
        preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }
      newAttachments.push({
        file,
        type: isImage ? "image" : "document",
        preview,
        id: Math.random().toString(36).slice(2),
      });
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

  /* ═══ Drag & Drop ═══ */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  /* ═══ Paste ═══ */
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith("image/"));
    if (imageItems.length > 0) {
      e.preventDefault();
      const files: File[] = [];
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
      await processFiles(files);
    }
  };

  /* ═══ Voice Input ═══ */
  const startListening = useCallback(() => {
    if (!isSpeechSupported()) {
      onToast?.(t("voice.not_supported"), "error");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    const bcp47 = LANG_TO_BCP47[getLanguage()] || "en-US";
    recognition.lang = bcp47;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    // Store the text that was in the input before we started
    const baseText = value;
    finalTranscriptRef.current = "";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        finalTranscriptRef.current += final;
      }

      const separator = baseText && (finalTranscriptRef.current || interim) ? " " : "";
      const combined = baseText + separator + finalTranscriptRef.current + interim;
      onChange(combined);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        onToast?.(t("voice.denied"), "error");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [value, onChange, onToast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
  }, []);

  const toggleVoice = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const isMobile = useIsMobile();
  const [focused, setFocused] = useState(false);
  const canSend = (value.trim() || attachments.length > 0) && !loading;
  const speechSupported = typeof window !== "undefined" && isSpeechSupported();
  const iconSize = 16;
  const sendSize = isMobile ? 36 : 32;
  const touchPad = isMobile ? 10 : 6;

  const glowActive = focused || !!value.trim();

  return (
    <div
      style={{ width: "100%", maxWidth: 740, margin: "0 auto", position: "relative" }}

      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {dragging && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          background: "var(--bg-primary)", borderRadius: 20,
          border: "2px dashed var(--accent)", display: "flex",
          alignItems: "center", justifyContent: "center",
          color: "var(--accent)", fontSize: 14, fontWeight: 500,
          pointerEvents: "none",
        }}>
          {t("file.drop_here")}
        </div>
      )}

      {/* Glow container */}
      <div
        className={`input-glow${glowActive ? " focused" : ""}`}
        style={{
          overflow: "hidden",
          padding: "10px 16px 8px 16px",
          ...(isListening ? { borderColor: "var(--error)", boxShadow: "none" } : {}),
          ...(attachments.length > 0 ? { borderRadius: "var(--radius-lg)" } : {}),
        }}
      >
        {/* Listening indicator bar */}
        {isListening && (
          <div style={{
            height: 2, background: "var(--error)",
            animation: "pulse 1.5s ease-in-out infinite",
          }} />
        )}

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div style={{
            display: "flex", gap: 8, padding: "10px 14px 4px",
            overflowX: "auto", alignItems: "center",
          }}>
            {attachments.map(att => (
              <div key={att.id} style={{ position: "relative", flexShrink: 0 }}>
                {att.type === "image" && att.preview ? (
                  <div style={{ position: "relative" }}>
                    <img
                      src={att.preview}
                      alt={att.file.name}
                      style={{
                        width: 48, height: 48, borderRadius: "var(--radius-sm)",
                        objectFit: "cover", display: "block",
                      }}
                    />
                    <button
                      onClick={() => removeAttachment(att.id)}
                      style={{
                        position: "absolute", top: -6, right: -6,
                        width: 18, height: 18, borderRadius: "50%",
                        background: "var(--text-primary)", border: "none",
                        color: "var(--text-inverse)", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10,
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 10px", background: "var(--bg-secondary)",
                    border: "1px solid var(--border-secondary)",
                    borderRadius: "var(--radius-sm)", height: 48,
                  }}>
                    {isCodeFile(att.file.name) ? <FileCode size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} /> : <FileText size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 500, color: "var(--text-primary)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        maxWidth: 120,
                      }}>
                        {att.file.name}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                        {formatFileSize(att.file.size)}
                      </div>
                    </div>
                    <button
                      onClick={() => removeAttachment(att.id)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--text-tertiary)", display: "flex", padding: 2,
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Smart Analysis badge */}
        {attachments.length > 0 && (
          <div style={{
            fontSize: 11,
            color: "var(--accent)",
            fontFamily: "var(--font-mono)",
            padding: "4px 0 2px",
            display: "flex",
            alignItems: "center",
            gap: 4,
            letterSpacing: 0.3,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            Smart Analysis active — file will be analyzed with recommendations
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
            padding: 0,
            background: "transparent",
            border: "none",
            color: "var(--text-primary)",
            fontSize: 15,
            outline: "none",
            lineHeight: 1.5,
            minHeight: 22,
            maxHeight: 120,
            opacity: enhancing ? 0.5 : 1,
            transition: "opacity 150ms ease",
          }}
        />

        {/* Toolbar row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
          {/* Left toolbar icons */}
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: touchPad, borderRadius: 6, display: "flex",
                color: "var(--text-tertiary)", transition: "color 0.15s",
                minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center",
              }}
              aria-label="Attach file"
            >
              <Paperclip size={iconSize} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT_STRING}
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            {onToggleSearch && (
              <button
                onClick={onToggleSearch}
                style={{
                  background: searchActive ? "var(--accent-bg)" : "none",
                  border: searchActive ? "1px solid var(--accent)" : "none",
                  cursor: "pointer",
                  padding: 6, borderRadius: 6, display: "flex",
                  color: searchActive ? "var(--accent)" : "var(--text-tertiary)",
                  transition: "all 0.15s",
                }}
                aria-label="Web search"
              >
                <Globe size={16} />
              </button>
            )}
            {/* Mic button */}
            <button
              onClick={toggleVoice}
              style={{
                background: "none", border: "none",
                cursor: speechSupported ? "pointer" : "default",
                padding: touchPad, borderRadius: "var(--radius-xs)", display: "flex",
                color: isListening ? "var(--error)" : "var(--text-tertiary)",
                opacity: speechSupported ? 1 : 0.3,
                transition: "color 0.15s",
                animation: isListening ? "voicePulse 1.5s ease-in-out infinite" : "none",
                width: 28, height: 28, alignItems: "center", justifyContent: "center",
              }}
              aria-label={t("voice.tooltip")}
            >
              {isListening ? <MicOff size={iconSize} /> : <Mic size={iconSize} />}
            </button>
            {/* Enhance button */}
            {value.trim().length >= 10 && (
              <button
                onClick={handleEnhance}
                disabled={enhancing}
                title={`Enhance your message (${navigator?.platform?.includes("Mac") ? "⌘" : "Ctrl"}+E)`}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "none",
                  background: wasEnhanced ? "var(--accent-soft, rgba(212,175,55,0.1))" : enhancing ? "var(--bg-tertiary)" : "none",
                  cursor: enhancing ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: wasEnhanced ? "var(--accent)" : enhancing ? "var(--text-tertiary)" : "var(--text-tertiary)",
                  transition: "all 200ms",
                  padding: 0,
                }}
                onMouseEnter={e => {
                  if (!enhancing && !wasEnhanced) { e.currentTarget.style.background = "var(--bg-hover, rgba(255,255,255,0.06))"; e.currentTarget.style.color = "var(--accent)"; }
                }}
                onMouseLeave={e => {
                  if (!enhancing && !wasEnhanced) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-tertiary)"; }
                }}
              >
                {enhancing ? (
                  <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <Wand2 size={15} />
                )}
              </button>
            )}
          </div>

          {/* Send button */}
          {/* Enhanced badge */}
          {wasEnhanced && (
            <div style={{
              fontSize: 10,
              color: "var(--accent)",
              fontFamily: "var(--font-mono)",
              letterSpacing: 0.5,
              display: "flex",
              alignItems: "center",
              gap: 4,
              animation: "fadeIn 200ms ease",
              whiteSpace: "nowrap",
            }}>
              <Wand2 size={10} /> Enhanced — review and send
            </div>
          )}

          {/* Send button */}
          <button
            onClick={onSend}
            disabled={!canSend}
            style={{
              width: sendSize,
              height: sendSize,
              borderRadius: "50%",
              background: canSend ? "var(--accent)" : "var(--bg-tertiary)",
              border: "none",
              cursor: canSend ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
              color: canSend ? "#fff" : "var(--text-tertiary)",
              flexShrink: 0,
            }}
          >
            <ArrowUp size={16} />
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
