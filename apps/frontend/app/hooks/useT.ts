"use client";
import { TEXT } from "@/app/constants/text";
import { useLang } from "./useLang";

export function useT() {
  const lang = useLang();
  return TEXT[lang];    
}
