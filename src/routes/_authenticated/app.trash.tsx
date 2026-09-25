import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteDocumentForever, listTrashedDocuments, updateDocument } from "@/lib/spark";

export const Route = createFileRoute("/_authenticated/app/trash")({
  component: TrashPage,
});

function TrashPage() {
  const queryClient = useQueryClient();
  const trashQuery = useQuery({ queryKey: ["trash"], queryFn: listTrashedDocuments });

  const restore = useMutation({
    mutationFn: (id: string) => updateDocument(id, { is_trashed: false }),
    onSuccess: () => void queryClient.invalidateQueries(),
  });

  const purge = useMutation({
    mutationFn: (id: string) => deleteDocumentForever(id),
    onSuccess: () => void queryClient.invalidateQueries(),
  });

  const items = trashQuery.data ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-7 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Trash</h1>
      <p className="mt-2 text-muted-foreground">Restore a page or delete it permanently.</p>

      <div className="mt-8 space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Trash is empty.</p>}
        {items.map((doc) => (
          <div key={doc.id} className="panel grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-3">
            <span className="min-w-0 truncate font-medium">{doc.title || "Untitled"}</span>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="sm" onClick={() => restore.mutate(doc.id)}>
                <RotateCcw className="h-4 w-4 sm:mr-2" /> <span className="sr-only sm:not-sr-only">Restore</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => purge.mutate(doc.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
