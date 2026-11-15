"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { naturalVoices } from "../lib/voice-options";

/** Natural AI audio only. Preview samples never contain journal text. */
export function useSpokenReplies() {
  const [enabled, setEnabledState] = useState(false),
    [consent, setConsentState] = useState(false),
    [configured, setConfigured] = useState<boolean | null>(null),
    [speaking, setSpeaking] = useState(false),
    [preparing, setPreparing] = useState(false),
    [speechError, setSpeechError] = useState(""),
    [selectedVoice, setSelectedVoice] = useState(""),
    [rate, setRate] = useState(1);
  const current = useRef<HTMLAudioElement | null>(null),
    objectURL = useRef<string | null>(null),
    pending = useRef<AbortController | null>(null),
    generation = useRef(0),
    enabledRef = useRef(false),
    consentRef = useRef(false),
    selectedRef = useRef(""),
    configuredRef = useRef<boolean | null>(null),
    rateRef = useRef(1);
  rateRef.current = rate;
  const release = useCallback(() => {
    if (current.current) {
      current.current.onended = null;
      current.current.onerror = null;
      current.current.pause();
      current.current.src = "";
      current.current = null;
    }
    if (objectURL.current) {
      URL.revokeObjectURL(objectURL.current);
      objectURL.current = null;
    }
  }, []);
  const stop = useCallback(() => {
    generation.current++;
    pending.current?.abort();
    pending.current = null;
    release();
    setSpeaking(false);
    setPreparing(false);
  }, [release]);
  useEffect(()=>{window.addEventListener("elya-conversation-voice-start",stop);return()=>window.removeEventListener("elya-conversation-voice-start",stop);},[stop]);
  const checkStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/voice", { cache: "no-store" });
      if (!r.ok) throw Error();
      const d = await r.json();
      configuredRef.current = d.configured === true;
      setConfigured(d.configured === true);
    } catch {
      configuredRef.current = false;
      setConfigured(false);
    }
  }, []);
  useEffect(() => {
    checkStatus();
    try {
      const savedPace = Number(localStorage.getItem("wholestory.voicePace"));
      if ([0.9, 1, 1.1].includes(savedPace)) setRate(savedPace);
      const saved = localStorage.getItem("wholestory.naturalVoice") || "";
      if (naturalVoices.some((v) => v.id === saved)) {
        selectedRef.current = saved;
        setSelectedVoice(saved);
      }
    } catch {}
    return () => {
      generation.current++;
      pending.current?.abort();
      release();
    };
  }, [checkStatus, release]);
  const play = useCallback(
    async (src: string, token: number) => {
      if (token !== generation.current) return;
      const audio = new Audio(src);
      audio.playbackRate = rateRef.current;
      current.current = audio;
      audio.onended = () => {
        if (token !== generation.current) return;
        release();
        setSpeaking(false);
      };
      audio.onerror = () => {
        if (token !== generation.current) return;
        release();
        setSpeaking(false);
        setSpeechError(
          "This audio could not play. Try another preview or read the reply.",
        );
      };
      setPreparing(false);
      setSpeaking(true);
      try {
        await audio.play();
      } catch {
        if (token !== generation.current) return;
        release();
        setSpeaking(false);
        setSpeechError(
          "Your browser could not play the audio. Try the preview button again.",
        );
      }
    },
    [release],
  );
  const preview = useCallback(
    (id: string) => {
      const voice = naturalVoices.find((v) => v.id === id);
      if (!voice) return;
      window.dispatchEvent(new Event("elya-legacy-voice-start"));
      stop();
      setSpeechError("");
      void play(voice.sample, generation.current);
    },
    [stop, play],
  );
  const speak = useCallback(
    async (text: string, force = false) => {
      if (!enabledRef.current && !force) return;
      if (!selectedRef.current) {
        setSpeechError("Choose a natural voice from the previews first.");
        return;
      }
      if (!consentRef.current) {
        setSpeechError(
          "Enable consent for sending reply text to OpenAI before using live spoken replies.",
        );
        return;
      }
      if (configuredRef.current === false) {
        setSpeechError(
          "Live natural replies need the server API key. The voice samples are ready to preview.",
        );
        return;
      }
      window.dispatchEvent(new Event("elya-legacy-voice-start"));
      stop();
      const token = generation.current;
      const controller = new AbortController();
      pending.current = controller;
      setPreparing(true);
      setSpeechError("");
      try {
        const r = await fetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voice: selectedRef.current,
            consent: true,
          }),
          signal: controller.signal,
        });
        if (token !== generation.current) return;
        if (!r.ok) {
          const error = await r.json();
          if (r.status === 503) {
            configuredRef.current = false;
            setConfigured(false);
          }
          throw Error(error.error || "Natural voice unavailable");
        }
        const blob = await r.blob();
        if (token !== generation.current) return;
        objectURL.current = URL.createObjectURL(blob);
        pending.current = null;
        await play(objectURL.current, token);
      } catch (e) {
        if (token !== generation.current || controller.signal.aborted) return;
        setPreparing(false);
        setSpeaking(false);
        setSpeechError(
          e instanceof Error
            ? e.message
            : "Natural voice unavailable. The reply is still on screen.",
        );
      }
    },
    [stop, play],
  );
  const chooseVoice = useCallback(
    (id: string) => {
      if (!naturalVoices.some((v) => v.id === id)) return;
      stop();
      selectedRef.current = id;
      setSelectedVoice(id);
      const ready = consentRef.current && configuredRef.current === true;
      enabledRef.current = ready;
      setEnabledState(ready);
      setSpeechError("");
      try {
        localStorage.setItem("wholestory.naturalVoice", id);
      } catch {}
    },
    [stop],
  );
  const toggle = useCallback(
    (value: boolean) => {
      if (
        value &&
        (!selectedRef.current ||
          !consentRef.current ||
          configuredRef.current !== true)
      ) {
        setSpeechError(
          !selectedRef.current
            ? "Choose a natural voice first."
            : !consentRef.current
              ? "Consent to send reply text to OpenAI before enabling live speech."
              : "Live natural replies need the server API key. Previews work now.",
        );
        return;
      }
      enabledRef.current = value;
      setEnabledState(value);
      if (!value) stop();
    },
    [stop],
  );
  const setConsent = useCallback(
    (value: boolean) => {
      consentRef.current = value;
      setConsentState(value);
      if (!value) {
        enabledRef.current = false;
        setEnabledState(false);
        stop();
      }
    },
    [stop],
  );
  const updateRate = useCallback((value: number) => {
    if (![0.9, 1, 1.1].includes(value)) return;
    rateRef.current = value;
    setRate(value);
    try {
      localStorage.setItem("wholestory.voicePace", String(value));
    } catch {}
  }, []);
  const resetPreferences = useCallback(() => {
    stop();
    enabledRef.current = false;
    consentRef.current = false;
    selectedRef.current = "";
    rateRef.current = 1;
    setEnabledState(false);
    setConsentState(false);
    setSelectedVoice("");
    setRate(1);
    try {
      localStorage.removeItem("wholestory.naturalVoice");
      localStorage.removeItem("wholestory.voicePace");
      localStorage.removeItem("wholestory.voice");
    } catch {}
  }, [stop]);
  return {
    resetPreferences,
    enabled,
    setEnabled: toggle,
    supported: true,
    speaking,
    preparing,
    speechError,
    speak,
    stop,
    voices: naturalVoices,
    selectedVoice,
    chooseVoice,
    preview,
    rate,
    setRate: updateRate,
    consent,
    setConsent,
    configured,
    checkStatus,
  };
}
