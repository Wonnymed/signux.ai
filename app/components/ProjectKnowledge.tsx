"use client";
import { useState, useEffect, useCallback } from "react";
import { Upload, FileText, Trash2, Loader2, X } from "lucide-react";

type KnowledgeFile = {
  source_name: string;
  created_at: string;
  metadata: { originalSize?: number; totalChunks?: number };
};

export default function ProjectKnowledge({
  projectId,
  userId,
  onClose,
}: {
  projectId: string;
  userId: string;
  onClose: () => void;
}) {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/knowledge/files?projectId=${projectId}`);
      const data = await res.json();
      if (Array.isArray(data)) setFiles(data);
    } catch {}
  }, [projectId]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const handleUpload = async (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError("File too large (max 10MB)");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);
      formData.append("userId", userId);

      const res = await fetch("/api/knowledge/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        await loadFiles();
      } else {
        setError(data.error || "Upload failed");
        setTimeout(() => setError(""), 3000);
      }
    } catch {
      setError("Upload failed");
      setTimeout(() => setError(""), 3000);
    }
    setUploading(false);
  };

  const handleDelete = async (sourceName: string) => {
    setFiles(prev => prev.filter(f => f.source_name !== sourceName));
    try {
      await fetch("/api/knowledge/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, sourceName }),
      });
    } catch {}
  };

  const triggerFileInput = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.txt,.md,.csv,.doc,.docx";
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) handleUpload(f);
    };
    input.click();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.5)",
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 420, maxHeight: "80vh", overflow: "auto",
          background: "var(--bg-secondary, #141414)",
          border: "1px solid var(--border-secondary)",
          borderRadius: 12, padding: 24,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
            Knowledge Base
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 16, lineHeight: 1.5 }}>
          Upload documents to give the AI context about your project. The AI will search these documents before responding.
        </p>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleUpload(f);
          }}
          onClick={triggerFileInput}
          style={{
            padding: 28, borderRadius: 10, textAlign: "center",
            border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border-secondary)"}`,
            background: dragOver ? "rgba(212,175,55,0.04)" : "transparent",
            cursor: uploading ? "wait" : "pointer", marginBottom: 16,
            transition: "all 200ms",
          }}
        >
          {uploading ? (
            <Loader2 size={20} style={{ color: "var(--accent)", animation: "spin 1s linear infinite", margin: "0 auto 8px", display: "block" }} />
          ) : (
            <Upload size={20} style={{ color: "var(--text-tertiary)", margin: "0 auto 8px", display: "block" }} />
          )}
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {uploading ? "Processing document..." : "Drop file here or click to upload"}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4 }}>
            PDF, TXT, MD, CSV, DOC — max 10MB
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            fontSize: 12, color: "var(--error, #ef4444)", padding: "8px 12px",
            borderRadius: 6, background: "rgba(239,68,68,0.06)", marginBottom: 12,
          }}>
            {error}
          </div>
        )}

        {/* File list */}
        {files.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: 16, fontStyle: "italic", opacity: 0.5 }}>
            No documents uploaded yet
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {files.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px", borderRadius: 8,
                border: "1px solid var(--border-secondary)",
              }}>
                <FileText size={14} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.source_name}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                    {f.metadata?.totalChunks ? `${f.metadata.totalChunks} chunks` : ""}
                    {" · "}
                    {new Date(f.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(f.source_name)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-tertiary)", padding: 4, flexShrink: 0,
                    transition: "color 150ms",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--error, #ef4444)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-tertiary)"}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
