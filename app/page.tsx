"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProfile } from "./lib/profile";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const profile = getProfile();
    if (profile && profile.name && profile.email) {
      router.replace("/chat");
    } else {
      router.replace("/onboarding");
    }
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }} />
  );
}
