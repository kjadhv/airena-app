"use client";
import { useEffect, useState } from "react";

export type Lang = "en" | "hi";

export function useLang() {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const apply = () => {
      const stored = localStorage.getItem("airena-preferred-language");
      if (stored === "en" || stored === "hi") setLang(stored);
    };

    apply();
    window.addEventListener("lang-change", apply);
    return () => window.removeEventListener("lang-change", apply);
  }, []);

  return lang;
}
