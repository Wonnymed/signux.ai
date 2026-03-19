"use client";
import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("signux_pwa_dismissed");
    if (dismissed) return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("signux_pwa_dismissed", "true");
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
      zIndex: 50,
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 14px", borderRadius: 50,
      background: "var(--bg-secondary, #141414)", border: "1px solid var(--border-secondary)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      fontSize: 11, color: "var(--text-secondary)",
      maxWidth: 320,
    }}>
      <Download size={16} style={{ color: "var(--accent)" }} />
      <span>Install Signux AI</span>
      <button onClick={install} style={{
        padding: "4px 12px", borderRadius: 6,
        background: "var(--accent)", color: "#000",
        border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
      }}>
        Install
      </button>
      <button onClick={dismiss} style={{
        background: "none", border: "none", cursor: "pointer",
        color: "var(--text-tertiary)", padding: 2,
      }}>
        <X size={14} />
      </button>
    </div>
  );
}
