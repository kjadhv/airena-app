"use client";

import React, { createContext, useContext, useState } from "react";

type SearchContextType = {
  search: string;
  setSearch: (v: string) => void;
};

const SearchContext = createContext<SearchContextType | null>(null);

/* ===================== PROVIDER ===================== */
export const SearchProvider = ({ children }: { children: React.ReactNode }) => {
  const [search, setSearch] = useState("");

  return (
    <SearchContext.Provider value={{ search, setSearch }}>
      {children}
    </SearchContext.Provider>
  );
};

/* ===================== HOOK ===================== */
export const useSearch = () => {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearch must be used inside SearchProvider");
  }
  return ctx;
};
