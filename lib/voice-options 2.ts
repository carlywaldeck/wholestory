export const naturalVoices = [
  {
    id: "coral",
    name: "Coral",
    description: "Warm & conversational",
    sample: "https://cdn.openai.com/API/docs/audio/coral.wav",
  },
  {
    id: "sage",
    name: "Sage",
    description: "Calm & grounded",
    sample: "https://cdn.openai.com/API/docs/audio/sage.wav",
  },
  {
    id: "alloy",
    name: "Alloy",
    description: "Clear & balanced",
    sample: "https://cdn.openai.com/API/docs/audio/alloy.wav",
  },
] as const;
export type NaturalVoice = (typeof naturalVoices)[number]["id"];
