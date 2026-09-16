import { supabase } from "@/integrations/supabase/client";

export type Space = {
  id: string;
  name: string;
  icon: string;
  position: number;
  created_at: string;
};

export type FluxDocument = {
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
  return (data ?? []) as FluxDocument[];
}

export async function listTrashedDocuments() {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("is_trashed", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FluxDocument[];
}

export async function getDocument(id: string) {
  const { data, error } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as FluxDocument | null;
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
  return data as FluxDocument;
}

export async function updateDocument(id: string, patch: Partial<FluxDocument>) {
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

/* ---------- collections ---------- */

export async function listCollections(spaceId?: string) {
  let query = supabase.from("collections").select("*").eq("is_trashed", false);
  if (spaceId) query = query.eq("space_id", spaceId);
  const { data, error } = await query.order("position").order("created_at");
  if (error) throw error;
  return (data ?? []) as Collection[];
}

export async function getCollection(id: string) {
  const { data, error } = await supabase.from("collections").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Collection | null;
}

export async function createCollection(spaceId: string, name = "Untitled table") {
  const { data, error } = await supabase
    .from("collections")
    .insert({ space_id: spaceId, name })
    .select()
    .single();
  if (error) throw error;
  const collection = data as Collection;

  const { error: fieldError } = await supabase.from("collection_fields").insert([
    { collection_id: collection.id, name: "Title", type: "text", position: 0 },
    { collection_id: collection.id, name: "Status", type: "select", position: 1, options: { choices: ["Todo", "Doing", "Done"] } },
    { collection_id: collection.id, name: "Done", type: "checkbox", position: 2 },
  ]);
  if (fieldError) throw fieldError;

  const { error: viewError } = await supabase.from("collection_views").insert([
    { collection_id: collection.id, name: "Table", kind: "table", position: 0 },
  ]);
  if (viewError) throw viewError;

  return collection;
}

export async function updateCollection(id: string, patch: Partial<Collection>) {
  const { error } = await supabase.from("collections").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteCollectionForever(id: string) {
  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) throw error;
}

export async function listFields(collectionId: string) {
  const { data, error } = await supabase
    .from("collection_fields")
    .select("*")
    .eq("collection_id", collectionId)
    .order("position");
  if (error) throw error;
  return (data ?? []) as CollectionField[];
}

export async function createField(input: {
  collectionId: string;
  name: string;
  type: FieldType;
  position: number;
  choices?: string[];
}) {
  const { error } = await supabase.from("collection_fields").insert({
    collection_id: input.collectionId,
    name: input.name,
    type: input.type,
    position: input.position,
    options: input.choices ? { choices: input.choices } : {},
  });
  if (error) throw error;
}

export async function updateField(id: string, patch: Partial<CollectionField>) {
  const { error } = await supabase.from("collection_fields").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteField(id: string) {
  const { error } = await supabase.from("collection_fields").delete().eq("id", id);
  if (error) throw error;
}

export async function listRows(collectionId: string) {
  const { data, error } = await supabase
    .from("collection_rows")
    .select("*")
    .eq("collection_id", collectionId)
    .order("position")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as CollectionRow[];
}

export async function createRow(collectionId: string, data: Record<string, unknown> = {}) {
  const { error } = await supabase
    .from("collection_rows")
    .insert({ collection_id: collectionId, data: data as never });
  if (error) throw error;
}

export async function updateRow(id: string, data: Record<string, unknown>) {
  const { error } = await supabase.from("collection_rows").update({ data: data as never }).eq("id", id);
  if (error) throw error;
}

export async function deleteRow(id: string) {
  const { error } = await supabase.from("collection_rows").delete().eq("id", id);
  if (error) throw error;
}

export async function listViews(collectionId: string) {
  const { data, error } = await supabase
    .from("collection_views")
    .select("*")
    .eq("collection_id", collectionId)
    .order("position");
  if (error) throw error;
  return (data ?? []) as CollectionView[];
}

export async function createView(input: {
  collectionId: string;
  name: string;
  kind: ViewKind;
  position: number;
  config?: CollectionView["config"];
}) {
  const { error } = await supabase.from("collection_views").insert({
    collection_id: input.collectionId,
    name: input.name,
    kind: input.kind,
    position: input.position,
    config: input.config ?? {},
  });
  if (error) throw error;
}

export async function updateView(id: string, patch: Partial<CollectionView>) {
  const { error } = await supabase.from("collection_views").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteView(id: string) {
  const { error } = await supabase.from("collection_views").delete().eq("id", id);
  if (error) throw error;
}
