import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { Eye, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createDocument,
  getDocument,
  updateDocument,
  type SparkDocument,
} from "@/lib/spark";

export const Route = createFileRoute("/_authenticated/app/doc/$docId")({
  component: DocumentPage,
});

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
    onError: () => toast.error("Changes could not be saved"),
  });

  function queueSave(patch: Partial<SparkDocument>) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save.mutate(patch), 600);
  }

  const addSubpage = useMutation({
    mutationFn: () =>
      createDocument({ spaceId: doc!.space_id!, parentId: doc!.id, title: "Untitled" }),
    onSuccess: (child) => {
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate({ to: "/app/doc/$docId", params: { docId: child.id } });
    },
  });

  const trash = useMutation({
    mutationFn: () => updateDocument(docId, { is_trashed: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Moved to trash");
      navigate({ to: "/app" });
    },
  });

  const html = useMemo(() => marked.parse(content || "*Nothing written yet.*"), [content]);

  if (docQuery.isLoading) {
    return <div className="px-8 py-12 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!doc) {
    return <div className="px-8 py-12 text-sm text-muted-foreground">This page no longer exists.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => save.mutate({ is_favorite: !doc.is_favorite })}
        >
          <Star
            className={doc.is_favorite ? "mr-2 h-4 w-4 fill-accent text-accent" : "mr-2 h-4 w-4"}
          />
          {doc.is_favorite ? "Favourite" : "Add to favourites"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => addSubpage.mutate()}>
          <Plus className="mr-2 h-4 w-4" /> Subpage
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant={mode === "write" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("write")}
          >
            <Pencil className="mr-2 h-4 w-4" /> Write
          </Button>
          <Button
            variant={mode === "read" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("read")}
          >
            <Eye className="mr-2 h-4 w-4" /> Read
          </Button>
          <Button variant="ghost" size="sm" onClick={() => trash.mutate()}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <input
        value={title}
        placeholder="Untitled"
        onChange={(event) => {
          setTitle(event.target.value);
          queueSave({ title: event.target.value });
        }}
        className="w-full border-none bg-transparent font-display text-4xl font-bold tracking-tight outline-none placeholder:text-muted-foreground"
      />

      <div className="mt-8">
        {mode === "write" ? (
          <Textarea
            value={content}
            placeholder="Write in Markdown… # Heading, - list, **bold**"
            onChange={(event) => {
              setContent(event.target.value);
              queueSave({ content: event.target.value });
            }}
            className="min-h-[60vh] resize-none border-none bg-transparent px-0 font-sans text-base leading-relaxed shadow-none focus-visible:ring-0"
          />
        ) : (
          <article className="spark-prose" dangerouslySetInnerHTML={{ __html: html as string }} />
        )}
      </div>
    </div>
  );
}
