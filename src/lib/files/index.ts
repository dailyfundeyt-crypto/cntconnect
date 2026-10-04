/**
 * FileStore-Fabrik.
 * 
 * Reihenfolge: Google Drive, dann Supabase Storage, dann nicht verfügbar.
 * Der Store wird pro Anfrage gebaut, weil Supabase Storage den
 * OAuth-Token des angemeldeten Nutzers braucht.
 */

import { GoogleDriveFileStore } from "./drive-store";
import { SupabaseStorageFileStore } from "./supabase-store";
import { UnavailableFileStore, type FileStore } from "./file-store";

export type { FileStore, StoredFile, PutOptions } from "./file-store";
export { UnavailableFileStore } from "./file-store";

/**
 * Wählt den Dateispeicher für einen angemeldeten Nutzer.
 * 
 * @param accessToken OAuth-Token des Nutzers, für Supabase Storage nötig.
 */
export function getFileStore(accessToken?: string | null): FileStore {
  const drive = new GoogleDriveFileStore();
  if (drive.isConfigured()) return drive;

  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

  if (url && key && accessToken) {
    const storage = new SupabaseStorageFileStore(url, key, accessToken);
    if (storage.isConfigured()) return storage;
  }

  return new UnavailableFileStore();
}
