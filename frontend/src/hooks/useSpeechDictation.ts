"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  dictationLog,
  EMPTY_DICTATION_DEBUG,
  type DictationDebugState,
} from "@/lib/dictationDebug";

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
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onnomatch: (() => void) | null;
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

const RESTART_MS = 450;
const NO_SPEECH_WARN_AFTER = 3;

export function useSpeechDictation(
  langCode: string,
  onTranscript: (text: string, final: boolean) => void
) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<DictationDebugState>(EMPTY_DICTATION_DEBUG);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const intentionalStopRef = useRef(false);
  const activeRef = useRef(false);
  const langRef = useRef(langCode);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartCountRef = useRef(0);
  const resultCountRef = useRef(0);
  const noSpeechCountRef = useRef(0);
  const restartDelayRef = useRef(RESTART_MS);
  const audioEverStartedRef = useRef(false);

  onTranscriptRef.current = onTranscript;
  langRef.current = langCode;

  const patchDebug = useCallback((patch: Partial<DictationDebugState>) => {
    setDebug((prev) => ({ ...prev, ...patch, updatedAt: Date.now() }));
  }, []);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const scheduleRestart = useCallback(
    (bindFn: () => void) => {
      clearRestartTimer();
      const delay = restartDelayRef.current;
      patchDebug({ phase: "restarting" });
      restartTimerRef.current = setTimeout(() => {
        if (!activeRef.current || intentionalStopRef.current) return;
        restartCountRef.current += 1;
        try {
          bindFn();
        } catch (err) {
          dictationLog("restart_failed", err);
          activeRef.current = false;
          setListening(false);
          setError("unknown");
        }
      }, delay);
    },
    [clearRestartTimer, patchDebug]
  );

  const stop = useCallback(() => {
    dictationLog("stop");
    intentionalStopRef.current = true;
    activeRef.current = false;
    clearRestartTimer();
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
    noSpeechCountRef.current = 0;
    restartDelayRef.current = RESTART_MS;
    audioEverStartedRef.current = false;
    patchDebug({ phase: "stopped", speechStarted: false, audioStarted: false });
  }, [clearRestartTimer, patchDebug]);

  const bindRecognition = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || !activeRef.current) return;

    const speechLang = toSpeechLang(langRef.current);
    dictationLog("bind", { lang: speechLang, delay: restartDelayRef.current });
    patchDebug({ phase: "binding", lang: speechLang, restarts: restartCountRef.current });

    const rec = new Ctor();
    rec.lang = speechLang;
    // Chrome on Windows: continuous=true often fires no-speech before user speaks.
    rec.continuous = false;
    rec.interimResults = true;

    rec.onstart = () => {
      dictationLog("onstart");
      patchDebug({ phase: "started", lang: speechLang });
    };

    rec.onaudiostart = () => {
      dictationLog("onaudiostart");
      audioEverStartedRef.current = true;
      patchDebug({ audioStarted: true });
    };

    rec.onaudioend = () => {
      dictationLog("onaudioend");
      patchDebug({ audioStarted: false });
    };

    rec.onspeechstart = () => {
      dictationLog("onspeechstart");
      noSpeechCountRef.current = 0;
      restartDelayRef.current = RESTART_MS;
      setError(null);
      patchDebug({ speechStarted: true, phase: "hearing_speech", lastError: "" });
    };

    rec.onspeechend = () => {
      dictationLog("onspeechend");
      patchDebug({ speechStarted: false, phase: "speech_pause" });
    };

    rec.onnomatch = () => {
      dictationLog("onnomatch");
      patchDebug({ phase: "no_match" });
    };

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0]?.transcript || "";
        if (e.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      const text = (finalText || interim).trim();
      if (!text) return;

      noSpeechCountRef.current = 0;
      restartDelayRef.current = RESTART_MS;
      setError(null);
      resultCountRef.current += 1;
      dictationLog(finalText ? "result:final" : "result:interim", text);
      patchDebug({
        phase: finalText ? "result_final" : "result_interim",
        results: resultCountRef.current,
        lastText: text,
        lastError: "",
      });

      if (finalText) onTranscriptRef.current(finalText.trim(), true);
      else onTranscriptRef.current(interim.trim(), false);
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      dictationLog("onerror", e.error);
      patchDebug({ lastError: e.error, phase: `error:${e.error}` });

      if (e.error === "no-speech") {
        noSpeechCountRef.current += 1;
        restartDelayRef.current = Math.min(restartDelayRef.current + 500, 3500);
        if (
          noSpeechCountRef.current >= NO_SPEECH_WARN_AFTER &&
          audioEverStartedRef.current &&
          resultCountRef.current === 0
        ) {
          setError("no_speech");
        }
        return;
      }

      if (e.error === "network") {
        setError("network");
        return;
      }
      if (e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        intentionalStopRef.current = true;
        activeRef.current = false;
        setListening(false);
        setError("denied");
        recRef.current = null;
        return;
      }
      setError(e.error || "unknown");
    };

    rec.onend = () => {
      dictationLog("onend", { intentional: intentionalStopRef.current, active: activeRef.current });
      recRef.current = null;
      if (intentionalStopRef.current || !activeRef.current) {
        setListening(false);
        patchDebug({ phase: "ended" });
        return;
      }
      scheduleRestart(bindRecognition);
    };

    recRef.current = rec;
    try {
      rec.start();
      dictationLog("start_called");
    } catch (err) {
      dictationLog("start_throw", err);
      restartDelayRef.current = Math.min(restartDelayRef.current + 300, 2000);
      scheduleRestart(bindRecognition);
    }
  }, [patchDebug, scheduleRestart]);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      setError("unsupported");
      patchDebug({ phase: "unsupported" });
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("secure_context");
      patchDebug({ phase: "insecure_context" });
      return;
    }
    dictationLog("start", { lang: langRef.current });
    clearRestartTimer();
    intentionalStopRef.current = false;
    activeRef.current = true;
    restartCountRef.current = 0;
    resultCountRef.current = 0;
    noSpeechCountRef.current = 0;
    restartDelayRef.current = RESTART_MS;
    audioEverStartedRef.current = false;
    setError(null);
    setListening(true);
    recRef.current?.abort();
    recRef.current = null;
    patchDebug({
      ...EMPTY_DICTATION_DEBUG,
      phase: "starting",
      lang: toSpeechLang(langRef.current),
    });
    // Brief pause so Chrome mic is free after permission probes.
    restartTimerRef.current = setTimeout(() => {
      if (activeRef.current && !intentionalStopRef.current) bindRecognition();
    }, 350);
  }, [bindRecognition, clearRestartTimer, patchDebug]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return { listening, supported, error, start, stop, toggle, debug };
}
