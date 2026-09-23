/**
 * Google Calendar API helper with OAuth 2.0 token flow.
 * Strict security rule: No silent writes! User confirmation is mandatory.
 */

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  htmlLink?: string;
}

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const LOCAL_STORAGE_TOKEN_KEY = "spark_gcal_token";
const LOCAL_STORAGE_TOKEN_EXPIRY = "spark_gcal_token_expiry";

export function getStoredCalendarToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
  const expiry = window.localStorage.getItem(LOCAL_STORAGE_TOKEN_EXPIRY);
  if (!token || !expiry) return null;
  if (Date.now() > Number(expiry)) {
    window.localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
    window.localStorage.removeItem(LOCAL_STORAGE_TOKEN_EXPIRY);
    return null;
  }
  return token;
}

export function saveCalendarToken(token: string, expiresInSeconds = 3600): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, token);
  window.localStorage.setItem(
    LOCAL_STORAGE_TOKEN_EXPIRY,
    (Date.now() + expiresInSeconds * 1000).toString()
  );
}

export function clearCalendarToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
  window.localStorage.removeItem(LOCAL_STORAGE_TOKEN_EXPIRY);
}

/**
 * Initiates Google OAuth popup to obtain an access token for Calendar
 */
export function requestGoogleCalendarAuth(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Browser environment required for Google OAuth."));
      return;
    }

    const redirectUri = window.location.origin;
    // Load GIS script if not present
    if (!window.google?.accounts?.oauth2) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setupTokenClient();
      };
      script.onerror = () => reject(new Error("Konnte Google Auth Skript nicht laden."));
      document.body.appendChild(script);
    } else {
      setupTokenClient();
    }

    function setupTokenClient() {
      try {
        if (!window.google?.accounts?.oauth2) {
          reject(new Error("Google Identity Services nicht verfügbar."));
          return;
        }
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: `${GOOGLE_CALENDAR_SCOPE} https://www.googleapis.com/auth/calendar.readonly`,
          callback: (response: { access_token?: string; error?: string; expires_in?: number }) => {
            if (response.error || !response.access_token) {
              reject(new Error(response.error ?? "Google Auth abgebrochen oder fehlgeschlagen."));
              return;
            }
            saveCalendarToken(response.access_token, response.expires_in ?? 3600);
            resolve(response.access_token);
          },
        });
        client.requestAccessToken({ prompt: "consent" });
      } catch (err) {
        reject(err);
      }
    }
  });
}

/**
 * Reads events for today from Google Calendar
 */
export async function getTodayCalendarEvents(token: string): Promise<GoogleCalendarEvent[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", startOfDay.toISOString());
  url.searchParams.set("timeMax", endOfDay.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearCalendarToken();
      throw new Error("Google Token ist abgelaufen. Bitte erneut verbinden.");
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message ?? "Fehler beim Laden der Google Kalender Events.");
  }

  const data = await response.json();
  return (data.items ?? []).map((item: any) => ({
    id: item.id,
    summary: item.summary || "Ohne Titel",
    description: item.description,
    start: item.start,
    end: item.end,
    htmlLink: item.htmlLink,
  }));
}

/**
 * Creates an event in Google Calendar.
 * Requires explicit confirmed=true flag (no silent writes!).
 */
export async function createCalendarEvent(
  token: string,
  event: Omit<GoogleCalendarEvent, "id">,
  confirmed: boolean
): Promise<GoogleCalendarEvent> {
  if (!confirmed) {
    throw new Error("Schreiben abgebrochen: Benutzer-Bestätigung zwingend erforderlich.");
  }

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      clearCalendarToken();
      throw new Error("Google Token ist abgelaufen. Bitte erneut verbinden.");
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message ?? "Fehler beim Erstellen des Kalendereintrags.");
  }

  return response.json();
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => {
            requestAccessToken: (options?: any) => void;
          };
        };
      };
    };
  }
}
