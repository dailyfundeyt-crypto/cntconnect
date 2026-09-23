import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import {
  ArrowLeft,
  Brain,
  Eye,
  FileText,
  Link2,
  Network,
  Pencil,
  Plus,
  Share2,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createDocument,
  getDocument,
  listDocuments,
  updateDocument,
  type SparkDocument,
} from "@/lib/spark";
import { extractFlashcardsFromText, saveFlashcards, loadFlashcards } from "@/lib/anki-sm2";

export const Route = createFileRoute("/_authenticated/app/doc/$docId")({
  component: DocumentPage,
});

function preprocessWikilinks(text: string, docs: SparkDocument[]) {
  return text.replace(/\[\[(.*?)\]\]/g, (_match, inner: string) => {
    const parts = inner.split("|");
    const targetTitle = parts[0]?.trim() || "";
    const alias = parts[1]?.trim() || targetTitle;
    const found = docs.find((d) => d.title.toLowerCase() === targetTitle.toLowerCase());
    if (found) {
      return `<a href="/app/doc/${found.id}" class="spark-wikilink font-medium text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">[[${alias}]]</a>`;
    }
    return `<span class="spark-wikilink-unresolved font-medium text-muted-foreground/80 border-b border-dashed border-border" title="Seite existiert noch nicht">[[${alias}]]</span>`;
  });
}

function DocumentPage() {
  const { docId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"write" | "read">("write");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const loadedIdRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const docQuery = useQuery({
    queryKey: ["document", docId],
    queryFn: () => getDocument(docId),
  });

  const doc = docQuery.data as SparkDocument | null | undefined;

  const docsQuery = useQuery({
    queryKey: ["documents", doc?.space_id],
    queryFn: () => (doc?.space_id ? listDocuments(doc.space_id) : Promise.resolve([])),
    enabled: !!doc?.space_id,
  });

  const allDocs = docsQuery.data ?? [];

  useEffect(() => {
    if (doc && loadedIdRef.current !== doc.id) {
      loadedIdRef.current = doc.id;
      setTitle(doc.title);
      setContent(doc.content);
    }
  }, [doc]);

  const save = useMutation({
    mutationFn: (patch: Partial<SparkDocument>) => updateDocument(docId, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      void queryClient.invalidateQueries({ queryKey: ["document", docId] });
    },
    onError: () => toast.error("Änderungen konnten nicht gespeichert werden"),
  });

  function queueSave(patch: Partial<SparkDocument>) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save.mutate(patch), 600);
  }

  const addSubpage = useMutation({
    mutationFn: () =>
      createDocument({ spaceId: doc!.space_id!, parentId: doc!.id, title: "Unbenannte Unterseite" }),
    onSuccess: (child) => {
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate({ to: "/app/doc/$docId", params: { docId: child.id } });
    },
  });

  const trash = useMutation({
    mutationFn: () => updateDocument(docId, { is_trashed: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("In den Papierkorb verschoben");
      navigate({ to: "/app" });
    },
  });

  // Backlinks calculation
  const backlinks = useMemo(() => {
    if (!allDocs || !doc) return [];
    const docTitleLower = doc.title.toLowerCase();
    return allDocs.filter(
      (d) =>
        d.id !== doc.id &&
        !d.is_trashed &&
        (d.content.toLowerCase().includes(`[[${docTitleLower}]]`) ||
          d.content.toLowerCase().includes(`[[${docTitleLower}|`))
    );
  }, [allDocs, doc]);

  // Outgoing links
  const outgoingTitles = useMemo(() => {
    const matches = Array.from(content.matchAll(/\[\[(.*?)\]\]/g));
    return matches.map((m) => m[1]?.split("|")[0]?.trim() || "");
  }, [content]);

  // Convert page content into Anki SM-2 Flashcards
  function handleExportToFlashcards() {
    if (!content.trim()) {
      toast.error("Das Dokument ist leer.");
      return;
    }
    const extracted = extractFlashcardsFromText(content, doc?.title || "Spark Dokument");
    if (extracted.length === 0) {
      toast.info("Tipp: Formatiere Absätze mit 'Frage: ... Antwort: ...' für atomare Extraktion.");
    } else {
      const existing = loadFlashcards();
      saveFlashcards([...extracted, ...existing]);
      toast.success(`🎉 ${extracted.length} neue Lernkarten im Recall-Deck gespeichert!`);
    }
  }

  function insertWikilinkPrompt() {
    const target = prompt("Titel der Zielseite für [[Wikilink]]:");
    if (target) {
      const addition = ` [[${target}]] `;
      setContent((prev) => prev + addition);
      queueSave({ content: content + addition });
    }
  }

  const html = useMemo(() => {
    const preprocessed = preprocessWikilinks(content || "*Noch nichts geschrieben.*", allDocs);
    return marked.parse(preprocessed);
  }, [content, allDocs]);

  if (docQuery.isLoading) {
    return <div className="px-8 py-12 text-sm text-muted-foreground">Lade Seite…</div>;
  }

  if (!doc) {
    return <div className="px-8 py-12 text-sm text-muted-foreground">Diese Seite existiert nicht mehr.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-4">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => save.mutate({ is_favorite: !doc.is_favorite })}
          >
            <Star
              className={doc.is_favorite ? "mr-1.5 h-4 w-4 fill-accent text-accent" : "mr-1.5 h-4 w-4"}
            />
            {doc.is_favorite ? "Favorit" : "Zu Favoriten"}
          </Button>

          <Button variant="ghost" size="sm" onClick={() => addSubpage.mutate()}>
            <Plus className="mr-1.5 h-4 w-4" /> Unterseite
          </Button>

          <Button variant="ghost" size="sm" onClick={insertWikilinkPrompt}>
            <Link2 className="mr-1.5 h-4 w-4 text-accent" /> [[Wikilink]]
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/app/graph" })}
            title="Im Wissens-Graph anzeigen"
            className="text-xs gap-1.5"
          >
            <Network className="h-3.5 w-3.5 text-blue-600" /> Graph
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportToFlashcards}
            title="In Spaced Repetition Lernkarten umwandeln"
            className="text-xs gap-1.5"
          >
            <Brain className="h-3.5 w-3.5 text-purple-600" /> In Recall
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            variant={mode === "write" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("write")}
          >
            <Pencil className="mr-1.5 h-4 w-4" /> Schreiben
          </Button>
          <Button
            variant={mode === "read" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("read")}
          >
            <Eye className="mr-1.5 h-4 w-4" /> Lesen
          </Button>
          <Button variant="ghost" size="sm" onClick={() => trash.mutate()}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Title Input */}
      <input
        value={title}
        placeholder="Unbenannt"
        onChange={(event) => {
          setTitle(event.target.value);
          queueSave({ title: event.target.value });
        }}
        className="w-full border-none bg-transparent font-display text-4xl font-bold tracking-tight outline-none placeholder:text-muted-foreground"
      />

      {/* Content Editor / Reader */}
      <div className="min-h-[50vh]">
        {mode === "write" ? (
          <Textarea
            value={content}
            placeholder="Schreibe in Markdown… # Überschrift, - Liste, **fett**, oder [[Anderes Dokument]] verlinken..."
            onChange={(event) => {
              setContent(event.target.value);
              queueSave({ content: event.target.value });
            }}
            className="min-h-[55vh] resize-none border-none bg-transparent px-0 font-sans text-base leading-relaxed shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
          />
        ) : (
          <article
            className="spark-prose prose prose-stone max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: html as string }}
          />
        )}
      </div>

      {/* Obsidian-Style Backlinks & Outgoing Links Panel */}
      <div className="border-t border-border/80 pt-8 mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-accent" />
            <h3 className="font-display font-semibold text-sm text-foreground">
              Verknüpfungen & Backlinks (Obsidian Graph-Netzwerk)
            </h3>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {backlinks.length} eingehend • {outgoingTitles.length} ausgehend
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Incoming Backlinks */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-panel">
            <span className="text-xs font-mono font-medium text-accent uppercase tracking-wider block">
              Eingehende Backlinks ({backlinks.length})
            </span>
            {backlinks.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Noch keine anderen Seiten verlinken auf „{title || "dieses Dokument"}“.
              </p>
            ) : (
              <div className="space-y-1.5">
                {backlinks.map((b) => (
                  <Link
                    key={b.id}
                    to="/app/doc/$docId"
                    params={{ docId: b.id }}
                    className="flex items-center gap-2 rounded-md p-1.5 text-xs text-foreground hover:bg-secondary transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span className="font-medium truncate">{b.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing References */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-panel">
            <span className="text-xs font-mono font-medium text-emerald-700 uppercase tracking-wider block">
              Ausgehende [[Wikilinks]] ({outgoingTitles.length})
            </span>
            {outgoingTitles.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Keine Wikilinks im Text. Nutze <code>[[Dokumentname]]</code> für Querverweise.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {outgoingTitles.map((t, idx) => (
                  <span
                    key={idx}
                    className="rounded bg-secondary px-2 py-1 text-xs font-mono text-foreground border border-border/60"
                  >
                    [[{t}]]
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
