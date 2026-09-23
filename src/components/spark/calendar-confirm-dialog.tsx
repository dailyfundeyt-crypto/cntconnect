import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { GoogleCalendarEvent } from "@/lib/google-calendar";

interface CalendarConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Omit<GoogleCalendarEvent, "id"> | null;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function CalendarConfirmDialog({
  open,
  onOpenChange,
  event,
  onConfirm,
  isSubmitting = false,
}: CalendarConfirmDialogProps) {
  if (!event) return null;

  const startDate = new Date(event.start.dateTime);
  const endDate = new Date(event.end.dateTime);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const formatDate = (d: Date) =>
    d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-float">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-display font-semibold text-lg">
            <Calendar className="h-5 w-5 text-accent" />
            <span>Google Kalender Bestätigung</span>
          </div>
          <DialogDescription className="text-muted-foreground text-sm">
            Eintrag wird erst nach deiner Bestätigung in deinen primären Google Kalender geschrieben. Keine automatischen oder stummen Schreibvorgänge.
          </DialogDescription>
        </DialogHeader>

        <div className="my-3 rounded-lg border border-border/70 bg-secondary/40 p-4 space-y-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Titel</div>
            <div className="text-base font-medium text-foreground">{event.summary}</div>
          </div>

          <div className="flex items-center gap-4 text-sm text-foreground/80">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(startDate)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {formatTime(startDate)} – {formatTime(endDate)}
              </span>
            </div>
          </div>

          {event.description && (
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Notizen / Details</div>
              <div className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line mt-1">
                {event.description}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="bg-primary text-primary-foreground hover:opacity-90"
          >
            {isSubmitting ? "Wird eingetragen..." : "Eintrag bestätigen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
