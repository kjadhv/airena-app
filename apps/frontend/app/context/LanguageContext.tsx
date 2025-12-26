"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { db } from "@/app/firebase/config";
import { doc, getDoc } from "firebase/firestore";

export type Lang = "en" | "hi";

const LanguageContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
}>({
  lang: "en",
  setLang: () => {},
});

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    if (!user) return;

    const loadLang = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setLang((snap.data().language as Lang) || "en");
      }
    };

    loadLang();
  }, [user]);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
