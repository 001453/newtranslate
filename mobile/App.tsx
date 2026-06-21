import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";

import { LANGUAGES, langName, nextLang, type LangCode } from "./src/lib/languages";
import { initEngine, pairHint, translateText } from "./src/lib/qvac-engine";

type Phase = "loading" | "ready" | "error";

export default function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [status, setStatus] = useState("Starting…");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fromLang, setFromLang] = useState<LangCode>("en");
  const [toLang, setToLang] = useState<LangCode>("tr");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [engine, setEngine] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await initEngine((label, pct) => {
          if (!cancelled) {
            setStatus(label);
            setProgress(pct);
          }
        });
        if (!cancelled) {
          setPhase("ready");
          setStatus("Ready — sovereign mode (on-device only)");
          setProgress(null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setPhase("error");
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const onProgress = useCallback((label: string, pct: number | null) => {
    setStatus(label);
    setProgress(pct);
  }, []);

  const handleTranslate = useCallback(async () => {
    if (phase !== "ready" || busy || !input.trim()) return;
    setBusy(true);
    setOutput("");
    setEngine("");
    try {
      const result = await translateText(input, fromLang, toLang, onProgress);
      setOutput(result.text);
      setEngine(result.engine === "bergamot" ? "Bergamot NMT" : "QVAC LLM");
      setStatus("Ready — sovereign mode (on-device only)");
      setProgress(null);
    } catch (e: unknown) {
      setOutput("");
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [phase, busy, input, fromLang, toLang, onProgress]);

  const swapLangs = () => {
    setFromLang(toLang);
    setToLang(fromLang);
    setOutput("");
  };

  if (phase === "loading") {
    return (
      <SafeAreaView style={styles.safe}>
        <ExpoStatusBar style="light" />
        <View style={styles.center}>
          <Text style={styles.title}>GlobalBridge AI</Text>
          <Text style={styles.sub}>{status}</Text>
          {progress != null && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          )}
          <ActivityIndicator color="#3b82f6" style={{ marginTop: 24 }} />
          <Text style={styles.hint}>First launch downloads AI models to your phone.{"\n"}Use a physical device (not emulator).</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === "error") {
    return (
      <SafeAreaView style={styles.safe}>
        <ExpoStatusBar style="light" />
        <View style={styles.center}>
          <Text style={styles.title}>GlobalBridge AI</Text>
          <Text style={styles.error}>Setup failed</Text>
          <Text style={styles.sub}>{error}</Text>
          <Text style={styles.hint}>Requires Android 12+ with Vulkan/OpenCL GPU.{"\n"}See mobile/README.md</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ExpoStatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 8}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>GlobalBridge AI</Text>
          <Text style={styles.sub}>Sovereign translation — audio & text stay on device</Text>

          <View style={styles.langRow}>
            <Pressable style={styles.langBtn} onPress={() => setFromLang((c) => nextLang(c))}>
              <Text style={styles.langLabel}>From</Text>
              <Text style={styles.langValue}>{langName(fromLang)}</Text>
            </Pressable>
            <Pressable style={styles.swapBtn} onPress={swapLangs}>
              <Text style={styles.swapText}>⇄</Text>
            </Pressable>
            <Pressable style={styles.langBtn} onPress={() => setToLang((c) => nextLang(c))}>
              <Text style={styles.langLabel}>To</Text>
              <Text style={styles.langValue}>{langName(toLang)}</Text>
            </Pressable>
          </View>
          <Text style={styles.pairHint}>{pairHint(fromLang, toLang)}</Text>

          <TextInput
            style={styles.input}
            multiline
            placeholder="Type or paste text…"
            placeholderTextColor="#6b7280"
            value={input}
            onChangeText={setInput}
            editable={!busy}
          />

          <Pressable
            style={[styles.primaryBtn, (!input.trim() || busy) && styles.primaryBtnDisabled]}
            onPress={handleTranslate}
            disabled={!input.trim() || busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Translate</Text>
            )}
          </Pressable>

          {progress != null && busy && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          )}
          {busy && <Text style={styles.statusLine}>{status}</Text>}

          {output ? (
            <View style={styles.outputBox}>
              <Text style={styles.outputLabel}>Translation {engine ? `· ${engine}` : ""}</Text>
              <Text style={styles.outputText}>{output}</Text>
            </View>
          ) : null}

          <Text style={styles.footer}>
            MVP — text translation only. Live captions & Keet meetings: use Windows desktop + Chrome extension.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0b0f14",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { color: "#e8eef5", fontSize: 22, fontWeight: "700", marginBottom: 6 },
  sub: { color: "#8b9cb0", fontSize: 14, lineHeight: 20, marginBottom: 16 },
  error: { color: "#ef4444", fontSize: 16, fontWeight: "600", marginTop: 12 },
  hint: { color: "#6b7280", fontSize: 13, textAlign: "center", marginTop: 20, lineHeight: 20 },
  langRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  langBtn: {
    flex: 1,
    backgroundColor: "#121820",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  langLabel: { color: "#8b9cb0", fontSize: 11, marginBottom: 4 },
  langValue: { color: "#e8eef5", fontSize: 16, fontWeight: "600" },
  swapBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  swapText: { color: "#3b82f6", fontSize: 20 },
  pairHint: { color: "#6b7280", fontSize: 12, marginBottom: 14 },
  input: {
    minHeight: 120,
    backgroundColor: "#121820",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    color: "#e8eef5",
    padding: 14,
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  progressBar: {
    height: 6,
    backgroundColor: "#1e293b",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
    width: "100%",
  },
  progressFill: { height: "100%", backgroundColor: "#22c55e" },
  statusLine: { color: "#8b9cb0", fontSize: 12, marginBottom: 12 },
  outputBox: {
    backgroundColor: "#121820",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#22c55e44",
    padding: 14,
    marginTop: 4,
  },
  outputLabel: { color: "#22c55e", fontSize: 12, marginBottom: 8 },
  outputText: { color: "#e8eef5", fontSize: 17, lineHeight: 24 },
  footer: { color: "#6b7280", fontSize: 12, lineHeight: 18, marginTop: 24 },
});
