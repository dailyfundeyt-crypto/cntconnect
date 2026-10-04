/**
 * Supabase-Storage-FileStore (Fallback).
 * 
 * Greift, wenn Google Drive nicht konfiguriert ist. Nutzt den Bucket
 * "brain-media" und läuft mit dem Publishable Key des angemeldeten Nutzers,
 * sodass die RLS-Policies des Users greifen.
 */

import { createClient } from "@supabase/supabase-js";
import type { FileStore, PutOptions, StoredFile } from "./file-store";

const BUCKET = "brain-media";

export class SupabaseStorageFileStore implements FileStore {
  readonly kind = "supabase-storage" as const;

  constructor(
    private url: string,
    private anonKey: string,
    private accessToken: string,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.url && this.anonKey && this.accessToken);
  }

  private client() {
    return createClient(this.url, this.anonKey, {
      global: { headers: { Authorization: `Bearer ${this.accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async put(options: PutOptions): Promise<StoredFile> {
    const supabase = this.client();
    const body =
      typeof options.source === "string" ? await readFile(options.source) : options.source;

    // Storage-Pfad muss eindeutig sein, sonst überschreiben sich Dateien.
    const storagePath = `brain/${options.replaceId ?? crypto.randomUUID()}/${sanitize(options.name)}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, body, { contentType: options.mimeType, upsert: true });

    if (error) throw new Error(`Supabase-Upload fehlgeschlagen: ${error.message}`);

    return {
      id: storagePath,
      name: options.name,
      mimeType: options.mimeType,
      sizeBytes: body.byteLength,
      url: null,
    };
  }

  async get(id: string): Promise<StoredFile | null> {
    const supabase = this.client();
    const { data, error } = await supabase.storage.from(BUCKET).download(id);
    if (error || !data) return null;

    return {
      id,
      name: id.slice(id.lastIndexOf("/") + 1),
      mimeType: data.type || "application/octet-stream",
      sizeBytes: data.size,
      url: null,
    };
  }

  async remove(id: string): Promise<void> {
    const supabase = this.client();
    const { error } = await supabase.storage.from(BUCKET).remove([id]);
    if (error) throw new Error(`Supabase-Löschen fehlgeschlagen: ${error.message}`);
  }
}

async function readFile(filePath: string): Promise<Buffer> {
  const fs = await import("node:fs/promises");
  return fs.readFile(filePath);
}

/** Entfernt Zeichen, die in Storage-Pfaden Probleme machen. */
function sanitize(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_");
}
