import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  Columns3,
  Copy,
  ExternalLink,
  Hash,
  KanbanSquare,
  LayoutGrid,
  Link2,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Table2,
  Tag,
  Trash2,
  Type,
} from "lucide-react";
import { toast } from "sonner";

import { DataGrid } from "@/components/spark/data-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  createField,
  createRow,
  createView,
  deleteCollectionForever,
  deleteField,
  deleteRow,
  deleteView,
  getCollection,
  listFields,
  listRows,
  listViews,
  updateCollection,
  updateField,
  updateRow,
  updateView,
  type CollectionField,
  type CollectionRow,
  type CollectionView,
  type FieldType,
  type ViewKind,
} from "@/lib/spark";

export const Route = createFileRoute("/_authenticated/app/table/$tableId")({
  head: () => ({
    meta: [
      { title: "Tabelle — Spark" },
      { name: "description", content: "Vollwertige relationale Datenbank-Tabelle mit Grid, Galerie und Board." },
    ],
  }),
  component: CollectionPage,
});

const FIELD_TYPE_CONFIG: Record<FieldType, { label: string; icon: typeof Type }> = {
  text: { label: "Text", icon: Type },
  number: { label: "Zahl", icon: Hash },
  checkbox: { label: "Checkbox", icon: CheckSquare },
  select: { label: "Auswahl / Status", icon: Tag },
  date: { label: "Datum", icon: Calendar },
  url: { label: "Link / URL", icon: Link2 },
};

const VIEW_ICONS: Record<ViewKind, typeof Table2> = {
  table: Table2,
  gallery: LayoutGrid,
  kanban: KanbanSquare,
};

function CollectionPage() {
  const { tableId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortFieldId, setSortFieldId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Quick column popover
  const [newColOpen, setNewColOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<FieldType>("text");
  const [newColChoices, setNewColChoices] = useState("Offen, In Arbeit, Erledigt");
  const [tableMode, setTableMode] = useState<"spreadsheet" | "database">("spreadsheet");

  const collectionQuery = useQuery({
    queryKey: ["collection", tableId],
    queryFn: () => getCollection(tableId),
  });
  const fieldsQuery = useQuery({
    queryKey: ["fields", tableId],
    queryFn: () => listFields(tableId),
  });
  const rowsQuery = useQuery({
    queryKey: ["rows", tableId],
    queryFn: () => listRows(tableId),
  });
  const viewsQuery = useQuery({
    queryKey: ["views", tableId],
    queryFn: () => listViews(tableId),
  });

  const collection = collectionQuery.data;
  const fields = fieldsQuery.data ?? [];
  const rows = rowsQuery.data ?? [];
  const views = viewsQuery.data ?? [];
  const view = views.find((item) => item.id === activeViewId) ?? views[0] ?? null;

  useEffect(() => {
    if (collection) setName(collection.name);
  }, [collection?.id, collection?.name, collection]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["fields", tableId] });
    void queryClient.invalidateQueries({ queryKey: ["rows", tableId] });
    void queryClient.invalidateQueries({ queryKey: ["views", tableId] });
    void queryClient.invalidateQueries({ queryKey: ["collections"] });
    void queryClient.invalidateQueries({ queryKey: ["collection", tableId] });
  };

  const rename = useMutation({
    mutationFn: (value: string) => updateCollection(tableId, { name: value }),
    onSuccess: invalidate,
  });

  const addRow = useMutation({
    mutationFn: (seed: Record<string, unknown> = {}) => createRow(tableId, seed),
    onSuccess: () => {
      invalidate();
      toast.success("Zeile hinzugefügt");
    },
    onError: () => toast.error("Konnte Zeile nicht hinzufügen"),
  });

  const saveRow = useMutation({
    mutationFn: (input: { id: string; data: Record<string, unknown> }) =>
      updateRow(input.id, input.data),
    onSuccess: invalidate,
  });

  const duplicateRow = useMutation({
    mutationFn: (row: CollectionRow) => {
      const cloned = { ...row.data };
      if (fields[0]) cloned[fields[0].id] = `${cloned[fields[0].id] ?? ""} (Kopie)`;
      return createRow(tableId, cloned);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Zeile dupliziert");
    },
  });

  const removeRow = useMutation({
    mutationFn: (id: string) => deleteRow(id),
    onSuccess: () => {
      invalidate();
      toast.success("Zeile gelöscht");
    },
  });

  const addFieldMutation = useMutation({
    mutationFn: (input: { name: string; type: FieldType; choices?: string[] | undefined }) =>
      createField({
        collectionId: tableId,
        name: input.name,
        type: input.type,
        position: fields.length,
        choices: input.choices,
      }),
    onSuccess: () => {
      invalidate();
      setNewColOpen(false);
      setNewColName("");
      toast.success("Spalte hinzugefügt");
    },
  });

  const removeFieldMutation = useMutation({
    mutationFn: (id: string) => deleteField(id),
    onSuccess: () => {
      invalidate();
      toast.success("Spalte gelöscht");
    },
  });

  const addView = useMutation({
    mutationFn: (kind: ViewKind) =>
      createView({
        collectionId: tableId,
        name: kind === "table" ? "Tabelle" : kind === "gallery" ? "Galerie" : "Board",
        kind,
        position: views.length,
        config: {},
      }),
    onSuccess: invalidate,
  });

  const removeView = useMutation({
    mutationFn: (id: string) => deleteView(id),
    onSuccess: () => {
      setActiveViewId(null);
      invalidate();
    },
  });

  const removeCollection = useMutation({
    mutationFn: () => deleteCollectionForever(tableId),
    onSuccess: () => {
      invalidate();
      navigate({ to: "/app" });
    },
  });

  const handleCommitCell = (rowId: string, fieldId: string, value: unknown) => {
    const row = rows.find((r) => r.id === rowId);
    const currentData = row ? row.data : {};
    saveRow.mutate({
      id: rowId,
      data: {
        ...currentData,
        [fieldId]: value,
      },
    });
  };

  const handleCommitCells = async (updates: { rowId: string; values: Record<string, unknown> }[]) => {
    for (const update of updates) {
      await updateRow(update.rowId, update.values);
    }
    invalidate();
    toast.success("Zellen aktualisiert");
  };

  const handleAddRows = async (count: number) => {
    for (let i = 0; i < count; i++) {
      await createRow(tableId, {});
    }
    invalidate();
  };

  const handleRenameField = async (fieldId: string, name: string) => {
    await updateField(fieldId, { name });
    invalidate();
  };

  const handleChangeFieldType = async (fieldId: string, type: FieldType) => {
    await updateField(fieldId, { type });
    invalidate();
  };

  // Filter and sort rows
  const filteredAndSortedRows = useMemo(() => {
    let result = [...rows];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row) =>
        Object.values(row.data).some((val) =>
          val !== null && val !== undefined && String(val).toLowerCase().includes(q)
        )
      );
    }

    // Column sorting
    if (sortFieldId) {
      result.sort((a, b) => {
        const valA = a.data[sortFieldId];
        const valB = b.data[sortFieldId];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        const cmp = String(valA).localeCompare(String(valB), "de", { numeric: true });
        return sortOrder === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [rows, searchQuery, sortFieldId, sortOrder]);

  if (collectionQuery.isLoading) {
    return <div className="px-4 py-8 text-sm text-muted-foreground sm:px-8 sm:py-12">Tabelle wird geladen…</div>;
  }
  if (!collection) {
    return (
      <div className="px-4 py-8 text-sm text-muted-foreground sm:px-8 sm:py-12">
        Diese Tabelle existiert nicht mehr oder wurde gelöscht.
      </div>
    );
  }

  const titleField = fields[0] ?? null;
  const selectFields = fields.filter((f) => f.type === "select");
  const groupField =
    selectFields.find((f) => f.id === view?.config?.groupFieldId) ?? selectFields[0] ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-3 py-5 sm:space-y-6 sm:px-4 sm:py-8">
      {/* Table Title & Actions */}
      <div className="grid gap-3 border-b border-border/80 pb-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => rename.mutate(name)}
          className="min-w-0 w-full rounded border-none bg-transparent px-1 font-display text-2xl font-bold tracking-tight text-foreground outline-none transition-colors hover:bg-secondary/40 sm:text-3xl"
          placeholder="Unbenannte Tabelle"
        />

        <div className="flex min-w-0 items-center gap-1 overflow-x-auto pb-1 sm:gap-2 sm:overflow-visible sm:pb-0">
          {/* Quick Add Column Popover */}
          <Popover open={newColOpen} onOpenChange={setNewColOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="shrink-0 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5 text-accent" />
                Spalte hinzufügen
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(20rem,calc(100vw-1.5rem))] space-y-3 border-border bg-card p-4 shadow-float">
              <div className="font-display font-semibold text-sm">Neue Spalte erstellen</div>
              <div className="space-y-1.5">
                <Label className="text-xs">Spaltenname</Label>
                <Input
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="z. B. Priorität, Betrag, Datum"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Datentyp</Label>
                <Select value={newColType} onValueChange={(v) => setNewColType(v as FieldType)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FIELD_TYPE_CONFIG) as FieldType[]).map((type) => {
                      const cfg = FIELD_TYPE_CONFIG[type];
                      const Icon = cfg.icon;
                      return (
                        <SelectItem key={type} value={type} className="text-xs flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground mr-1 inline" />
                          {cfg.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {newColType === "select" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Optionen (kommagetrennt)</Label>
                  <Input
                    value={newColChoices}
                    onChange={(e) => setNewColChoices(e.target.value)}
                    placeholder="Offen, In Arbeit, Erledigt"
                    className="text-xs"
                  />
                </div>
              )}

              <Button
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  if (!newColName.trim()) return;
                  addFieldMutation.mutate({
                    name: newColName.trim(),
                    type: newColType,
                    choices:
                      newColType === "select"
                        ? newColChoices.split(",").map((s) => s.trim()).filter(Boolean)
                        : undefined,
                  });
                }}
              >
                Spalte speichern
              </Button>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="sm" onClick={() => setFieldsOpen(true)} className="shrink-0 text-xs">
            <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Spalten verwalten
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (confirm("Möchtest du diese Tabelle wirklich unwiderruflich löschen?")) {
                removeCollection.mutate();
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Toolbar: Views & Search Bar */}
      <div className="flex flex-col gap-3 border-b border-border/60 pb-3 lg:flex-row lg:items-center lg:justify-between">
        {/* View Switcher */}
        <div className="-mx-3 flex items-center gap-1 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
          {views.map((item) => {
            const Icon = VIEW_ICONS[item.kind] ?? Table2;
            const isActive = view?.id === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveViewId(item.id)}
                className={cn(
                  "flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.name}
              </button>
            );
          })}

          <div className="ml-2 flex shrink-0 items-center gap-1 border-l border-border pl-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 text-muted-foreground"
              onClick={() => addView.mutate("table")}
            >
              + Tabelle
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 text-muted-foreground"
              onClick={() => addView.mutate("gallery")}
            >
              + Galerie
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 text-muted-foreground"
              onClick={() => addView.mutate("kanban")}
            >
              + Board
            </Button>
          </div>
        </div>

        {/* Real-time Search & Filter & Mode Toggle */}
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {(!view || view.kind === "table") && (
            <div className="grid grid-cols-2 items-center gap-1 rounded-lg border border-border bg-secondary/30 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTableMode("spreadsheet")}
                className={cn(
                  "flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2 py-1 font-medium transition-all sm:px-2.5",
                  tableMode === "spreadsheet"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Table2 className="h-3.5 w-3.5 text-accent" /> Kalkulation (Formeln)
              </button>
              <button
                type="button"
                onClick={() => setTableMode("database")}
                className={cn(
                  "flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2 py-1 font-medium transition-all sm:px-2.5",
                  tableMode === "database"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Columns3 className="h-3.5 w-3.5" /> Datenbank-Liste
              </button>
            </div>
          )}

          <div className="relative min-w-0 flex-1 sm:flex-none">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tabelle durchsuchen..."
              className="h-10 w-full border-border bg-card pl-8 pr-3 text-xs sm:h-8 sm:w-44"
            />
          </div>

          {sortFieldId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSortFieldId(null);
                toast.info("Sortierung zurückgesetzt");
              }}
              className="h-8 text-xs gap-1 text-muted-foreground"
            >
              Sortierung löschen
            </Button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div>
        {(!view || view.kind === "table") && (
          tableMode === "spreadsheet" ? (
            <DataGrid
              fields={fields}
              rows={filteredAndSortedRows}
              onCommitCell={handleCommitCell}
              onCommitCells={handleCommitCells}
              onAddRow={() => addRow.mutate({})}
              onAddRows={handleAddRows}
              onDeleteRow={(rowId) => removeRow.mutate(rowId)}
              onDuplicateRow={(rowId) => {
                const target = rows.find((r) => r.id === rowId);
                if (target) duplicateRow.mutate(target);
              }}
              onRenameField={handleRenameField}
              onChangeFieldType={handleChangeFieldType}
              onAddField={() => setNewColOpen(true)}
              onDeleteField={(fieldId) => removeFieldMutation.mutate(fieldId)}
            />
          ) : (
            <EnhancedGridView
              fields={fields}
              rows={filteredAndSortedRows}
              sortFieldId={sortFieldId}
              sortOrder={sortOrder}
              onSort={(fieldId) => {
                if (sortFieldId === fieldId) {
                  setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                } else {
                  setSortFieldId(fieldId);
                  setSortOrder("asc");
                }
              }}
              onChange={(row, data) => saveRow.mutate({ id: row.id, data })}
              onDuplicate={(row) => duplicateRow.mutate(row)}
              onDelete={(row) => removeRow.mutate(row.id)}
              onAddRow={() => addRow.mutate({})}
              onAddColumn={() => setNewColOpen(true)}
              onDeleteColumn={(fieldId) => removeFieldMutation.mutate(fieldId)}
            />
          )
        )}

        {view?.kind === "gallery" && (
          <EnhancedGalleryView
            fields={fields}
            rows={filteredAndSortedRows}
            titleField={titleField}
            onChange={(row, data) => saveRow.mutate({ id: row.id, data })}
            onDuplicate={(row) => duplicateRow.mutate(row)}
            onDelete={(row) => removeRow.mutate(row.id)}
            onAdd={() => addRow.mutate({})}
          />
        )}

        {view?.kind === "kanban" && (
          <EnhancedKanbanView
            fields={fields}
            rows={filteredAndSortedRows}
            titleField={titleField}
            groupField={groupField}
            onChange={(row, data) => saveRow.mutate({ id: row.id, data })}
            onAdd={(seed) => addRow.mutate(seed)}
          />
        )}
      </div>

      {/* Field Management Dialog */}
      <FieldsDialog
        open={fieldsOpen}
        onOpenChange={setFieldsOpen}
        collectionId={tableId}
        fields={fields}
        onChanged={invalidate}
      />
    </div>
  );
}

/* -------------------------------------------------------------
 * ENHANCED GRID VIEW: High-performance Notion/Airtable style
 * ------------------------------------------------------------- */
function EnhancedGridView({
  fields,
  rows,
  sortFieldId,
  sortOrder,
  onSort,
  onChange,
  onDuplicate,
  onDelete,
  onAddRow,
  onAddColumn,
  onDeleteColumn,
}: {
  fields: CollectionField[];
  rows: CollectionRow[];
  sortFieldId: string | null;
  sortOrder: "asc" | "desc";
  onSort: (fieldId: string) => void;
  onChange: (row: CollectionRow, data: Record<string, unknown>) => void;
  onDuplicate: (row: CollectionRow) => void;
  onDelete: (row: CollectionRow) => void;
  onAddRow: () => void;
  onAddColumn: () => void;
  onDeleteColumn: (fieldId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/40 font-medium text-muted-foreground select-none">
              {/* Row index header */}
              <th className="w-12 px-3 py-2.5 text-center font-mono text-[11px] border-r border-border/60">
                #
              </th>

              {/* Dynamic field headers */}
              {fields.map((field) => {
                const cfg = FIELD_TYPE_CONFIG[field.type] ?? FIELD_TYPE_CONFIG.text;
                const Icon = cfg.icon;
                const isSorted = sortFieldId === field.id;

                return (
                  <th
                    key={field.id}
                    className="px-3 py-2.5 text-left border-r border-border/60 min-w-[140px] hover:bg-secondary/70 transition-colors"
                  >
                    <div className="flex items-center justify-between group">
                      <div
                        className="flex items-center gap-1.5 cursor-pointer flex-1 truncate"
                        onClick={() => onSort(field.id)}
                      >
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-semibold text-foreground truncate">{field.name}</span>
                        {isSorted && (
                          sortOrder === "asc" ? (
                            <ArrowUpAZ className="h-3 w-3 text-accent" />
                          ) : (
                            <ArrowDownAZ className="h-3 w-3 text-accent" />
                          )
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-secondary transition-opacity">
                            <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs w-44">
                          <DropdownMenuItem onClick={() => onSort(field.id)}>
                            {isSorted && sortOrder === "asc" ? (
                              <ArrowDownAZ className="mr-2 h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpAZ className="mr-2 h-3.5 w-3.5" />
                            )}
                            {isSorted && sortOrder === "asc" ? "Absteigend sortieren" : "Aufsteigend sortieren"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onDeleteColumn(field.id)}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Spalte löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </th>
                );
              })}

              {/* Add column header button */}
              <th className="w-16 px-2 py-2.5 text-center">
                <button
                  onClick={onAddColumn}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-medium px-2 py-0.5 rounded hover:bg-secondary transition-colors"
                  title="Spalte hinzufügen"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={fields.length + 2}
                  className="px-6 py-12 text-center text-sm text-muted-foreground"
                >
                  Noch keine Zeilen vorhanden. Klicke unten auf „Zeile hinzufügen“.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="border-b border-border/60 hover:bg-secondary/20 transition-colors group"
                >
                  {/* Row index & hover actions */}
                  <td className="px-2 py-1.5 text-center font-mono text-[11px] text-muted-foreground border-r border-border/60">
                    <div className="group-hover:hidden">{index + 1}</div>
                    <div className="hidden group-hover:flex items-center justify-center gap-1">
                      <button
                        onClick={() => onDuplicate(row)}
                        title="Duplizieren"
                        className="p-0.5 rounded text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => onDelete(row)}
                        title="Löschen"
                        className="p-0.5 rounded text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>

                  {/* Field cell editors */}
                  {fields.map((field) => (
                    <td
                      key={field.id}
                      className="px-2 py-1 border-r border-border/60 align-middle"
                    >
                      <EnhancedCellEditor
                        field={field}
                        value={row.data[field.id]}
                        onCommit={(val) => onChange(row, { ...row.data, [field.id]: val })}
                      />
                    </td>
                  ))}

                  {/* Actions column */}
                  <td className="px-2 text-center">
                    <button
                      onClick={() => onDelete(row)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* Table Summary Footer */}
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-border bg-secondary/30 font-mono text-[11px] text-muted-foreground">
                <td className="px-3 py-2 text-center border-r border-border/60 font-semibold">
                  ∑
                </td>
                {fields.map((field) => {
                  let summary = "";
                  if (field.type === "number") {
                    const sum = rows.reduce(
                      (acc, r) => acc + (Number(r.data[field.id]) || 0),
                      0
                    );
                    summary = `Summe: ${sum.toLocaleString("de-DE")}`;
                  } else if (field.type === "checkbox") {
                    const checked = rows.filter((r) => r.data[field.id] === true).length;
                    summary = `${checked} / ${rows.length} ✓`;
                  } else if (fields[0]?.id === field.id) {
                    summary = `${rows.length} Zeilen`;
                  }

                  return (
                    <td key={field.id} className="px-3 py-2 border-r border-border/60">
                      {summary}
                    </td>
                  );
                })}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Add Row Button Footer */}
      <button
        onClick={onAddRow}
        className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-colors"
      >
        <Plus className="h-4 w-4 text-accent" />
        <span>Neue Zeile hinzufügen</span>
      </button>
    </div>
  );
}

/* -------------------------------------------------------------
 * CELL EDITORS: Inline editable with color pills & fast input
 * ------------------------------------------------------------- */
function EnhancedCellEditor({
  field,
  value,
  onCommit,
}: {
  field: CollectionField;
  value: unknown;
  onCommit: (val: unknown) => void;
}) {
  const [draft, setDraft] = useState(value === undefined || value === null ? "" : String(value));
  const [newOption, setNewOption] = useState("");

  useEffect(() => {
    setDraft(value === undefined || value === null ? "" : String(value));
  }, [value]);

  // Checkbox field
  if (field.type === "checkbox") {
    return (
      <div className="flex items-center justify-center py-1">
        <Checkbox
          checked={value === true}
          onCheckedChange={(checked) => onCommit(checked === true)}
        />
      </div>
    );
  }

  // Select / Status field
  if (field.type === "select") {
    const choices = field.options.choices ?? ["Offen", "In Arbeit", "Erledigt"];
    const current = value ? String(value) : "";

    const getPillColor = (choice: string) => {
      const lower = choice.toLowerCase();
      if (lower.includes("erledigt") || lower.includes("done"))
        return "bg-emerald-500/10 text-emerald-800 border-emerald-500/30";
      if (lower.includes("arbeit") || lower.includes("doing") || lower.includes("progress"))
        return "bg-amber-500/10 text-amber-800 border-amber-500/30";
      if (lower.includes("offen") || lower.includes("todo"))
        return "bg-secondary text-muted-foreground border-border";
      return "bg-accent/10 text-accent border-accent/30";
    };

    return (
      <Select value={current} onValueChange={(next) => onCommit(next)}>
        <SelectTrigger className="h-7 border-none bg-transparent shadow-none p-0 text-xs">
          {current ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium border ${getPillColor(
                current
              )}`}
            >
              {current}
            </span>
          ) : (
            <span className="text-muted-foreground opacity-50">—</span>
          )}
        </SelectTrigger>
        <SelectContent className="text-xs">
          {choices.map((choice) => (
            <SelectItem key={choice} value={choice} className="text-xs">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${getPillColor(
                  choice
                )}`}
              >
                {choice}
              </span>
            </SelectItem>
          ))}
          <div className="border-t border-border pt-2 mt-1 px-2 flex gap-1">
            <Input
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="Neu..."
              className="h-6 text-[10px]"
            />
            <Button
              size="sm"
              className="h-6 px-1.5 text-[10px]"
              onClick={() => {
                if (newOption.trim()) {
                  onCommit(newOption.trim());
                  setNewOption("");
                }
              }}
            >
              +
            </Button>
          </div>
        </SelectContent>
      </Select>
    );
  }

  // URL / Link field
  if (field.type === "url") {
    return (
      <div className="flex items-center gap-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => onCommit(draft)}
          placeholder="https://..."
          className="w-full bg-transparent px-1 py-1 text-xs outline-none hover:bg-secondary/40 rounded truncate"
        />
        {draft && (
          <a
            href={draft.startsWith("http") ? draft : `https://${draft}`}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-accent p-0.5 shrink-0"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    );
  }

  // Number / Date / Text fields
  return (
    <input
      value={draft}
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() =>
        onCommit(field.type === "number" ? (draft === "" ? null : Number(draft)) : draft)
      }
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      className={cn(
        "w-full bg-transparent px-1.5 py-1 text-xs outline-none hover:bg-secondary/40 focus:bg-background focus:ring-1 focus:ring-accent rounded transition-colors",
        field.type === "number" && "text-right font-mono"
      )}
      placeholder="—"
    />
  );
}

/* -------------------------------------------------------------
 * GALLERY VIEW (Bookmory / Notion Card Deck)
 * ------------------------------------------------------------- */
function EnhancedGalleryView({
  fields,
  rows,
  titleField,
  onChange,
  onDuplicate,
  onDelete,
  onAdd,
}: {
  fields: CollectionField[];
  rows: CollectionRow[];
  titleField: CollectionField | null;
  onChange: (row: CollectionRow, data: Record<string, unknown>) => void;
  onDuplicate: (row: CollectionRow) => void;
  onDelete: (row: CollectionRow) => void;
  onAdd: () => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <div
          key={row.id}
          className="rounded-xl border border-border bg-card p-4 shadow-panel hover:border-border/80 transition-all flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2">
              <span className="font-display font-semibold text-sm text-foreground">
                {titleField ? String(row.data[titleField.id] ?? "Ohne Titel") : "Ohne Titel"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onDuplicate(row)}
                  title="Duplizieren"
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onDelete(row)}
                  title="Löschen"
                  className="p-1 rounded text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {fields.slice(1).map((field) => (
                <div key={field.id} className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">
                    {field.name}
                  </span>
                  <div className="min-w-0 max-w-[60%]">
                    <EnhancedCellEditor
                      field={field}
                      value={row.data[field.id]}
                      onCommit={(val) => onChange(row, { ...row.data, [field.id]: val })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={onAdd}
        className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/10 p-4 text-xs font-medium text-muted-foreground hover:bg-secondary/30 transition-colors"
      >
        <Plus className="h-5 w-5 text-accent" />
        <span>Neuen Eintrag hinzufügen</span>
      </button>
    </div>
  );
}

/* -------------------------------------------------------------
 * KANBAN BOARD VIEW (Grouped by Select/Status)
 * ------------------------------------------------------------- */
function EnhancedKanbanView({
  fields,
  rows,
  titleField,
  groupField,
  onChange,
  onAdd,
}: {
  fields: CollectionField[];
  rows: CollectionRow[];
  titleField: CollectionField | null;
  groupField: CollectionField | null;
  onChange: (row: CollectionRow, data: Record<string, unknown>) => void;
  onAdd: (seed: Record<string, unknown>) => void;
}) {
  const columns = useMemo(() => {
    const choices = groupField?.options.choices ?? ["Offen", "In Arbeit", "Erledigt"];
    return [...choices, "Ohne Status"];
  }, [groupField]);

  if (!groupField) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Füge ein Auswahl-Feld (z. B. „Status“) hinzu, um Einträge auf einem Board nach Spalten zu gruppieren.
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const isCatchAll = column === "Ohne Status";
        const columnRows = rows.filter((row) => {
          const value = row.data[groupField.id];
          return isCatchAll
            ? !value || !(groupField.options.choices ?? []).includes(String(value))
            : value === column;
        });

        return (
          <div key={column} className="w-72 shrink-0 rounded-xl border border-border bg-secondary/20 p-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="font-display font-semibold text-xs text-foreground uppercase tracking-wider">
                  {column}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {columnRows.length}
                </span>
              </div>

              <div className="space-y-2">
                {columnRows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-lg border border-border bg-card p-3 shadow-panel space-y-2"
                  >
                    <span className="font-medium text-xs text-foreground block">
                      {titleField ? String(row.data[titleField.id] ?? "Ohne Titel") : "Ohne Titel"}
                    </span>

                    {fields
                      .filter((f) => f.id !== groupField.id && f.id !== titleField?.id)
                      .slice(0, 2)
                      .map((field) => (
                        <div key={field.id} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground font-mono">{field.name}</span>
                          <div className="min-w-0 max-w-[60%]">
                            <EnhancedCellEditor
                              field={field}
                              value={row.data[field.id]}
                              onCommit={(val) => onChange(row, { ...row.data, [field.id]: val })}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onAdd(isCatchAll ? {} : { [groupField.id]: column })}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Karte hinzufügen
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------
 * FIELDS MANAGEMENT DIALOG
 * ------------------------------------------------------------- */
function FieldsDialog({
  open,
  onOpenChange,
  collectionId,
  fields,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  fields: CollectionField[];
  onChanged: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");
  const [newChoices, setNewChoices] = useState("Offen, In Arbeit, Erledigt");

  const add = useMutation({
    mutationFn: () =>
      createField({
        collectionId,
        name: newName.trim() || "Spalte",
        type: newType,
        position: fields.length,
        choices:
          newType === "select"
            ? newChoices.split(",").map((c) => c.trim()).filter(Boolean)
            : undefined,
      }),
    onSuccess: () => {
      setNewName("");
      onChanged();
      toast.success("Spalte erstellt");
    },
  });

  const patch = useMutation({
    mutationFn: (input: { id: string; patch: Partial<CollectionField> }) =>
      updateField(input.id, input.patch),
    onSuccess: onChanged,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteField(id),
    onSuccess: () => {
      onChanged();
      toast.info("Spalte gelöscht");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border shadow-float">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold">Spalten verwalten</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {fields.map((field) => {
            const cfg = FIELD_TYPE_CONFIG[field.type] ?? FIELD_TYPE_CONFIG.text;
            const Icon = cfg.icon;

            return (
              <div
                key={field.id}
                className="flex items-center gap-2 rounded-lg border border-border p-2 bg-secondary/20"
              >
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  defaultValue={field.name}
                  onBlur={(e) =>
                    e.target.value !== field.name &&
                    patch.mutate({ id: field.id, patch: { name: e.target.value } })
                  }
                  className="h-7 text-xs bg-transparent border-none"
                />
                <span className="text-[10px] font-mono uppercase bg-secondary px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                  {cfg.label}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => remove.mutate(field.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <div className="font-display font-medium text-xs text-foreground">Neue Spalte anlegen</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Name der Spalte"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="text-xs"
            />
            <Select value={newType} onValueChange={(val) => setNewType(val as FieldType)}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FIELD_TYPE_CONFIG) as FieldType[]).map((type) => (
                  <SelectItem key={type} value={type} className="text-xs">
                    {FIELD_TYPE_CONFIG[type].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {newType === "select" && (
            <Input
              placeholder="Optionen (kommagetrennt)"
              value={newChoices}
              onChange={(e) => setNewChoices(e.target.value)}
              className="text-xs"
            />
          )}

          <Button onClick={() => add.mutate()} size="sm" className="w-full text-xs gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Spalte hinzufügen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
