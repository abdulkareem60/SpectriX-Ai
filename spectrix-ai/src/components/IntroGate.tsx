"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function IntroGate() {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("spectrix_intro_seen") === "1";
    } catch {}

    if (seen) {
      // Intro dekh chuka hai, black cover hata do
      if (overlayRef.current) overlayRef.current.style.display = "none";
    } else {
      router.replace("/intro");
    }
  }, [router]);

  // Jab tak check ho raha hai, landing page ek second ke liye bhi flash na ho
  return <div ref={overlayRef} className="fixed inset-0 z-[90] bg-black" />;
}