import { openDB } from "idb";
import { z } from "zod";
export const preferencesSchema = z
  .object({
    name: z.string().trim().max(60),
    inputMode: z.enum(["write", "voice"]),
    setupComplete: z.boolean(),
  })
  .strict();
export type Preferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences: Preferences = {
  name: "",
  inputMode: "write",
  setupComplete: false,
};
const db = () =>
  openDB("wholestory-preferences", 1, {
    upgrade(d) {
      d.createObjectStore("preferences");
    },
  });
export async function loadPreferences(): Promise<Preferences> {
  const d = await db();
  try {
    const value = await d.get("preferences", "profile");
    return value ? preferencesSchema.parse(value) : defaultPreferences;
  } finally {
    d.close();
  }
}
export async function savePreferences(value: Preferences) {
  const d = await db();
  try {
    await d.put("preferences", preferencesSchema.parse(value), "profile");
  } finally {
    d.close();
  }
}
export async function clearPreferences() {
  const d = await db();
  try {
    await d.clear("preferences");
  } finally {
    d.close();
  }
}
