import { supabase } from "@/integrations/supabase/client";

export type Space = {
  id: string;
  name: string;
  icon: string;
  position: number;
  created_at: string;
};

export type SparkDocument = {
  id: string;
  space_id: string | null;
  parent_id: string | null;
  title: string;
  icon: string;
  content: string;
  is_favorite: boolean;
  is_trashed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export type FieldType = "text" | "number" | "checkbox" | "select" | "date" | "url";

export type CollectionField = {
  id: string;
  collection_id: string;
  name: string;
  type: FieldType;
  options: { choices?: string[] };
  position: number;
};

export type CollectionRow = {
  id: string;
  collection_id: string;
  data: Record<string, unknown>;
  position: number;
  created_at: string;
  updated_at: string;
};

export type ViewKind = "table" | "gallery" | "kanban";

export type CollectionView = {
  id: string;
  collection_id: string;
  name: string;
  kind: ViewKind;
  config: { groupFieldId?: string; titleFieldId?: string };
  position: number;
};

export type Collection = {
  id: string;
  space_id: string | null;
  name: string;
  icon: string;
  is_trashed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

/* ---------- spaces ---------- */

export async function listSpaces() {
  const { data, error } = await supabase
    .from("spaces")
    .select("*")
    .order("position")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as Space[];
}

export async function ensureDefaultSpace() {
  const spaces = await listSpaces();
  if (spaces.length > 0) return spaces[0]!;
  const { data, error } = await supabase
    .from("spaces")
    .insert({ name: "My Space" })
    .select()
    .single();
  if (error) throw error;
  return data as Space;
}

export async function createSpace(name: string) {
  const { data, error } = await supabase.from("spaces").insert({ name }).select().single();
  if (error) throw error;
  return data as Space;
}

export async function renameSpace(id: string, name: string) {
  const { error } = await supabase.from("spaces").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteSpace(id: string) {
  const { error } = await supabase.from("spaces").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- documents ---------- */

export async function listDocuments(spaceId?: string) {
  let query = supabase.from("documents").select("*").eq("is_trashed", false);
  if (spaceId) query = query.eq("space_id", spaceId);
  const { data, error } = await query.order("position").order("created_at");
  if (error) throw error;
  return (data ?? []) as SparkDocument[];
}

export async function listTrashedDocuments() {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("is_trashed", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SparkDocument[];
}

export async function getDocument(id: string) {
  const { data, error } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as SparkDocument | null;
}

export async function createDocument(input: {
  spaceId: string;
  parentId?: string | null;
  title?: string;
  content?: string;
}) {
  const { data, error } = await supabase
    .from("documents")
    .insert({
      space_id: input.spaceId,
      parent_id: input.parentId ?? null,
      title: input.title ?? "Untitled",
      content: input.content ?? "",
    })
    .select()
    .single();
  if (error) throw error;
  return data as SparkDocument;
}

export async function updateDocument(id: string, patch: Partial<SparkDocument>) {
  const { error } = await supabase.from("documents").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteDocumentForever(id: string) {
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
}

export async function searchAll(term: string) {
  const like = `%${term}%`;
  const [docs, cols] = await Promise.all([
    supabase
      .from("documents")
      .select("id,title,icon,content,updated_at")
      .eq("is_trashed", false)
      .or(`title.ilike.${like},content.ilike.${like}`)
      .limit(12),
    supabase
      .from("collections")
      .select("id,name,icon,updated_at")
      .eq("is_trashed", false)
      .ilike("name", like)
      .limit(12),
  ]);
  if (docs.error) throw docs.error;
  if (cols.error) throw cols.error;
  return {
    documents: docs.data ?? [],
    collections: cols.data ?? [],
  };
}

/* ---------- local table storage fallback ---------- */

const LOCAL_TABLES_KEY = "spark_local_tables";

interface LocalTableStore {
  collections: Record<string, Collection>;
  fields: Record<string, CollectionField[]>;
  rows: Record<string, CollectionRow[]>;
  views: Record<string, CollectionView[]>;
}

function getLocalTableStore(): LocalTableStore {
  if (typeof window === "undefined") {
    return { collections: {}, fields: {}, rows: {}, views: {} };
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_TABLES_KEY);
    return raw ? JSON.parse(raw) : { collections: {}, fields: {}, rows: {}, views: {} };
  } catch {
    return { collections: {}, fields: {}, rows: {}, views: {} };
  }
}

function saveLocalTableStore(store: LocalTableStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_TABLES_KEY, JSON.stringify(store));
  } catch (e) {
    console.error("Failed to save local table store", e);
  }
}

/* ---------- collections ---------- */

export async function listCollections(spaceId?: string): Promise<Collection[]> {
  try {
    let query = supabase.from("collections").select("*").eq("is_trashed", false);
    if (spaceId) query = query.eq("space_id", spaceId);
    const { data, error } = await query.order("position").order("created_at");
    if (error) throw error;
    const cols = (data ?? []) as Collection[];

    // Sync to local store
    const store = getLocalTableStore();
    cols.forEach((c) => {
      store.collections[c.id] = c;
    });
    saveLocalTableStore(store);
    return cols;
  } catch (err) {
    const store = getLocalTableStore();
    return Object.values(store.collections).filter(
      (c) => !c.is_trashed && (!spaceId || c.space_id === spaceId)
    );
  }
}

export async function getCollection(id: string): Promise<Collection | null> {
  try {
    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      const store = getLocalTableStore();
      store.collections[data.id] = data as Collection;
      saveLocalTableStore(store);
      return data as Collection;
    }
  } catch {
    // fallback
  }
  const store = getLocalTableStore();
  return store.collections[id] ?? null;
}

export async function createCollection(spaceId: string, name = "Untitled table"): Promise<Collection> {
  const newId = crypto.randomUUID();
  const now = new Date().toISOString();
  const localCol: Collection = {
    id: newId,
    space_id: spaceId,
    name,
    icon: "table",
    is_trashed: false,
    position: 0,
    created_at: now,
    updated_at: now,
  };

  const defaultFields: CollectionField[] = [
    { id: crypto.randomUUID(), collection_id: newId, name: "Titel", type: "text", position: 0, options: {} },
    { id: crypto.randomUUID(), collection_id: newId, name: "Status", type: "select", position: 1, options: { choices: ["Offen", "In Arbeit", "Erledigt"] } },
    { id: crypto.randomUUID(), collection_id: newId, name: "Fälligkeit", type: "date", position: 2, options: {} },
    { id: crypto.randomUUID(), collection_id: newId, name: "Erledigt", type: "checkbox", position: 3, options: {} },
  ];

  const defaultViews: CollectionView[] = [
    { id: crypto.randomUUID(), collection_id: newId, name: "Tabelle", kind: "table", position: 0, config: {} },
  ];

  const store = getLocalTableStore();
  store.collections[newId] = localCol;
  store.fields[newId] = defaultFields;
  store.views[newId] = defaultViews;
  store.rows[newId] = [
    {
      id: crypto.randomUUID(),
      collection_id: newId,
      position: 0,
      created_at: now,
      updated_at: now,
      data: {
        [defaultFields[0]!.id]: "Erste Aufgabe",
        [defaultFields[1]!.id]: "In Arbeit",
        [defaultFields[2]!.id]: new Date().toISOString().split("T")[0],
        [defaultFields[3]!.id]: false,
      },
    },
  ];
  saveLocalTableStore(store);

  try {
    const { data, error } = await supabase
      .from("collections")
      .insert({ space_id: spaceId, name })
      .select()
      .single();
    if (!error && data) {
      const col = data as Collection;
      await supabase.from("collection_fields").insert(
        defaultFields.map((f, i) => ({
          collection_id: col.id,
          name: f.name,
          type: f.type,
          position: i,
          options: f.options,
        }))
      );
      await supabase.from("collection_views").insert([
        { collection_id: col.id, name: "Tabelle", kind: "table", position: 0 },
      ]);
      return col;
    }
  } catch (err) {
    console.warn("Using local collection creation", err);
  }

  return localCol;
}

export async function updateCollection(id: string, patch: Partial<Collection>): Promise<void> {
  const store = getLocalTableStore();
  if (store.collections[id]) {
    store.collections[id] = { ...store.collections[id]!, ...patch, updated_at: new Date().toISOString() };
    saveLocalTableStore(store);
  }
  try {
    await supabase.from("collections").update(patch).eq("id", id);
  } catch {
    // local fallback already saved
  }
}

export async function deleteCollectionForever(id: string): Promise<void> {
  const store = getLocalTableStore();
  delete store.collections[id];
  delete store.fields[id];
  delete store.rows[id];
  delete store.views[id];
  saveLocalTableStore(store);

  try {
    await supabase.from("collections").delete().eq("id", id);
  } catch {
    // ignore
  }
}

export async function listFields(collectionId: string): Promise<CollectionField[]> {
  try {
    const { data, error } = await supabase
      .from("collection_fields")
      .select("*")
      .eq("collection_id", collectionId)
      .order("position");
    if (!error && data && data.length > 0) {
      const fields = data as CollectionField[];
      const store = getLocalTableStore();
      store.fields[collectionId] = fields;
      saveLocalTableStore(store);
      return fields;
    }
  } catch {
    // fallback
  }

  const store = getLocalTableStore();
  const existing = store.fields[collectionId];
  if (existing && existing.length > 0) return existing;

  // Defaults if completely empty
  const defaults: CollectionField[] = [
    { id: crypto.randomUUID(), collection_id: collectionId, name: "Titel", type: "text", position: 0, options: {} },
    { id: crypto.randomUUID(), collection_id: collectionId, name: "Status", type: "select", position: 1, options: { choices: ["Offen", "In Arbeit", "Erledigt"] } },
    { id: crypto.randomUUID(), collection_id: collectionId, name: "Datum", type: "date", position: 2, options: {} },
    { id: crypto.randomUUID(), collection_id: collectionId, name: "Erledigt", type: "checkbox", position: 3, options: {} },
  ];
  store.fields[collectionId] = defaults;
  saveLocalTableStore(store);
  return defaults;
}

export async function createField(input: {
  collectionId: string;
  name: string;
  type: FieldType;
  position: number;
  choices?: string[] | undefined;
}): Promise<CollectionField> {
  const newField: CollectionField = {
    id: crypto.randomUUID(),
    collection_id: input.collectionId,
    name: input.name,
    type: input.type,
    position: input.position,
    options: input.choices ? { choices: input.choices } : {},
  };

  const store = getLocalTableStore();
  const list = store.fields[input.collectionId] ?? [];
  store.fields[input.collectionId] = [...list, newField];
  saveLocalTableStore(store);

  try {
    const { data, error } = await supabase
      .from("collection_fields")
      .insert({
        collection_id: input.collectionId,
        name: input.name,
        type: input.type,
        position: input.position,
        options: newField.options,
      })
      .select()
      .single();
    if (!error && data) return data as CollectionField;
  } catch {
    // fallback
  }

  return newField;
}

export async function updateField(id: string, patch: Partial<CollectionField>): Promise<void> {
  const store = getLocalTableStore();
  for (const colId of Object.keys(store.fields)) {
    const list = store.fields[colId] ?? [];
    const idx = list.findIndex((f) => f.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx]!, ...patch };
      store.fields[colId] = list;
      saveLocalTableStore(store);
      break;
    }
  }

  try {
    await supabase.from("collection_fields").update(patch).eq("id", id);
  } catch {
    // fallback
  }
}

export async function deleteField(id: string): Promise<void> {
  const store = getLocalTableStore();
  for (const colId of Object.keys(store.fields)) {
    store.fields[colId] = (store.fields[colId] ?? []).filter((f) => f.id !== id);
  }
  saveLocalTableStore(store);

  try {
    await supabase.from("collection_fields").delete().eq("id", id);
  } catch {
    // fallback
  }
}

export async function listRows(collectionId: string): Promise<CollectionRow[]> {
  try {
    const { data, error } = await supabase
      .from("collection_rows")
      .select("*")
      .eq("collection_id", collectionId)
      .order("position")
      .order("created_at");
    if (!error && data) {
      const rows = data as CollectionRow[];
      const store = getLocalTableStore();
      store.rows[collectionId] = rows;
      saveLocalTableStore(store);
      return rows;
    }
  } catch {
    // fallback
  }

  const store = getLocalTableStore();
  return store.rows[collectionId] ?? [];
}

export async function createRow(collectionId: string, data: Record<string, unknown> = {}): Promise<CollectionRow> {
  const now = new Date().toISOString();
  const newRow: CollectionRow = {
    id: crypto.randomUUID(),
    collection_id: collectionId,
    data,
    position: Date.now(),
    created_at: now,
    updated_at: now,
  };

  const store = getLocalTableStore();
  const list = store.rows[collectionId] ?? [];
  store.rows[collectionId] = [...list, newRow];
  saveLocalTableStore(store);

  try {
    const { data: dbData, error } = await supabase
      .from("collection_rows")
      .insert({ collection_id: collectionId, data: data as never })
      .select()
      .single();
    if (!error && dbData) return dbData as CollectionRow;
  } catch {
    // fallback
  }

  return newRow;
}

export async function updateRow(id: string, data: Record<string, unknown>): Promise<void> {
  const store = getLocalTableStore();
  for (const colId of Object.keys(store.rows)) {
    const list = store.rows[colId] ?? [];
    const idx = list.findIndex((r) => r.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx]!, data, updated_at: new Date().toISOString() };
      store.rows[colId] = list;
      saveLocalTableStore(store);
      break;
    }
  }

  try {
    await supabase.from("collection_rows").update({ data: data as never }).eq("id", id);
  } catch {
    // fallback
  }
}

export async function deleteRow(id: string): Promise<void> {
  const store = getLocalTableStore();
  for (const colId of Object.keys(store.rows)) {
    store.rows[colId] = (store.rows[colId] ?? []).filter((r) => r.id !== id);
  }
  saveLocalTableStore(store);

  try {
    await supabase.from("collection_rows").delete().eq("id", id);
  } catch {
    // fallback
  }
}

export async function listViews(collectionId: string): Promise<CollectionView[]> {
  try {
    const { data, error } = await supabase
      .from("collection_views")
      .select("*")
      .eq("collection_id", collectionId)
      .order("position");
    if (!error && data && data.length > 0) {
      const views = data as CollectionView[];
      const store = getLocalTableStore();
      store.views[collectionId] = views;
      saveLocalTableStore(store);
      return views;
    }
  } catch {
    // fallback
  }

  const store = getLocalTableStore();
  const existing = store.views[collectionId];
  if (existing && existing.length > 0) return existing;

  const defaultView: CollectionView = {
    id: crypto.randomUUID(),
    collection_id: collectionId,
    name: "Tabelle",
    kind: "table",
    position: 0,
    config: {},
  };
  store.views[collectionId] = [defaultView];
  saveLocalTableStore(store);
  return [defaultView];
}

export async function createView(input: {
  collectionId: string;
  name: string;
  kind: ViewKind;
  position: number;
  config?: CollectionView["config"];
}): Promise<CollectionView> {
  const newView: CollectionView = {
    id: crypto.randomUUID(),
    collection_id: input.collectionId,
    name: input.name,
    kind: input.kind,
    position: input.position,
    config: input.config ?? {},
  };

  const store = getLocalTableStore();
  const list = store.views[input.collectionId] ?? [];
  store.views[input.collectionId] = [...list, newView];
  saveLocalTableStore(store);

  try {
    await supabase.from("collection_views").insert({
      collection_id: input.collectionId,
      name: input.name,
      kind: input.kind,
      position: input.position,
      config: input.config ?? {},
    });
  } catch {
    // fallback
  }

  return newView;
}

export async function updateView(id: string, patch: Partial<CollectionView>): Promise<void> {
  const store = getLocalTableStore();
  for (const colId of Object.keys(store.views)) {
    const list = store.views[colId] ?? [];
    const idx = list.findIndex((v) => v.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx]!, ...patch };
      store.views[colId] = list;
      saveLocalTableStore(store);
      break;
    }
  }

  try {
    await supabase.from("collection_views").update(patch).eq("id", id);
  } catch {
    // fallback
  }
}

export async function deleteView(id: string): Promise<void> {
  const store = getLocalTableStore();
  for (const colId of Object.keys(store.views)) {
    store.views[colId] = (store.views[colId] ?? []).filter((v) => v.id !== id);
  }
  saveLocalTableStore(store);

  try {
    await supabase.from("collection_views").delete().eq("id", id);
  } catch {
    // fallback
  }
}

