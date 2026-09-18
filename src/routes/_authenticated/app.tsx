import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  Database,
  FileText,
  LogOut,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SparkWordmark } from "@/components/spark/logo";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  createCollection,
  createDocument,
  createSpace,
  deleteSpace,
  ensureDefaultSpace,
  listCollections,
  listDocuments,
  listSpaces,
  searchAll,
} from "@/lib/spark";

export const Route = createFileRoute("/_authenticated/app")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newSpaceOpen, setNewSpaceOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");

  const spacesQuery = useQuery({
    queryKey: ["spaces"],
    queryFn: async () => {
      await ensureDefaultSpace();
      return listSpaces();
    },
  });

  const spaces = spacesQuery.data ?? [];
  const spaceId = activeSpaceId ?? spaces[0]?.id ?? null;
  const activeSpace = spaces.find((space) => space.id === spaceId) ?? null;

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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const newDoc = useMutation({
    mutationFn: () => createDocument({ spaceId: spaceId!, title: "Untitled" }),
    onSuccess: (doc) => {
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate({ to: "/app/doc/$docId", params: { docId: doc.id } });
    },
    onError: () => toast.error("Could not create the page"),
  });

  const newTable = useMutation({
    mutationFn: () => createCollection(spaceId!),
    onSuccess: (collection) => {
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      navigate({ to: "/app/table/$tableId", params: { tableId: collection.id } });
    },
    onError: () => toast.error("Could not create the table"),
  });

  const addSpace = useMutation({
    mutationFn: () => createSpace(newSpaceName.trim() || "New space"),
    onSuccess: (space) => {
      setNewSpaceOpen(false);
      setNewSpaceName("");
      setActiveSpaceId(space.id);
      void queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
  });

  const removeSpace = useMutation({
    mutationFn: (id: string) => deleteSpace(id),
    onSuccess: () => {
      setActiveSpaceId(null);
      void queryClient.invalidateQueries();
      navigate({ to: "/app" });
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/auth" });
  }

  const docs = docsQuery.data ?? [];
  const collections = collectionsQuery.data ?? [];
  const favorites = docs.filter((doc) => doc.is_favorite);
  const rootDocs = docs.filter((doc) => !doc.parent_id);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center justify-between px-4 py-4">
          <Link to="/app" className="flex items-center">
            <SparkWordmark />
          </Link>
        </div>

        <div className="px-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium hover:bg-sidebar-accent">
                <span className="truncate">{activeSpace?.name ?? "Space"}</span>
                <ChevronDown className="h-4 w-4 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {spaces.map((space) => (
                <DropdownMenuItem key={space.id} onClick={() => setActiveSpaceId(space.id)}>
                  {space.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => setNewSpaceOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> New space
              </DropdownMenuItem>
              {activeSpace && spaces.length > 1 && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => removeSpace.mutate(activeSpace.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete this space
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => setPaletteOpen(true)}
            className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent"
          >
            <Search className="h-4 w-4" /> Search
            <span className="ml-auto text-xs opacity-60">⌘K</span>
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-6 overflow-y-auto px-3 pb-6">
          {favorites.length > 0 && (
            <Section title="Favourites">
              {favorites.map((doc) => (
                <SidebarLink
                  key={doc.id}
                  to="/app/doc/$docId"
                  params={{ docId: doc.id }}
                  active={pathname.includes(doc.id)}
                  icon={<Star className="h-4 w-4 text-accent" />}
                  label={doc.title}
                />
              ))}
            </Section>
          )}

          <Section
            title="Pages"
            action={
              <button
                aria-label="New page"
                className="rounded p-1 hover:bg-sidebar-accent"
                onClick={() => newDoc.mutate()}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            }
          >
            {rootDocs.length === 0 && <EmptyHint text="No pages yet" />}
            {rootDocs.map((doc) => (
              <div key={doc.id}>
                <SidebarLink
                  to="/app/doc/$docId"
                  params={{ docId: doc.id }}
                  active={pathname.includes(doc.id)}
                  icon={<FileText className="h-4 w-4 opacity-70" />}
                  label={doc.title}
                />
                <div className="ml-4 border-l border-sidebar-border pl-1">
                  {docs
                    .filter((child) => child.parent_id === doc.id)
                    .map((child) => (
                      <SidebarLink
                        key={child.id}
                        to="/app/doc/$docId"
                        params={{ docId: child.id }}
                        active={pathname.includes(child.id)}
                        icon={<FileText className="h-3.5 w-3.5 opacity-60" />}
                        label={child.title}
                      />
                    ))}
                </div>
              </div>
            ))}
          </Section>

          <Section
            title="Tables"
            action={
              <button
                aria-label="New table"
                className="rounded p-1 hover:bg-sidebar-accent"
                onClick={() => newTable.mutate()}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            }
          >
            {collections.length === 0 && <EmptyHint text="No tables yet" />}
            {collections.map((collection) => (
              <SidebarLink
                key={collection.id}
                to="/app/table/$tableId"
                params={{ tableId: collection.id }}
                active={pathname.includes(collection.id)}
                icon={<Database className="h-4 w-4 opacity-70" />}
                label={collection.name}
              />
            ))}
          </Section>

          <Section title="More">
            <SidebarLink
              to="/app/trash"
              active={pathname.endsWith("/trash")}
              icon={<Trash2 className="h-4 w-4 opacity-70" />}
              label="Trash"
            />
          </Section>
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 md:hidden">
          <Link to="/app">
            <SparkWordmark />
          </Link>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setPaletteOpen(true)}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <SearchPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      <Dialog open={newSpaceOpen} onOpenChange={setNewSpaceOpen}>
        <DialogContent className="max-w-sm">
          <h2 className="text-lg font-semibold">New space</h2>
          <Input
            autoFocus
            placeholder="Space name"
            value={newSpaceName}
            onChange={(event) => setNewSpaceName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && addSpace.mutate()}
          />
          <Button onClick={() => addSpace.mutate()}>Create space</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between px-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        {action}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="px-2 py-1 text-xs text-muted-foreground">{text}</p>;
}

function SidebarLink({
  to,
  params,
  active,
  icon,
  label,
}: {
  to: string;
  params?: Record<string, string>;
  active?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      params={params as never}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent",
        active && "bg-sidebar-accent font-medium",
      )}
    >
      {icon}
      <span className="truncate">{label || "Untitled"}</span>
    </Link>
  );
}

function SearchPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");

  const results = useQuery({
    queryKey: ["search", term],
    queryFn: () => searchAll(term),
    enabled: open && term.trim().length > 0,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search pages and tables…"
            value={term}
            onValueChange={setTerm}
          />
          <CommandList>
            {term.trim().length === 0 && (
              <CommandEmpty>Type to search your workspace.</CommandEmpty>
            )}
            {term.trim().length > 0 &&
              (results.data?.documents.length ?? 0) === 0 &&
              (results.data?.collections.length ?? 0) === 0 && (
                <CommandEmpty>Nothing found.</CommandEmpty>
              )}
            {(results.data?.documents.length ?? 0) > 0 && (
              <CommandGroup heading="Pages">
                {results.data?.documents.map((doc) => (
                  <CommandItem
                    key={doc.id}
                    value={doc.id}
                    onSelect={() => {
                      onOpenChange(false);
                      navigate({ to: "/app/doc/$docId", params: { docId: doc.id } });
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4 opacity-70" />
                    {doc.title || "Untitled"}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {(results.data?.collections.length ?? 0) > 0 && (
              <CommandGroup heading="Tables">
                {results.data?.collections.map((collection) => (
                  <CommandItem
                    key={collection.id}
                    value={collection.id}
                    onSelect={() => {
                      onOpenChange(false);
                      navigate({ to: "/app/table/$tableId", params: { tableId: collection.id } });
                    }}
                  >
                    <Database className="mr-2 h-4 w-4 opacity-70" />
                    {collection.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
