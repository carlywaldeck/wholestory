"use client";
import { useCallback, useEffect, useRef, useState } from "react";
export type VoiceOption = {
  id: string;
  name: string;
  lang: string;
  local: boolean;
};
const voiceId = (voice: SpeechSynthesisVoice) =>
  voice.voiceURI || `${voice.name}:${voice.lang}`;
const noveltyVoice =
  /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Hysterical|Jester|Junior|Organ|Ralph|Superstar|Trinoids|Whisper|Wobble|Zarvox)$/i;
const familiarVoiceRank = (name: string) => {
  const preferred = ["Samantha", "Karen", "Daniel", "Moira", "Tessa", "Rishi"];
  const index = preferred.findIndex((n) => name.startsWith(n));
  return index < 0 ? 100 : index;
};
const previewText =
  "Hi. I'm here to help you tell your story, one moment at a time. Take your time. We can go at your pace.";

/** Replies are silent until a person explicitly chooses a previewed browser voice. */
export function useSpokenReplies() {
  const [enabled, setEnabled] = useState(false),
    [supported, setSupported] = useState(false),
    [speaking, setSpeaking] = useState(false),
    [speechError, setSpeechError] = useState(""),
    [voices, setVoices] = useState<VoiceOption[]>([]),
    [selectedVoice, setSelectedVoice] = useState(""),
    [rate, setRate] = useState(1);
  const active = useRef<SpeechSynthesisUtterance | null>(null);
  const enabledRef = useRef(false),
    selectedRef = useRef(""),
    rateRef = useRef(1);
  rateRef.current = rate;
  const stop = useCallback(() => {
    if (active.current) {
      active.current.onend = null;
      active.current.onerror = null;
      active.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis)
      window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);
  useEffect(() => {
    const synth = window.speechSynthesis;
    setSupported(Boolean(synth && window.SpeechSynthesisUtterance));
    const update = () => {
      const all = synth?.getVoices() || [];
      const english = all.filter((v) => v.lang.startsWith("en"));
      setVoices(
        (english.length ? english : all)
          .filter((v) => !noveltyVoice.test(v.name))
          .map((v) => ({
            id: voiceId(v),
            name: v.name,
            lang: v.lang,
            local: v.localService,
          }))
          .sort(
            (a, b) =>
              familiarVoiceRank(a.name) - familiarVoiceRank(b.name) ||
              a.name.localeCompare(b.name),
          ),
      );
    };
    update();
    try {
      const saved = localStorage.getItem("wholestory.voice") || "";
      setSelectedVoice(saved);
      selectedRef.current = saved;
    } catch {}
    synth?.addEventListener?.("voiceschanged", update);
    return () => {
      synth?.removeEventListener?.("voiceschanged", update);
      if (active.current) {
        active.current.onend = null;
        active.current.onerror = null;
      }
      synth?.cancel();
    };
  }, []);
  const play = useCallback(
    (text: string, id: string) => {
      stop();
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        setSpeechError(
          "Spoken replies are unavailable in this browser. Your reply is still shown on screen.",
        );
        return;
      }
      const voice = window.speechSynthesis
        .getVoices()
        .find((v) => voiceId(v) === id);
      if (!voice) {
        setSpeechError(
          "Choose an available voice and use its preview first. We will not switch you to a default voice.",
        );
        return;
      }
      setSpeechError("");
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = rateRef.current;
      const finish = () => {
        if (active.current === utterance) {
          active.current = null;
          setSpeaking(false);
        }
      };
      utterance.onend = finish;
      utterance.onerror = () => {
        if (active.current !== utterance) return;
        finish();
        setSpeechError(
          "This voice could not play. Try another preview or use the text reply.",
        );
      };
      active.current = utterance;
      setSpeaking(true);
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        finish();
        setSpeechError(
          "This voice could not play. Try another preview or use the text reply.",
        );
      }
    },
    [stop],
  );
  const speak = useCallback(
    (text: string, force = false) => {
      if (!enabledRef.current && !force) return;
      if (!selectedRef.current) {
        setSpeechError(
          "Choose your voice from the previews before turning on spoken replies.",
        );
        return;
      }
      play(text, selectedRef.current);
    },
    [play],
  );
  const preview = useCallback((id: string) => play(previewText, id), [play]);
  const chooseVoice = useCallback(
    (id: string) => {
      stop();
      if (!window.speechSynthesis?.getVoices().some((v) => voiceId(v) === id)) {
        setSpeechError(
          "That voice is no longer available. Choose another preview.",
        );
        return;
      }
      selectedRef.current = id;
      enabledRef.current = true;
      setSelectedVoice(id);
      setEnabled(true);
      setSpeechError("");
      try {
        localStorage.setItem("wholestory.voice", id);
      } catch {}
    },
    [stop],
  );
  const toggle = useCallback(
    (value: boolean) => {
      if (
        value &&
        !window.speechSynthesis
          ?.getVoices()
          .some((v) => voiceId(v) === selectedVoice)
      ) {
        setSpeechError("Choose your voice from the previews first.");
        enabledRef.current = false;
        setEnabled(false);
        return;
      }
      enabledRef.current = value;
      setEnabled(value);
      if (!value) stop();
    },
    [selectedVoice, stop],
  );
  return {
    enabled,
    setEnabled: toggle,
    supported,
    speaking,
    speechError,
    speak,
    stop,
    voices,
    selectedVoice,
    chooseVoice,
    preview,
    rate,
    setRate,
  };
}
