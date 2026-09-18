import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Columns3,
  KanbanSquare,
  LayoutGrid,
  Plus,
  Settings2,
  Table2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
} from "@/lib/flux";

export const Route = createFileRoute("/_authenticated/app/table/$tableId")({
  component: CollectionPage,
});

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "checkbox", label: "Checkbox" },
  { value: "select", label: "Select" },
  { value: "date", label: "Date" },
  { value: "url", label: "Link" },
];

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

  const collectionQuery = useQuery({
    queryKey: ["collection", tableId],
    queryFn: () => getCollection(tableId),
  });
  const fieldsQuery = useQuery({
    queryKey: ["fields", tableId],
    queryFn: () => listFields(tableId),
  });
  const rowsQuery = useQuery({ queryKey: ["rows", tableId], queryFn: () => listRows(tableId) });
  const viewsQuery = useQuery({ queryKey: ["views", tableId], queryFn: () => listViews(tableId) });

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
    onSuccess: invalidate,
    onError: () => toast.error("Could not add the record"),
  });

  const saveRow = useMutation({
    mutationFn: (input: { id: string; data: Record<string, unknown> }) =>
      updateRow(input.id, input.data),
    onSuccess: invalidate,
  });

  const removeRow = useMutation({
    mutationFn: (id: string) => deleteRow(id),
    onSuccess: invalidate,
  });

  const addView = useMutation({
    mutationFn: (kind: ViewKind) =>
      createView({
        collectionId: tableId,
        name: kind === "table" ? "Table" : kind === "gallery" ? "Gallery" : "Board",
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

  const patchView = useMutation({
    mutationFn: (input: { id: string; patch: Partial<CollectionView> }) =>
      updateView(input.id, input.patch),
    onSuccess: invalidate,
  });

  const removeCollection = useMutation({
    mutationFn: () => deleteCollectionForever(tableId),
    onSuccess: () => {
      invalidate();
      navigate({ to: "/app" });
    },
  });

  if (collectionQuery.isLoading) {
    return <div className="px-8 py-12 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!collection) {
    return <div className="px-8 py-12 text-sm text-muted-foreground">This table no longer exists.</div>;
  }

  const titleField = fields[0] ?? null;
  const selectFields = fields.filter((field) => field.type === "select");
  const groupField =
    selectFields.find((field) => field.id === view?.config.groupFieldId) ?? selectFields[0] ?? null;

  return (
    <div className="px-6 py-8">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => rename.mutate(name)}
          className="min-w-40 flex-1 border-none bg-transparent font-display text-3xl font-bold tracking-tight outline-none"
        />
        <Button variant="ghost" size="sm" onClick={() => setFieldsOpen(true)}>
          <Settings2 className="mr-2 h-4 w-4" /> Fields
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => removeCollection.mutate()}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {views.map((item) => {
          const Icon = VIEW_ICONS[item.kind];
          return (
            <button
              key={item.id}
              onClick={() => setActiveViewId(item.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-muted",
                view?.id === item.id && "bg-muted font-medium",
              )}
            >
              <Icon className="h-4 w-4 opacity-70" />
              {item.name}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => addView.mutate("table")}>
            <Table2 className="mr-1 h-4 w-4" /> Grid
          </Button>
          <Button variant="ghost" size="sm" onClick={() => addView.mutate("gallery")}>
            <LayoutGrid className="mr-1 h-4 w-4" /> Gallery
          </Button>
          <Button variant="ghost" size="sm" onClick={() => addView.mutate("kanban")}>
            <KanbanSquare className="mr-1 h-4 w-4" /> Board
          </Button>
          {view && views.length > 1 && (
            <Button variant="ghost" size="sm" onClick={() => removeView.mutate(view.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {view?.kind === "kanban" && selectFields.length > 1 && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <Columns3 className="h-4 w-4 opacity-60" />
          <span className="text-muted-foreground">Group by</span>
          <Select
            value={groupField?.id ?? ""}
            onValueChange={(value) =>
              patchView.mutate({ id: view.id, patch: { config: { ...view.config, groupFieldId: value } } })
            }
          >
            <SelectTrigger className="h-8 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selectFields.map((field) => (
                <SelectItem key={field.id} value={field.id}>
                  {field.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="mt-6">
        {(!view || view.kind === "table") && (
          <GridView
            fields={fields}
            rows={rows}
            onChange={(row, data) => saveRow.mutate({ id: row.id, data })}
            onDelete={(row) => removeRow.mutate(row.id)}
            onAdd={() => addRow.mutate({})}
          />
        )}
        {view?.kind === "gallery" && (
          <GalleryView
            fields={fields}
            rows={rows}
            titleField={titleField}
            onChange={(row, data) => saveRow.mutate({ id: row.id, data })}
            onDelete={(row) => removeRow.mutate(row.id)}
            onAdd={() => addRow.mutate({})}
          />
        )}
        {view?.kind === "kanban" && (
          <KanbanView
            fields={fields}
            rows={rows}
            titleField={titleField}
            groupField={groupField}
            onChange={(row, data) => saveRow.mutate({ id: row.id, data })}
            onAdd={(seed) => addRow.mutate(seed)}
          />
        )}
      </div>

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

/* ---------- cells ---------- */

function CellEditor({
  field,
  value,
  onCommit,
}: {
  field: CollectionField;
  value: unknown;
  onCommit: (value: unknown) => void;
}) {
  const [draft, setDraft] = useState(value === undefined || value === null ? "" : String(value));

  useEffect(() => {
    setDraft(value === undefined || value === null ? "" : String(value));
  }, [value]);

  if (field.type === "checkbox") {
    return (
      <Checkbox checked={value === true} onCheckedChange={(checked) => onCommit(checked === true)} />
    );
  }

  if (field.type === "select") {
    const choices = field.options.choices ?? [];
    return (
      <Select value={value ? String(value) : ""} onValueChange={(next) => onCommit(next)}>
        <SelectTrigger className="h-8 border-none bg-transparent shadow-none">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {choices.map((choice) => (
            <SelectItem key={choice} value={choice}>
              {choice}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <input
      value={draft}
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() =>
        onCommit(field.type === "number" ? (draft === "" ? null : Number(draft)) : draft)
      }
      className="w-full bg-transparent px-1 py-1 text-sm outline-none"
    />
  );
}

function GridView({
  fields,
  rows,
  onChange,
  onDelete,
  onAdd,
}: {
  fields: CollectionField[];
  rows: CollectionRow[];
  onChange: (row: CollectionRow, data: Record<string, unknown>) => void;
  onDelete: (row: CollectionRow) => void;
  onAdd: () => void;
}) {
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {fields.map((field) => (
              <th key={field.id} className="px-3 py-2 text-left font-medium">
                {field.name}
              </th>
            ))}
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={fields.length + 1} className="px-3 py-6 text-muted-foreground">
                No records yet.
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30">
              {fields.map((field) => (
                <td key={field.id} className="px-2 py-1 align-middle">
                  <CellEditor
                    field={field}
                    value={row.data[field.id]}
                    onCommit={(value) => onChange(row, { ...row.data, [field.id]: value })}
                  />
                </td>
              ))}
              <td className="px-2">
                <button
                  aria-label="Delete record"
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(row)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={onAdd}
        className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40"
      >
        <Plus className="h-4 w-4" /> New record
      </button>
    </div>
  );
}

function GalleryView({
  fields,
  rows,
  titleField,
  onChange,
  onDelete,
  onAdd,
}: {
  fields: CollectionField[];
  rows: CollectionRow[];
  titleField: CollectionField | null;
  onChange: (row: CollectionRow, data: Record<string, unknown>) => void;
  onDelete: (row: CollectionRow) => void;
  onAdd: () => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <div key={row.id} className="panel p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium">
              {titleField ? String(row.data[titleField.id] ?? "Untitled") : "Untitled"}
            </span>
            <button
              aria-label="Delete record"
              className="rounded p-1 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(row)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {fields.slice(1).map((field) => (
              <div key={field.id} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                  {field.name}
                </span>
                <div className="min-w-0 flex-1">
                  <CellEditor
                    field={field}
                    value={row.data[field.id]}
                    onCommit={(value) => onChange(row, { ...row.data, [field.id]: value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={onAdd}
        className="flex min-h-32 items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:bg-muted/40"
      >
        <Plus className="h-4 w-4" /> New record
      </button>
    </div>
  );
}

function KanbanView({
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
    const choices = groupField?.options.choices ?? [];
    return [...choices, "No status"];
  }, [groupField]);

  if (!groupField) {
    return (
      <p className="text-sm text-muted-foreground">
        Add a select field in “Fields” to group records on a board.
      </p>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const isCatchAll = column === "No status";
        const columnRows = rows.filter((row) => {
          const value = row.data[groupField.id];
          return isCatchAll
            ? !value || !(groupField.options.choices ?? []).includes(String(value))
            : value === column;
        });
        return (
          <div key={column} className="w-72 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-semibold">{column}</span>
              <span className="text-xs text-muted-foreground">{columnRows.length}</span>
            </div>
            <div className="space-y-2">
              {columnRows.map((row) => (
                <div key={row.id} className="panel p-3">
                  <span className="font-medium">
                    {titleField ? String(row.data[titleField.id] ?? "Untitled") : "Untitled"}
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(groupField.options.choices ?? []).map((choice) => (
                      <button
                        key={choice}
                        onClick={() => onChange(row, { ...row.data, [groupField.id]: choice })}
                        className={cn(
                          "rounded-full border border-border px-2 py-0.5 text-xs hover:bg-muted",
                          row.data[groupField.id] === choice && "bg-accent/20 border-accent",
                        )}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                  {fields
                    .filter((field) => field.id !== groupField.id && field.id !== titleField?.id)
                    .slice(0, 2)
                    .map((field) => (
                      <div key={field.id} className="mt-2 flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {field.name}
                        </span>
                        <div className="min-w-0 flex-1">
                          <CellEditor
                            field={field}
                            value={row.data[field.id]}
                            onCommit={(value) => onChange(row, { ...row.data, [field.id]: value })}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              ))}
              <button
                onClick={() => onAdd(isCatchAll ? {} : { [groupField.id]: column })}
                className="flex w-full items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
  const [newChoices, setNewChoices] = useState("Todo, Doing, Done");

  const add = useMutation({
    mutationFn: () =>
      createField({
        collectionId,
        name: newName.trim() || "Field",
        type: newType,
        position: fields.length,
        ...(newType === "select"
          ? {
              choices: newChoices
                .split(",")
                .map((choice) => choice.trim())
                .filter(Boolean),
            }
          : {}),
      }),
    onSuccess: () => {
      setNewName("");
      onChanged();
    },
  });

  const patch = useMutation({
    mutationFn: (input: { id: string; patch: Partial<CollectionField> }) =>
      updateField(input.id, input.patch),
    onSuccess: onChanged,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteField(id),
    onSuccess: onChanged,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <h2 className="text-lg font-semibold">Fields</h2>

        <div className="space-y-2">
          {fields.map((field) => (
            <div key={field.id} className="flex items-center gap-2">
              <Input
                defaultValue={field.name}
                onBlur={(event) =>
                  event.target.value !== field.name &&
                  patch.mutate({ id: field.id, patch: { name: event.target.value } })
                }
              />
              <span className="w-20 shrink-0 text-xs uppercase text-muted-foreground">
                {field.type}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => remove.mutate(field.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="space-y-2">
            <Label htmlFor="field-name">New field</Label>
            <Input
              id="field-name"
              placeholder="Field name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
          </div>
          <Select value={newType} onValueChange={(value) => setNewType(value as FieldType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {newType === "select" && (
            <Input
              placeholder="Choices, comma separated"
              value={newChoices}
              onChange={(event) => setNewChoices(event.target.value)}
            />
          )}
          <Button onClick={() => add.mutate()} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Add field
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
