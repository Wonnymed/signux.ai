"use client";
import { useState } from "react";
import { signuxFetch } from "../lib/api-client";

export function useEnhance(mode: string = "chat") {
  const [enhancing, setEnhancing] = useState(false);
  const [wasEnhanced, setWasEnhanced] = useState(false);

  const enhance = async (text: string): Promise<string> => {
    if (!text.trim() || text.trim().length < 10 || enhancing) return text;
    setEnhancing(true);
    setWasEnhanced(false);
    try {
      const res = await signuxFetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), mode }),
      });
      if (res.ok) {
        const { enhanced } = await res.json();
        if (enhanced && enhanced !== text) {
          setWasEnhanced(true);
          setTimeout(() => setWasEnhanced(false), 3000);
          setEnhancing(false);
          return enhanced;
        }
      }
    } catch {
      // Silently fail — enhance is optional
    }
    setEnhancing(false);
    return text;
  };

  return { enhance, enhancing, wasEnhanced };
}
