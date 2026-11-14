"use client";
import { useState } from "react";
import { Volume2, Check } from "lucide-react";
import { useSpokenReplies } from "../hooks/use-spoken-replies";
import { Button } from "./ui/button";
export function VoicePicker({
  speech,
  beforePlay,
}: {
  speech: ReturnType<typeof useSpokenReplies>;
  beforePlay: () => void;
}) {
  const [draft, setDraft] = useState("");
  const chosen = draft || speech.selectedVoice;
  const current = speech.voices.find((v) => v.id === speech.selectedVoice);
  return (
    <div className="voice-picker">
      <h3>A voice that feels right to you.</h3>
      <p>
        Preview a few, then choose one. Replies stay muted until you pick. Voice
        quality depends on your browser and installed voices.
      </p>
      {speech.voices.length ? (
        <>
          <div className="voice-preview-grid">
            {speech.voices.slice(0, 3).map((v) => (
              <button
                type="button"
                key={v.id}
                className={
                  chosen === v.id ? "preview-option selected" : "preview-option"
                }
                aria-label={`Preview ${v.name}`}
                onClick={() => {
                  setDraft(v.id);
                  beforePlay();
                  speech.preview(v.id);
                }}
              >
                <Volume2 size={18} />
                <strong>{v.name}</strong>
                <span>{v.lang} · Preview</span>
              </button>
            ))}
          </div>
          <label>
            Voice
            <select
              aria-label="Reply voice"
              value={chosen}
              onChange={(e) => {
                speech.stop();
                setDraft(e.target.value);
              }}
            >
              <option value="">Choose a voice to preview</option>
              {speech.voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.lang}
                  {v.local ? " · on device" : " · browser service"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Pace
            <select
              value={speech.rate}
              onChange={(e) => {
                speech.stop();
                speech.setRate(Number(e.target.value));
              }}
            >
              <option value="0.9">Relaxed</option>
              <option value="1">Natural</option>
              <option value="1.1">A little quicker</option>
            </select>
          </label>
          <div className="toolbar">
            <Button
              disabled={!chosen}
              onClick={() => {
                beforePlay();
                speech.preview(chosen);
              }}
            >
              <Volume2 size={15} /> Preview voice
            </Button>
            <Button
              disabled={!chosen}
              onClick={() => {
                beforePlay();
                speech.chooseVoice(chosen);
              }}
            >
              <Check size={15} /> Use this voice
            </Button>
          </div>
          {current && (
            <p className="voice-selection" role="status">
              Selected: {current.name}.{" "}
              {speech.enabled ? "Spoken replies are on." : "Replies are muted."}
            </p>
          )}
        </>
      ) : (
        <p role="status">
          {speech.supported
            ? "Your browser has not provided any voices yet. If none appear, try Chrome or Safari, or install a system voice."
            : "This browser does not support spoken replies. You can keep using text."}
        </p>
      )}
      <p>
        These are synthetic browser voices. Some may use an external service.
        Only your voice choice is remembered; replies start muted each session.
      </p>
    </div>
  );
}
