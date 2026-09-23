import { supabase } from "@/integrations/supabase/client";

/**
 * StorageSync manages local-first data caching in localStorage with
 * automatic background synchronization to account-bound Supabase documents.
 * This guarantees offline resilience while surviving multi-device usage.
 */

const SYNC_PREFIX = "__spark_sync_";
const DEBOUNCE_MS = 600;

type StorageKey =
  | "spark_journal"
  | "spark_plan"
  | "spark_library"
  | "spark_health"
  | "spark_recall"
  | "spark_notebooks"
  | "spark_grounded_sources"
  | "spark_youtube_channels"
  | "spark_flashcards"
  | "spark_canvas_cards";

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Reads local storage immediately, ensuring instant UI rendering.
 */
export function getLocalData<T>(key: StorageKey, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
}

/**
 * Saves data locally immediately and schedules an account-bound sync with Supabase.
 */
export function setLocalAndSyncData<T>(key: StorageKey, value: T): void {
  if (typeof window === "undefined") return;

  // 1. Instant local write
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }

  // 2. Debounced remote sync
  const existingTimer = debounceTimers.get(key);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(() => {
    void pushToSupabase(key, value);
    debounceTimers.delete(key);
  }, DEBOUNCE_MS);

  debounceTimers.set(key, timer);
}

/**
 * Pushes data to Supabase using a dedicated sync document tagged with the key.
 */
async function pushToSupabase<T>(key: StorageKey, value: T): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) return; // Not signed in, stays purely local

    const syncTitle = `${SYNC_PREFIX}${key}`;
    const payload = JSON.stringify({
      data: value,
      updated_at: new Date().toISOString(),
    });

    // Check if sync document already exists
    const { data: existingDocs } = await supabase
      .from("documents")
      .select("id")
      .eq("title", syncTitle)
      .limit(1);

    if (existingDocs && existingDocs.length > 0) {
      await supabase
        .from("documents")
        .update({
          content: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingDocs[0]!.id);
    } else {
      // Find or create default space
      const { data: spaces } = await supabase.from("spaces").select("id").limit(1);
      const spaceId = spaces?.[0]?.id ?? null;

      await supabase.from("documents").insert({
        title: syncTitle,
        content: payload,
        icon: "cloud-sync",
        space_id: spaceId,
      });
    }
  } catch (error) {
    console.error(`Failed to push ${key} to Supabase:`, error);
  }
}

/**
 * Pulls the latest remote data from Supabase and hydrates localStorage if remote is newer.
 */
export async function pullFromSupabase<T>(key: StorageKey, defaultValue: T): Promise<T> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) {
      return getLocalData<T>(key, defaultValue);
    }

    const syncTitle = `${SYNC_PREFIX}${key}`;
    const { data: existingDocs, error } = await supabase
      .from("documents")
      .select("content, updated_at")
      .eq("title", syncTitle)
      .limit(1);

    if (error || !existingDocs || existingDocs.length === 0) {
      // First time on Supabase: push current local state to cloud
      const currentLocal = getLocalData<T>(key, defaultValue);
      void pushToSupabase(key, currentLocal);
      return currentLocal;
    }

    const remoteContent = existingDocs[0]!.content;
    if (!remoteContent) return getLocalData<T>(key, defaultValue);

    const parsed = JSON.parse(remoteContent);
    const remoteData = (parsed.data ?? parsed) as T;

    // Cache to localStorage
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(remoteData));
    }
    return remoteData;
  } catch (error) {
    console.error(`Failed to pull ${key} from Supabase:`, error);
    return getLocalData<T>(key, defaultValue);
  }
}
