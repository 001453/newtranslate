"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: { isFinal: boolean; [index: number]: { transcript: string } };
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

const SPEECH_LANG: Record<string, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  it: "it-IT",
  pt: "pt-BR",
  ru: "ru-RU",
  ja: "ja-JP",
  ko: "ko-KR",
  zh: "zh-CN",
  ar: "ar-SA",
  nl: "nl-NL",
  pl: "pl-PL",
  sv: "sv-SE",
  uk: "uk-UA",
  he: "he-IL",
  fa: "fa-IR",
  hi: "hi-IN",
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
};

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionLike)
  | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

function toSpeechLang(code: string): string {
  const base = (code || "en").split("-")[0].toLowerCase();
  return SPEECH_LANG[base] || "en-US";
}

/** Chrome stops recognition after each pause even with continuous=true — restart unless user stopped. */
const RESTART_MS = 120;

export function useSpeechDictation(
  langCode: string,
  onTranscript: (text: string, final: boolean) => void
) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const intentionalStopRef = useRef(false);
  const activeRef = useRef(false);
  const langRef = useRef(langCode);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  onTranscriptRef.current = onTranscript;
  langRef.current = langCode;

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    activeRef.current = false;
    clearRestartTimer();
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  }, [clearRestartTimer]);

  const bindRecognition = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || !activeRef.current) return;

    const rec = new Ctor();
    rec.lang = toSpeechLang(langRef.current);
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0]?.transcript || "";
        if (e.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      if (finalText) onTranscriptRef.current(finalText.trim(), true);
      else if (interim) onTranscriptRef.current(interim.trim(), false);
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      // Chrome: no-speech after silence — onend will restart
      if (e.error === "no-speech" || e.error === "network") return;
      if (e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        intentionalStopRef.current = true;
        activeRef.current = false;
        setListening(false);
        recRef.current = null;
      }
    };

    rec.onend = () => {
      recRef.current = null;
      if (intentionalStopRef.current || !activeRef.current) {
        setListening(false);
        return;
      }
      // Chrome cuts session after pause — keep dictation alive
      clearRestartTimer();
      restartTimerRef.current = setTimeout(() => {
        if (!activeRef.current || intentionalStopRef.current) return;
        try {
          bindRecognition();
        } catch {
          activeRef.current = false;
          setListening(false);
        }
      }, RESTART_MS);
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      clearRestartTimer();
      restartTimerRef.current = setTimeout(() => {
        if (activeRef.current && !intentionalStopRef.current) bindRecognition();
      }, RESTART_MS);
    }
  }, [clearRestartTimer]);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    clearRestartTimer();
    intentionalStopRef.current = false;
    activeRef.current = true;
    setListening(true);
    recRef.current?.abort();
    recRef.current = null;
    bindRecognition();
  }, [bindRecognition, clearRestartTimer]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return { listening, supported, start, stop, toggle };
}
