"use client";

import { Suspense, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "./components/shell/Sidebar";
import EngineSelector from "./components/home/EngineSelector";
import HeroInput from "./components/home/HeroInput";
import SuggestionChips from "./components/home/SuggestionChips";
import TrustStrip from "./components/home/TrustStrip";
import HowItWorks from "./components/landing/HowItWorks";
import EngineCards from "./components/landing/EngineCards";
import WhyOctux from "./components/landing/WhyOctux";
import Pricing from "./components/landing/Pricing";
import Manifesto from "./components/landing/Manifesto";
import Footer from "./components/landing/Footer";

export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  );
}

function HomePageInner() {
  const [activeEngine, setActiveEngine] = useState<string>("simulate");
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefill = searchParams.get("q") || "";

  const handleSubmit = useCallback((query: string) => {
    const id = `sim_${Date.now()}`;
    const params = new URLSearchParams({ question: query, engine: activeEngine });
    router.push(`/sim/${id}?${params.toString()}`);
  }, [activeEngine, router]);

  const handleChipSelect = useCallback((suggestion: string) => {
    handleSubmit(suggestion);
  }, [handleSubmit]);

  return (
    <div style={{ display: "flex", minHeight: "100dvh" }}>
      {/* Sidebar */}
      <Sidebar
        activeEngine={null}
        onSelectEngine={(id) => {
          if (id) setActiveEngine(id);
        }}
      />

      {/* Main content */}
      <div
        style={{
          flex: 1,
          marginLeft: "var(--sidebar-width-collapsed)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Above fold — full viewport hero */}
        <main
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-8)",
            minHeight: "100dvh",
            position: "relative",
          }}
        >
          {/* Subtle glow behind hero */}
          <div
            className="hero-glow"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
            }}
          />

          {/* Hero content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0,
              position: "relative",
              zIndex: 1,
              width: "100%",
              maxWidth: 640,
            }}
          >
            {/* OX Logo + Title */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-3)",
              }}
            >
              {/* OX Mark */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                OX
              </div>

              {/* Brand */}
              <div style={{ textAlign: "center" }}>
                <h1
                  className="octux-gradient-text"
                  style={{
                    fontSize: 34,
                    fontWeight: 300,
                    lineHeight: 1.2,
                    letterSpacing: -0.5,
                  }}
                >
                  OCTUX AI
                </h1>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 400,
                    color: "var(--text-secondary)",
                    marginTop: 6,
                    opacity: 0.85,
                  }}
                >
                  Turn uncertainty into structured decisions
                </p>
              </div>
            </div>

            {/* Engine Tabs */}
            <div style={{ marginTop: 28 }}>
              <EngineSelector active={activeEngine} onSelect={setActiveEngine} />
            </div>

            {/* Input */}
            <div style={{ marginTop: 32, width: "100%", display: "flex", justifyContent: "center" }}>
              <HeroInput onSubmit={handleSubmit} defaultValue={prefill} />
            </div>

            {/* Suggestion Chips */}
            <div style={{ marginTop: 20 }}>
              <SuggestionChips engine={activeEngine} onSelect={handleChipSelect} />
            </div>

            {/* Trust Strip */}
            <div style={{ marginTop: 24 }}>
              <TrustStrip />
            </div>
          </div>
        </main>

        {/* Below fold — landing sections */}
        <HowItWorks />
        <EngineCards />
        <WhyOctux />
        <Pricing />
        <Manifesto />
        <Footer />
      </div>
    </div>
  );
}
