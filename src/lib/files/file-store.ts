/**
 * FileStore - Abstraktion für binäre Dateien.
 * 
 * Spark zeigt Binärdateien an, ohne sie selbst zu speichern. Die konkrete
 * Ablage hängt von der Umgebung ab:
 *   - Google Drive (Standard, wenn konfiguriert)
 *   - Supabase Storage (Fallback, wenn kein Drive vorhanden)
 *   - Lokal (Fallback, wenn gar nichts konfiguriert ist)
 * 
 * In allen Fällen liegt in brain_files nur ein Verweis (drive_file_id bzw.
 * storage_path), niemals der Inhalt selbst.
 */

export interface StoredFile {
  /** Stabiler Bezeichner der Datei in der Ablage. */
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  /** Öffentlich oder per Token abrufbar. */
  url: string | null;
}

export interface PutOptions {
  name: string;
  mimeType: string;
  /** Lokaler Dateipfad oder Buffer. */
  source: string | Buffer;
  /** Bestehende ID: dann wird ersetzt statt dupliziert. */
  replaceId?: string | null;
}

export interface FileStore {
  readonly kind: "drive" | "supabase-storage" | "local";
  /** Prüft, ob die Ablage wirklich nutzbar ist. */
  isConfigured(): boolean;
  put(options: PutOptions): Promise<StoredFile>;
  get(id: string): Promise<StoredFile | null>;
  remove(id: string): Promise<void>;
}

/**
 * Fehlt die Konfiguration, wird ein lokaler Stub zurückgegeben.
 * So bleibt die App lauffähig und zeigt Medien als "nicht verfügbar",
 * statt beim Import abzubrechen.
 */
export class UnavailableFileStore implements FileStore {
  readonly kind = "local" as const;

  isConfigured(): boolean {
    return false;
  }

  async put(): Promise<StoredFile> {
    throw new Error("Kein Dateispeicher konfiguriert.");
  }

  async get(): Promise<StoredFile | null> {
    return null;
  }

  async remove(): Promise<void> {
    // nichts zu tun
  }
}
