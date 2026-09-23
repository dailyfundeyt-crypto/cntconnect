import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  columnLabel,
  createEvaluator,
  formatValue,
  isErrorValue,
  isFormula,
  type EvalResult,
} from "@/lib/formula";
import type { CollectionField, CollectionRow, FieldType } from "@/lib/spark";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DataGridProps = {
  fields: CollectionField[];
  rows: CollectionRow[];
  onCommitCell: (rowId: string, fieldId: string, value: unknown) => void;
  onCommitCells: (updates: { rowId: string; values: Record<string, unknown> }[]) => void;
  onAddRow: () => void;
  onAddRows: (count: number) => Promise<void> | void;
  onDeleteRow: (rowId: string) => void;
  onRenameField: (fieldId: string, name: string) => void;
  onChangeFieldType: (fieldId: string, type: FieldType) => void;
  onAddField: () => void;
  onDeleteField: (fieldId: string) => void;
};

type Cursor = { r: number; c: number };

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "checkbox", label: "Checkbox" },
  { value: "select", label: "Select" },
  { value: "date", label: "Date" },
  { value: "url", label: "Link" },
];

function rawToInput(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "boolean") return raw ? "TRUE" : "FALSE";
  return String(raw);
}

function parseInputValue(draft: string, type: FieldType): unknown {
  const trimmed = draft.trim();
  if (trimmed === "") return null;
  if (isFormula(trimmed)) return trimmed;
  if (type === "checkbox") return /^(true|1|x|yes|ja)$/i.test(trimmed);
  if (type === "number") {
    const numeric = Number(trimmed.replace(",", "."));
    return Number.isNaN(numeric) ? trimmed : numeric;
  }
  return draft;
}

export function DataGrid({
  fields,
  rows,
  onCommitCell,
  onCommitCells,
  onAddRow,
  onAddRows,
  onDeleteRow,
  onRenameField,
  onChangeFieldType,
  onAddField,
  onDeleteField,
}: DataGridProps) {
  const [cursor, setCursor] = useState<Cursor>({ r: 0, c: 0 });
  const [anchor, setAnchor] = useState<Cursor>({ r: 0, c: 0 });
  const [editing, setEditing] = useState<{ r: number; c: number; draft: string } | null>(null);
  const [formulaDraft, setFormulaDraft] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLInputElement>(null);

  const evaluator = useMemo(
    () =>
      createEvaluator({
        rowCount: rows.length,
        colCount: fields.length,
        raw: (r, c) => {
          const row = rows[r];
          const field = fields[c];
          if (!row || !field) return null;
          return row.data[field.id] ?? null;
        },
      }),
    [rows, fields],
  );

  const safeCursor = useMemo<Cursor>(
    () => ({
      r: Math.min(cursor.r, Math.max(rows.length - 1, 0)),
      c: Math.min(cursor.c, Math.max(fields.length - 1, 0)),
    }),
    [cursor, rows.length, fields.length],
  );

  const range = useMemo(() => {
    return {
      r1: Math.min(safeCursor.r, anchor.r),
      r2: Math.max(safeCursor.r, anchor.r),
      c1: Math.min(safeCursor.c, anchor.c),
      c2: Math.max(safeCursor.c, anchor.c),
    };
  }, [safeCursor, anchor]);

  const activeRow = rows[safeCursor.r];
  const activeField = fields[safeCursor.c];
  const activeRaw = activeRow && activeField ? activeRow.data[activeField.id] : null;

  useEffect(() => {
    setFormulaDraft(null);
  }, [safeCursor.r, safeCursor.c, activeRaw]);

  useEffect(() => {
    if (editing) editorRef.current?.focus();
  }, [editing]);

  const cellValue = useCallback((r: number, c: number): EvalResult => evaluator.cell(r, c), [evaluator]);

  const commit = useCallback(
    (r: number, c: number, draft: string) => {
      const row = rows[r];
      const field = fields[c];
      if (!row || !field) return;
      const next = parseInputValue(draft, field.type);
      const current = row.data[field.id] ?? null;
      if (next === current) return;
      onCommitCell(row.id, field.id, next);
    },
    [rows, fields, onCommitCell],
  );

  const startEdit = (r: number, c: number, initial?: string) => {
    const row = rows[r];
    const field = fields[c];
    if (!row || !field) return;
    if (field.type === "checkbox") {
      onCommitCell(row.id, field.id, !(row.data[field.id] === true));
      return;
    }
    setEditing({ r, c, draft: initial ?? rawToInput(row.data[field.id]) });
  };

  const move = (dr: number, dc: number, extend = false) => {
    const r = Math.min(Math.max(safeCursor.r + dr, 0), Math.max(rows.length - 1, 0));
    const c = Math.min(Math.max(safeCursor.c + dc, 0), Math.max(fields.length - 1, 0));
    setCursor({ r, c });
    if (!extend) setAnchor({ r, c });
    gridRef.current?.focus();
  };

  const selectCell = (r: number, c: number, extend = false) => {
    setCursor({ r, c });
    if (!extend) setAnchor({ r, c });
    gridRef.current?.focus();
  };

  const clearRange = () => {
    const updates: { rowId: string; values: Record<string, unknown> }[] = [];
    for (let r = range.r1; r <= range.r2; r += 1) {
      const row = rows[r];
      if (!row) continue;
      const values: Record<string, unknown> = { ...row.data };
      for (let c = range.c1; c <= range.c2; c += 1) {
        const field = fields[c];
        if (field) values[field.id] = null;
      }
      updates.push({ rowId: row.id, values });
    }
    if (updates.length) onCommitCells(updates);
  };

  const copyRange = async () => {
    const lines: string[] = [];
    for (let r = range.r1; r <= range.r2; r += 1) {
      const cells: string[] = [];
      for (let c = range.c1; c <= range.c2; c += 1) {
        cells.push(formatValue(cellValue(r, c)));
      }
      lines.push(cells.join("\t"));
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Copied");
    } catch {
      toast.error("Clipboard is not available");
    }
  };

  const pasteFromClipboard = async () => {
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch {
      toast.error("Clipboard is not available");
      return;
    }
    if (!text) return;
    const matrix = text
      .replace(/\r/g, "")
      .split("\n")
      .filter((line, index, all) => line !== "" || index < all.length - 1)
      .map((line) => line.split("\t"));

    const needed = safeCursor.r + matrix.length - rows.length;
    if (needed > 0) {
      await onAddRows(needed);
      toast.info(`${needed} new record${needed > 1 ? "s" : ""} added — paste again to fill them`);
      return;
    }

    const updates: { rowId: string; values: Record<string, unknown> }[] = [];
    matrix.forEach((line, rowOffset) => {
      const row = rows[safeCursor.r + rowOffset];
      if (!row) return;
      const values: Record<string, unknown> = { ...row.data };
      line.forEach((cell, colOffset) => {
        const field = fields[safeCursor.c + colOffset];
        if (field) values[field.id] = parseInputValue(cell, field.type);
      });
      updates.push({ rowId: row.id, values });
    });
    if (updates.length) onCommitCells(updates);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (editing) return;
    const meta = event.metaKey || event.ctrlKey;
    if (meta && event.key.toLowerCase() === "c") {
      event.preventDefault();
      void copyRange();
      return;
    }
    if (meta && event.key.toLowerCase() === "v") {
      event.preventDefault();
      void pasteFromClipboard();
      return;
    }
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        move(-1, 0, event.shiftKey);
        return;
      case "ArrowDown":
        event.preventDefault();
        move(1, 0, event.shiftKey);
        return;
      case "ArrowLeft":
        event.preventDefault();
        move(0, -1, event.shiftKey);
        return;
      case "ArrowRight":
        event.preventDefault();
        move(0, 1, event.shiftKey);
        return;
      case "Tab":
        event.preventDefault();
        move(0, event.shiftKey ? -1 : 1);
        return;
      case "Enter":
      case "F2":
        event.preventDefault();
        startEdit(safeCursor.r, safeCursor.c);
        return;
      case "Backspace":
      case "Delete":
        event.preventDefault();
        clearRange();
        return;
      default:
        break;
    }
    if (!meta && event.key.length === 1) {
      event.preventDefault();
      startEdit(safeCursor.r, safeCursor.c, event.key);
    }
  };

  const finishEditing = (mode: "down" | "right" | "stay") => {
    if (!editing) return;
    commit(editing.r, editing.c, editing.draft);
    setEditing(null);
    if (mode === "down") move(1, 0);
    else if (mode === "right") move(0, 1);
    else gridRef.current?.focus();
  };

  const selectionStats = useMemo(() => {
    const values: number[] = [];
    let filled = 0;
    for (let r = range.r1; r <= range.r2; r += 1) {
      for (let c = range.c1; c <= range.c2; c += 1) {
        const value = cellValue(r, c);
        if (isErrorValue(value) || value === null || value === "") continue;
        filled += 1;
        if (typeof value === "number") values.push(value);
      }
    }
    const sum = values.reduce((total, value) => total + value, 0);
    return {
      count: filled,
      sum,
      average: values.length ? sum / values.length : null,
      numeric: values.length,
    };
  }, [range, cellValue]);

  const rangeLabel =
    range.r1 === range.r2 && range.c1 === range.c2
      ? `${columnLabel(range.c1)}${range.r1 + 1}`
      : `${columnLabel(range.c1)}${range.r1 + 1}:${columnLabel(range.c2)}${range.r2 + 1}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{rangeLabel}</span>
        <span className="text-muted-foreground">ƒx</span>
        <input
          value={formulaDraft ?? rawToInput(activeRaw)}
          placeholder="Value or =SUM(A1:A5)"
          onChange={(event) => setFormulaDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (formulaDraft !== null) commit(safeCursor.r, safeCursor.c, formulaDraft);
              setFormulaDraft(null);
              move(1, 0);
            }
            if (event.key === "Escape") {
              setFormulaDraft(null);
              gridRef.current?.focus();
            }
          }}
          onBlur={() => {
            if (formulaDraft !== null) commit(safeCursor.r, safeCursor.c, formulaDraft);
            setFormulaDraft(null);
          }}
          className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none"
        />
      </div>

      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="panel overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <table className="w-full border-collapse text-sm select-none">
          <thead>
            <tr className="bg-muted/60">
              <th className="sticky left-0 z-10 w-12 border-b border-r border-border bg-muted/60 px-2 py-1 text-xs font-normal text-muted-foreground">
                #
              </th>
              {fields.map((field, index) => (
                <th
                  key={field.id}
                  className={cn(
                    "min-w-40 border-b border-r border-border px-2 py-1 text-left align-bottom",
                    index >= range.c1 && index <= range.c2 && "bg-accent/30",
                  )}
                >
                  <div className="flex items-center justify-between gap-1 text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
                    <span className="font-mono">{columnLabel(index)}</span>
                    <div className="flex items-center gap-1">
                      <Select
                        value={field.type}
                        onValueChange={(value) => onChangeFieldType(field.id, value as FieldType)}
                      >
                        <SelectTrigger className="h-6 w-24 border-none bg-transparent px-1 text-[10px] shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value} className="text-xs">
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fields.length > 1 && (
                        <button
                          aria-label={`Delete column ${field.name}`}
                          className="rounded p-0.5 hover:text-destructive"
                          onClick={() => onDeleteField(field.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    defaultValue={field.name}
                    key={`${field.id}-${field.name}`}
                    onBlur={(event) => {
                      const next = event.target.value.trim();
                      if (next && next !== field.name) onRenameField(field.id, next);
                      else event.target.value = field.name;
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    className="w-full bg-transparent text-sm font-medium outline-none"
                  />
                </th>
              ))}
              <th className="w-24 border-b border-border px-2 py-1 text-left">
                <button
                  onClick={onAddField}
                  className="flex items-center gap-1 rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                >
                  <Plus className="h-3 w-3" /> Column
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={fields.length + 2} className="px-3 py-6 text-muted-foreground">
                  No records yet.
                </td>
              </tr>
            )}
            {rows.map((row, r) => (
              <tr key={row.id} className="group">
                <td className="sticky left-0 z-10 border-b border-r border-border bg-muted/40 px-2 py-1 text-center font-mono text-xs text-muted-foreground">
                  {r + 1}
                </td>
                {fields.map((field, c) => {
                  const selected = r >= range.r1 && r <= range.r2 && c >= range.c1 && c <= range.c2;
                  const isCursor = r === safeCursor.r && c === safeCursor.c;
                  const isEditing = editing?.r === r && editing?.c === c;
                  const value = cellValue(r, c);
                  const raw = row.data[field.id];
                  return (
                    <td
                      key={field.id}
                      onMouseDown={(event) => selectCell(r, c, event.shiftKey)}
                      onDoubleClick={() => startEdit(r, c)}
                      className={cn(
                        "relative h-8 border-b border-r border-border px-2 align-middle",
                        selected && "bg-accent/20",
                        isCursor && "ring-2 ring-inset ring-primary",
                        isErrorValue(value) && "text-destructive",
                      )}
                    >
                      {isEditing ? (
                        field.type === "select" ? (
                          <Select
                            defaultOpen
                            value={typeof raw === "string" ? raw : ""}
                            onValueChange={(next) => {
                              onCommitCell(row.id, field.id, next);
                              setEditing(null);
                              gridRef.current?.focus();
                            }}
                          >
                            <SelectTrigger className="h-7 border-none bg-transparent px-0 text-sm shadow-none">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {(field.options.choices ?? []).map((choice) => (
                                <SelectItem key={choice} value={choice}>
                                  {choice}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <input
                            ref={editorRef}
                            value={editing.draft}
                            type={field.type === "date" ? "date" : "text"}
                            onChange={(event) => setEditing({ r, c, draft: event.target.value })}
                            onBlur={() => finishEditing("stay")}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                finishEditing("down");
                              } else if (event.key === "Tab") {
                                event.preventDefault();
                                finishEditing("right");
                              } else if (event.key === "Escape") {
                                event.preventDefault();
                                setEditing(null);
                                gridRef.current?.focus();
                              }
                            }}
                            className="absolute inset-0 w-full bg-card px-2 font-mono text-sm outline-none ring-2 ring-inset ring-primary"
                          />
                        )
                      ) : field.type === "checkbox" ? (
                        <input
                          type="checkbox"
                          checked={raw === true}
                          onChange={(event) => onCommitCell(row.id, field.id, event.target.checked)}
                          className="h-4 w-4 accent-[hsl(var(--primary))]"
                        />
                      ) : (
                        <span
                          className={cn(
                            "block truncate",
                            field.type === "number" && "text-right font-mono",
                            isFormula(raw) && "font-mono",
                          )}
                        >
                          {formatValue(value)}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="border-b border-border px-2">
                  <button
                    aria-label="Delete record"
                    className="rounded p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                    onClick={() => onDeleteRow(row.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={onAddRow}
          className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40"
        >
          <Plus className="h-4 w-4" /> New record
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-1 text-xs text-muted-foreground">
        <span>{rows.length} records</span>
        <span>Filled: {selectionStats.count}</span>
        {selectionStats.numeric > 0 && (
          <>
            <span>Sum: {formatValue(selectionStats.sum)}</span>
            <span>Average: {formatValue(selectionStats.average)}</span>
          </>
        )}
        <span className="ml-auto">
          Type to edit · Enter/Tab to move · ⌘/Ctrl+C / V copy &amp; paste · start with = for formulas
        </span>
      </div>
    </div>
  );
}
