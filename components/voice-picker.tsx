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
      <h3>Find your voice.</h3>
      <p>
        Natural AI voice previews. Listen first, then choose what feels right.
      </p>
      <div className="voice-preview-grid">
        {speech.voices.map((v) => (
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
            <span>{v.description}</span>
            <small>Listen to preview ↗</small>
          </button>
        ))}
      </div>
      <p>
        Official OpenAI demo recordings. Previews need no API key and send no
        journal text. Live delivery may differ from these samples. These voices
        are AI-generated.
      </p>
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
          <Volume2 size={15} /> Preview again
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
          {speech.enabled
            ? "Live spoken replies are on."
            : "Live replies are muted."}
        </p>
      )}
      <label className="checkbox">
        <input
          type="checkbox"
          checked={speech.consent}
          onChange={(e) => {
            beforePlay();
            speech.setConsent(e.target.checked);
          }}
        />{" "}
        Allow OpenAI to turn the app’s reply text into natural speech. This
        sends reply text to OpenAI, separately from journal extraction.
      </label>
      {speech.configured === false && (
        <div className="voice-setup">
          <strong>Previews are ready. Live replies need setup.</strong>
          <p>
            Set OPENAI_API_KEY on the server and restart or redeploy. Keep the
            key out of chat and frontend code.
          </p>
          <button onClick={() => speech.checkStatus()}>
            Check voice setup again
          </button>
        </div>
      )}
      <p>
        Replies start muted each session. Audio is played in memory and is not
        added to your journal. There is no fallback to system voices.
      </p>
    </div>
  );
}
