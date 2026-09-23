import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Brain,
  Calendar,
  ChevronDown,
  Database,
  FileText,
  Headphones,
  Heart,
  Home,
  LogOut,
  Menu,
  Network,
  PenTool,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { FocusAudioPlayer } from "@/components/spark/focus-audio-player";

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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { focusAudio, type AudioSettings } from "@/lib/focus-audio";

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() =>
    focusAudio.getSettings()
  );

  useEffect(() => {
    return focusAudio.subscribe((s) => setAudioSettings(s));
  }, []);

  // Auto-close mobile drawer on route navigation
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

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

  const [currentUser, setCurrentUser] = useState<{
    name?: string | undefined;
    email?: string | undefined;
    picture?: string | undefined;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const rawGoogle = localStorage.getItem("spark_google_user");
      if (rawGoogle) {
        try {
          const parsed = JSON.parse(rawGoogle);
          setCurrentUser(parsed);
          return;
        } catch {}
      }
      void supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          const meta = data.user.user_metadata as Record<string, any> | undefined;
          setCurrentUser({
            name: (meta?.["full_name"] as string | undefined) || data.user.email?.split("@")[0],
            email: data.user.email,
          });
        }
      });
    }
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      localStorage.removeItem("spark_google_user");
      localStorage.removeItem("spark_gcal_token");
      localStorage.removeItem("spark_gcal_token_expiry");
    }
    queryClient.clear();
    navigate({ to: "/auth" });
  }

  const docs = docsQuery.data ?? [];
  const collections = collectionsQuery.data ?? [];
  const favorites = docs.filter((doc) => doc.is_favorite);
  const rootDocs = docs.filter((doc) => !doc.parent_id);

  const renderSidebar = (onItemClick?: () => void) => (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center justify-between px-4 py-4">
        <Link to="/app" className="flex items-center" onClick={onItemClick}>
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
              <DropdownMenuItem
                key={space.id}
                onClick={() => {
                  setActiveSpaceId(space.id);
                  onItemClick?.();
                }}
              >
                {space.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              onClick={() => {
                setNewSpaceOpen(true);
                onItemClick?.();
              }}
            >
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
          onClick={() => {
            setPaletteOpen(true);
            onItemClick?.();
          }}
          className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent"
        >
          <Search className="h-4 w-4" /> Suchen
          <span className="ml-auto text-xs opacity-60">⌘K</span>
        </button>
      </div>

      <nav className="mt-4 flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        <Section title="Fokus & Module">
          <SidebarLink
            to="/app/plan"
            active={pathname === "/app/plan"}
            icon={<Calendar className="h-4 w-4 text-accent" />}
            label="Tagesplan & Kalender"
            onClick={onItemClick}
          />
          <SidebarLink
            to="/app/health"
            active={pathname === "/app/health"}
            icon={<Heart className="h-4 w-4 text-emerald-600" />}
            label="Gesundheit & Bio"
            onClick={onItemClick}
          />
          <SidebarLink
            to="/app/studio"
            active={pathname === "/app/studio"}
            icon={<BookOpen className="h-4 w-4 text-amber-600" />}
            label="Studio & Bücher"
            onClick={onItemClick}
          />
          <SidebarLink
            to="/app/learn"
            active={pathname === "/app/learn"}
            icon={<Brain className="h-4 w-4 text-purple-600" />}
            label="Wissen & Recall"
            onClick={onItemClick}
          />
          <SidebarLink
            to="/app/graph"
            active={pathname === "/app/graph"}
            icon={<Network className="h-4 w-4 text-blue-600" />}
            label="Wissens-Graph"
            onClick={onItemClick}
          />
          <SidebarLink
            to="/app/canvas"
            active={pathname === "/app/canvas"}
            icon={<PenTool className="h-4 w-4 text-indigo-600" />}
            label="Whiteboard Canvas"
            onClick={onItemClick}
          />
          <SidebarLink
            to="/app/audio"
            active={pathname === "/app/audio"}
            icon={<Headphones className="h-4 w-4 text-pink-600" />}
            label="Brain.fm Audio"
            onClick={onItemClick}
          />
        </Section>

        {favorites.length > 0 && (
          <Section title="Favoriten">
            {favorites.map((doc) => (
              <SidebarLink
                key={doc.id}
                to="/app/doc/$docId"
                params={{ docId: doc.id }}
                active={pathname.includes(doc.id)}
                icon={<Star className="h-4 w-4 text-accent" />}
                label={doc.title}
                onClick={onItemClick}
              />
            ))}
          </Section>
        )}

        <Section
          title="Seiten"
          action={
            <button
              aria-label="Neue Seite"
              className="rounded p-1 hover:bg-sidebar-accent"
              onClick={() => {
                newDoc.mutate();
                onItemClick?.();
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          }
        >
          {rootDocs.length === 0 && <EmptyHint text="Noch keine Seiten" />}
          {rootDocs.map((doc) => (
            <div key={doc.id}>
              <SidebarLink
                to="/app/doc/$docId"
                params={{ docId: doc.id }}
                active={pathname.includes(doc.id)}
                icon={<FileText className="h-4 w-4 opacity-70" />}
                label={doc.title}
                onClick={onItemClick}
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
                      onClick={onItemClick}
                    />
                  ))}
              </div>
            </div>
          ))}
        </Section>

        <Section
          title="Tabellen"
          action={
            <button
              aria-label="Neue Tabelle"
              className="rounded p-1 hover:bg-sidebar-accent"
              onClick={() => {
                newTable.mutate();
                onItemClick?.();
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          }
        >
          {collections.length === 0 && <EmptyHint text="Noch keine Tabellen" />}
          {collections.map((collection) => (
            <SidebarLink
              key={collection.id}
              to="/app/table/$tableId"
              params={{ tableId: collection.id }}
              active={pathname.includes(collection.id)}
              icon={<Database className="h-4 w-4 opacity-70" />}
              label={collection.name}
              onClick={onItemClick}
            />
          ))}
        </Section>

        <Section title="System">
          <SidebarLink
            to="/app/trash"
            active={pathname.endsWith("/trash")}
            icon={<Trash2 className="h-4 w-4 opacity-70" />}
            label="Papierkorb"
            onClick={onItemClick}
          />
        </Section>
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-2">
        {currentUser && (
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-sidebar-accent/50 text-xs">
            {currentUser.picture ? (
              <img
                src={currentUser.picture}
                alt={currentUser.name || "User"}
                className="h-7 w-7 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-xs shrink-0">
                {(currentUser.name || currentUser.email || "U")[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate text-xs">
                {currentUser.name || "Angemeldet"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {currentUser.email}
              </p>
            </div>
          </div>
        )}
        <Button variant="ghost" className="w-full justify-start text-xs" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Abmelden
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        {renderSidebar()}
      </aside>

      {/* Mobile Drawer (Slide-Out Sidebar) */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar border-r border-sidebar-border">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          {renderSidebar(() => setMobileNavOpen(false))}
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Sticky Top Header */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/95 px-3 py-2.5 backdrop-blur-md md:hidden">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-foreground"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Menü öffnen"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/app" className="flex items-center">
              <SparkWordmark />
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              onClick={() => setPaletteOpen(true)}
              aria-label="Suchen"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content with extra bottom padding for the mobile navigation bar */}
        <main className="min-w-0 flex-1 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Daumensteuerung) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-card/95 px-1 backdrop-blur-lg md:hidden shadow-float">
        {[
          {
            to: "/app",
            label: "Home",
            icon: Home,
            active: pathname === "/app" || pathname === "/app/",
          },
          {
            to: "/app/plan",
            label: "Plan",
            icon: Calendar,
            active: pathname === "/app/plan",
          },
          {
            to: "/app/health",
            label: "Gesundheit",
            icon: Heart,
            active: pathname === "/app/health",
          },
          {
            to: "/app/studio",
            label: "Studio",
            icon: BookOpen,
            active: pathname === "/app/studio",
          },
          {
            to: "/app/audio",
            label: "Audio",
            icon: Headphones,
            active: pathname === "/app/audio",
            badge: audioSettings.isPlayingTrack || audioSettings.isPlaying,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center py-1 transition-colors min-h-[48px]",
                item.active
                  ? "text-accent font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", item.active && "scale-110 transition-transform")} />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 leading-none">{item.label}</span>
              {item.active && (
                <span className="absolute bottom-1 h-0.5 w-6 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>

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

      {/* Global Persistent Floating Focus Audio Player (Brain.fm) */}
      <FocusAudioPlayer />
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
  onClick,
}: {
  to: string;
  params?: Record<string, string> | undefined;
  active?: boolean | undefined;
  icon: React.ReactNode;
  label: string;
  onClick?: (() => void) | undefined;
}) {
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      params={params as never}
      onClick={onClick}
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
