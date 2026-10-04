/**
 * Google Drive FileStore.
 * 
 * Nutzt die Drive REST API v3 direkt über fetch, ohne googleapis-Bibliothek.
 * Authentifiziert per Service Account (JWT -> OAuth-Token), weil der Import
 * serverseitig und ohne Browser-Interaktion laufen muss.
 * 
 * Konfiguration (Server-Env, nie im Frontend):
 *   GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON  komplettes Service-Account-JSON
 *   GOOGLE_DRIVE_ROOT_FOLDER_ID        Zielordner in Drive (optional)
 * 
 * Ohne diese Variablen meldet isConfigured() false und Spark nutzt den Fallback.
 */

import { promises as fs } from "node:fs";
import { createPrivateKey, createSign, randomUUID } from "node:crypto";
import type { FileStore, PutOptions, StoredFile } from "./file-store";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const TOKEN_URI = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/drive.file";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Liest das Service-Account-JSON aus Env oder Datei. */
function loadServiceAccount(): ServiceAccount | null {
  const inline = process.env["GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON"]?.trim();
  if (inline) {
    try {
      const parsed = JSON.parse(inline) as ServiceAccount;
      if (parsed.client_email && parsed.private_key) return parsed;
    } catch {
      return null;
    }
  }

  const path = process.env["GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE"]?.trim();
  if (path) {
    try {
      const raw = require("node:fs").readFileSync(path, "utf8") as string;
      const parsed = JSON.parse(raw) as ServiceAccount;
      if (parsed.client_email && parsed.private_key) return parsed;
    } catch {
      return null;
    }
  }

  return null;
}

export class GoogleDriveFileStore implements FileStore {
  readonly kind = "drive" as const;

  private account: ServiceAccount | null;
  private rootFolderId: string | undefined;
  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor() {
    this.account = loadServiceAccount();
    this.rootFolderId = process.env["GOOGLE_DRIVE_ROOT_FOLDER_ID"]?.trim() || undefined;
  }

  isConfigured(): boolean {
    return this.account !== null;
  }

  /**
   * Baut ein signiertes JWT und tauscht es gegen ein Access-Token.
   * Das JWT wird direkt als assertion verwendet, der Service-Account
   * braucht also keinen dreistufigen OAuth-Dialog.
   */
  private async accessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60_000) {
      return this.cachedToken.value;
    }

    const account = this.account;
    if (!account) throw new Error("Google Drive ist nicht konfiguriert.");

    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = base64url(
      JSON.stringify({
        iss: account.client_email,
        scope: SCOPE,
        aud: TOKEN_URI,
        iat: now,
        exp: now + 3600,
      }),
    );

    const signature = base64url(
      createSign("RSA-SHA256")
        .update(`${header}.${claims}`)
        .sign(createPrivateKey(account.private_key)),
    );

    const res = await fetch(TOKEN_URI, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${header}.${claims}.${signature}`,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Drive-Token fehlgeschlagen (${res.status}): ${text.slice(0, 300)}`);
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return data.access_token;
  }

  async put(options: PutOptions): Promise<StoredFile> {
    const token = await this.accessToken();

    // Metadaten und Inhalt getrennt hochladen (resumable wäre bei 100 MB
    // sinnvoller, aber Drive-Ordner hier bleiben unter der Grenze).
    const body =
      typeof options.source === "string"
        ? await fs.readFile(options.source)
        : options.source;

    // Bei Ersatzupload: vorhandene Datei löschen, sonst entstehen Duplikate.
    if (options.replaceId) {
      await this.remove(options.replaceId).catch(() => undefined);
    }

    const boundary = `brain-${randomUUID()}`;
    const metadata: Record<string, unknown> = { name: options.name, mimeType: options.mimeType };
    if (this.rootFolderId) {
      metadata["parents"] = [this.rootFolderId];
    }

    const multipart = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      ),
      Buffer.from(`--${boundary}\r\nContent-Type: ${options.mimeType}\r\n\r\n`),
      body,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,size`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipart,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Drive-Upload fehlgeschlagen (${res.status}): ${text.slice(0, 300)}`);
    }

    const file = (await res.json()) as { id: string; name: string; mimeType: string; size?: string };
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      sizeBytes: file.size ? Number.parseInt(file.size, 10) : body.byteLength,
      // Kein öffentlicher Link: die App lädt über den Server, damit RLS greift.
      url: null,
    };
  }

  async get(id: string): Promise<StoredFile | null> {
    const token = await this.accessToken();
    const meta = await fetch(`${DRIVE_API}/files/${id}?fields=id,name,mimeType,size`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (meta.status === 404) return null;
    if (!meta.ok) throw new Error(`Drive-Metadaten fehlgeschlagen (${meta.status})`);

    const file = (await meta.json()) as { id: string; name: string; mimeType: string; size?: string };
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      sizeBytes: file.size ? Number.parseInt(file.size, 10) : 0,
      url: null,
    };
  }

  async remove(id: string): Promise<void> {
    const token = await this.accessToken();
    const res = await fetch(`${DRIVE_API}/files/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Drive-Löschen fehlgeschlagen (${res.status})`);
    }
  }
}

/**
 * Lädt Dateien für eine direkte Browser-Auslieferung.
 * Route-handler, weil der Token nicht im Client liegen darf.
 */
export async function downloadFromDrive(fileId: string): Promise<{ body: ArrayBuffer; mimeType: string; name: string }> {
  const store = new GoogleDriveFileStore();
  if (!store.isConfigured()) throw new Error("Google Drive ist nicht konfiguriert.");

  const token = await (
    store as unknown as { accessToken(): Promise<string> }
  ).accessToken();

  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive-Download fehlgeschlagen (${res.status})`);

  return {
    body: await res.arrayBuffer(),
    mimeType: res.headers.get("content-type") ?? "application/octet-stream",
    name: res.headers.get("content-disposition")?.match(/filename="?([^";]+)"?/)?.[1] ?? fileId,
  };
}
