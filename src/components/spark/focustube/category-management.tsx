import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Pencil, Check, X, Tag } from "lucide-react";
import { toast } from "sonner";
import { getLocalData, setLocalAndSyncData } from "@/lib/storage-sync";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  category_name: string;
  total_time_minutes: number;
}

export const CategoryManagement = () => {
  const [newCategory, setNewCategory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ["skill-categories"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("skill_categories")
          .select("*")
          .order("category_name");
        if (!error && data && data.length > 0) return data as Category[];
      } catch {
        // local fallback
      }

      return getLocalData<Category[]>("spark_skill_categories" as any, [
        { id: "1", category_name: "Web-Development & React", total_time_minutes: 185 },
        { id: "2", category_name: "KI & Agentic Workflows", total_time_minutes: 320 },
        { id: "3", category_name: "System-Design & Cloud", total_time_minutes: 65 },
        { id: "4", category_name: "Trading & Finanzen", total_time_minutes: 90 },
      ]);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    const current = categories || [];
    const newItem: Category = {
      id: crypto.randomUUID(),
      category_name: newCategory.trim(),
      total_time_minutes: 0,
    };
    const updated = [...current, newItem];
    setLocalAndSyncData("spark_skill_categories" as any, updated);
    queryClient.invalidateQueries({ queryKey: ["skill-categories"] });
    setNewCategory("");
    toast.success(`Kategorie "${newItem.category_name}" erstellt!`);
  };

  const handleDelete = (id: string) => {
    const current = categories || [];
    const updated = current.filter((c) => c.id !== id);
    setLocalAndSyncData("spark_skill_categories" as any, updated);
    queryClient.invalidateQueries({ queryKey: ["skill-categories"] });
    toast.success("Kategorie gelöscht");
  };

  const handleSaveEdit = (id: string) => {
    if (!editingName.trim()) return;
    const current = categories || [];
    const updated = current.map((c) => (c.id === id ? { ...c, category_name: editingName.trim() } : c));
    setLocalAndSyncData("spark_skill_categories" as any, updated);
    queryClient.invalidateQueries({ queryKey: ["skill-categories"] });
    setEditingId(null);
    setEditingName("");
    toast.success("Kategorie umbenannt");
  };

  return (
    <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <Tag className="h-4 w-4 text-primary" /> Lern-Kategorien verwalten
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            placeholder="Neue Kategorie (z. B. Machine Learning)..."
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="text-xs h-9"
          />
          <Button type="submit" size="sm" className="h-9 gap-1 text-xs whitespace-nowrap">
            <Plus className="h-3.5 w-3.5" /> Hinzufügen
          </Button>
        </form>

        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {(categories || []).map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-xs"
            >
              {editingId === cat.id ? (
                <div className="flex items-center gap-1.5 flex-1 mr-2">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="h-7 text-xs"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveEdit(cat.id)}>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <span className="font-medium text-foreground">{cat.category_name}</span>
              )}

              {editingId !== cat.id && (
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditingId(cat.id);
                      setEditingName(cat.category_name);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(cat.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
