import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Target, Sparkles, Flame } from "lucide-react";
import { getLocalData } from "@/lib/storage-sync";

export interface SkillCategory {
  id: string;
  category_name: string;
  total_time_minutes: number;
}

const SKILL_LEVELS = {
  BEGINNER: { hours: 20, label: "Grundlagen (20h)", icon: Sparkles },
  INTERMEDIATE: { hours: 100, label: "Kompetent (100h)", icon: Target },
  EXPERT: { hours: 1000, label: "Meisterschaft (1000h)", icon: Trophy },
};

export const SkillProgress = () => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["skill-categories"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("skill_categories")
          .select("*")
          .order("total_time_minutes", { ascending: false });

        if (!error && data && data.length > 0) {
          return data as SkillCategory[];
        }
      } catch {
        // Fallback to local
      }

      const local = getLocalData<SkillCategory[]>("spark_skill_categories" as any, [
        { id: "1", category_name: "Web-Development & React", total_time_minutes: 185 },
        { id: "2", category_name: "KI & Agentic Workflows", total_time_minutes: 320 },
        { id: "3", category_name: "System-Design & Cloud", total_time_minutes: 65 },
        { id: "4", category_name: "Trading & Finanzen", total_time_minutes: 90 },
      ]);
      return local;
    },
  });

  const getSkillLevel = (minutes: number) => {
    const hours = minutes / 60;
    if (hours < SKILL_LEVELS.BEGINNER.hours) {
      return {
        current: "Lernend",
        next: SKILL_LEVELS.BEGINNER,
        progress: (hours / SKILL_LEVELS.BEGINNER.hours) * 100,
        hoursToNext: Math.max(0, SKILL_LEVELS.BEGINNER.hours - hours),
      };
    } else if (hours < SKILL_LEVELS.INTERMEDIATE.hours) {
      return {
        current: SKILL_LEVELS.BEGINNER.label,
        next: SKILL_LEVELS.INTERMEDIATE,
        progress:
          ((hours - SKILL_LEVELS.BEGINNER.hours) /
            (SKILL_LEVELS.INTERMEDIATE.hours - SKILL_LEVELS.BEGINNER.hours)) *
          100,
        hoursToNext: Math.max(0, SKILL_LEVELS.INTERMEDIATE.hours - hours),
      };
    } else if (hours < SKILL_LEVELS.EXPERT.hours) {
      return {
        current: SKILL_LEVELS.INTERMEDIATE.label,
        next: SKILL_LEVELS.EXPERT,
        progress:
          ((hours - SKILL_LEVELS.INTERMEDIATE.hours) /
            (SKILL_LEVELS.EXPERT.hours - SKILL_LEVELS.INTERMEDIATE.hours)) *
          100,
        hoursToNext: Math.max(0, SKILL_LEVELS.EXPERT.hours - hours),
      };
    }
    return {
      current: SKILL_LEVELS.EXPERT.label,
      next: null,
      progress: 100,
      hoursToNext: 0,
    };
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <Card className="border-dashed border-border bg-card/40">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          <p>Noch keine Skill-Kategorien erfasst.</p>
          <p className="text-xs mt-1 text-muted-foreground/80">
            Schaue Fokus-Videos, um Lernzeit automatisch deinen Skills zuzuordnen.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {categories.map((category) => {
        const skillLevel = getSkillLevel(category.total_time_minutes);
        const hours = Math.floor(category.total_time_minutes / 60);
        const minutes = category.total_time_minutes % 60;
        const Icon = skillLevel.next?.icon || Trophy;

        return (
          <Card key={category.id} className="border-border/70 bg-card/60 backdrop-blur-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-semibold truncate text-foreground">
                  {category.category_name}
                </CardTitle>
                <div className="p-1 rounded-md bg-primary/10 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-foreground">
                  {hours}h {minutes}m
                </span>
                <span className="text-muted-foreground text-[11px]">{skillLevel.current}</span>
              </div>

              <div className="space-y-1">
                <Progress value={skillLevel.progress} className="h-1.5" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{Math.round(skillLevel.progress)}%</span>
                  {skillLevel.next && (
                    <span>Noch {Math.ceil(skillLevel.hoursToNext)}h bis {skillLevel.next.label}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
