import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createCollection,
  createDocument,
  ensureDefaultSpace,
  listCollections,
  listDocuments,
} from "@/lib/flux";

export const Route = createFileRoute("/_authenticated/app/")({
  component: WorkspaceHome,
});

function WorkspaceHome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const spaceQuery = useQuery({ queryKey: ["default-space"], queryFn: ensureDefaultSpace });
  const spaceId = spaceQuery.data?.id;

  const docsQuery = useQuery({
    queryKey: ["documents", spaceId],
    queryFn: () => listDocuments(spaceId!),
    enabled: !!spaceId,
  });
  const collectionsQuery = useQuery({
    queryKey: ["collections", spaceId],
    queryFn: () => listCollections(spaceId!),
    enabled: !!spaceId,
  });

  const newDoc = useMutation({
    mutationFn: () => createDocument({ spaceId: spaceId! }),
    onSuccess: (doc) => {
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate({ to: "/app/doc/$docId", params: { docId: doc.id } });
    },
  });

  const newTable = useMutation({
    mutationFn: () => createCollection(spaceId!),
    onSuccess: (collection) => {
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      navigate({ to: "/app/table/$tableId", params: { tableId: collection.id } });
    },
  });

  const recentDocs = (docsQuery.data ?? [])
    .slice()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 6);
  const collections = collectionsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Your workspace</h1>
      <p className="mt-2 text-muted-foreground">
        Write pages, build tables, and switch between grid, gallery and board views.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => newDoc.mutate()} disabled={!spaceId}>
          <Plus className="mr-2 h-4 w-4" /> New page
        </Button>
        <Button variant="outline" onClick={() => newTable.mutate()} disabled={!spaceId}>
          <Plus className="mr-2 h-4 w-4" /> New table
        </Button>
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">Recent pages</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {recentDocs.length === 0 && (
            <p className="text-sm text-muted-foreground">No pages yet.</p>
          )}
          {recentDocs.map((doc) => (
            <Link
              key={doc.id}
              to="/app/doc/$docId"
              params={{ docId: doc.id }}
              className="panel p-4 transition-shadow hover:shadow-float"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 opacity-70" />
                <span className="truncate font-medium">{doc.title || "Untitled"}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {doc.content.slice(0, 140) || "Empty page"}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">Tables</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {collections.length === 0 && (
            <p className="text-sm text-muted-foreground">No tables yet.</p>
          )}
          {collections.map((collection) => (
            <Link
              key={collection.id}
              to="/app/table/$tableId"
              params={{ tableId: collection.id }}
              className="panel flex items-center gap-2 p-4 transition-shadow hover:shadow-float"
            >
              <Database className="h-4 w-4 opacity-70" />
              <span className="truncate font-medium">{collection.name}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
