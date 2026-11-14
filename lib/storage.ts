import { openDB } from "idb";
import { Entry, validateEntry } from "./model";
const db = () =>
  openDB("wholestory", 1, {
    upgrade(d) {
      d.createObjectStore("entries", { keyPath: "id" });
    },
  });
export async function loadEntries(): Promise<Entry[]> {
  return (await (await db()).getAll("entries")).map(validateEntry);
}
export async function putEntry(e: Entry) {
  await (await db()).put("entries", validateEntry(e));
}
export async function deleteEntry(id: string) {
  await (await db()).delete("entries", id);
}
export async function clearEntries() {
  await (await db()).clear("entries");
}
export async function importEntries(input: unknown) {
  if (!Array.isArray(input) || input.length > 10000)
    throw Error("Expected an array of up to 10,000 entries.");
  const entries = input.map(validateEntry);
  const d = await db();
  const tx = d.transaction("entries", "readwrite");
  await Promise.all(entries.map((e) => tx.store.put(e)));
  await tx.done;
}
