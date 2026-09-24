import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, ExternalLink, Lock, Mail, ShieldCheck, Sparkles, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SparkWordmark } from "@/components/spark/logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { next?: string } => {
    const next = search["next"];
    return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? { next }
      : {};
  },
  head: () => ({
    meta: [
      { title: "Anmelden — Spark" },
      {
        name: "description",
        content: "Melde dich bei Spark mit deinem Google-Konto oder E-Mail an.",
      },
      { property: "og:title", content: "Anmelden — Spark" },
      { property: "og:description", content: "Öffne deinen persönlichen Spark Workspace." },
    ],
  }),
  component: AuthPage,
});

// Same convention as app.plan.tsx: on localhost use the dedicated local OAuth client,
// everywhere else (deployed) the web client.
const IS_LOCALHOST =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const GOOGLE_CLIENT_ID = IS_LOCALHOST
  ? (import.meta.env["VITE_GOOGLE_LOCAL_CLIENT_ID"] as string | undefined) ||
    "191673675014-kppmek9blvhu7l9d4dd9nq6e5fugqivl.apps.googleusercontent.com"
  : (import.meta.env["VITE_GOOGLE_WEB_CLIENT_ID"] as string | undefined) ||
    "191673675014-002k6i88eo0epect8v6gqfshaab43d8l.apps.googleusercontent.com";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const nextTarget = search.next || "/app";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentConfirm, setSentConfirm] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showOriginHelp, setShowOriginHelp] = useState(false);

  useEffect(() => {
    // 1. Check existing Supabase session
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: nextTarget });
      }
    });

    // 2. Check existing Google local session
    if (typeof window !== "undefined") {
      const existingGoogleUser = window.localStorage.getItem("spark_google_user");
      if (existingGoogleUser) {
        navigate({ to: nextTarget });
      }
    }
  }, [navigate, nextTarget]);

  // Load Google Identity Services Script dynamically
  function loadGsiScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      const existing = document.getElementById("google-gsi-script");
      if (existing) {
        existing.onload = () => resolve();
        return;
      }
      const script = document.createElement("script");
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Konnte Google Auth Script nicht laden"));
      document.head.appendChild(script);
    });
  }

  // Google Sign-In via Lovable Cloud managed OAuth
  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      window.sessionStorage.setItem("spark_auth_next", nextTarget);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (result.error) {
        toast.error("Google-Anmeldung fehlgeschlagen: " + (result.error.message ?? String(result.error)));
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      toast.success("Mit Google angemeldet!");
      navigate({ to: nextTarget });
    } catch (err: any) {
      toast.error(err?.message || "Google-Anmeldung fehlgeschlagen");
      setGoogleLoading(false);
    }
  }

  async function handleDevGoogleLogin() {
    await handleGoogleSignIn();
  }


  // Standard Email/Password Form
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSentConfirm(true);
          return;
        }
        toast.success("Konto erfolgreich erstellt!");
        navigate({ to: nextTarget });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Erfolgreich angemeldet!");
        navigate({ to: nextTarget });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Anmeldung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grain-bg flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex justify-center">
          <SparkWordmark />
        </Link>

        {sentConfirm ? (
          <div className="panel p-6 text-center space-y-3 shadow-panel border border-border">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
            <h1 className="text-lg font-semibold text-foreground">Bestätigung gesendet</h1>
            <p className="text-sm text-muted-foreground">
              Wir haben einen Aktivierungslink an <strong>{email}</strong> gesendet. Klicke auf den
              Link in deiner E-Mail, um deinen Workspace zu öffnen.
            </p>
          </div>
        ) : (
          <div className="panel p-6 shadow-panel border border-border bg-card rounded-xl space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent mb-2">
                <Sparkles className="h-3 w-3" /> Privater Workspace
              </div>
              <h1 className="text-xl font-display font-semibold text-foreground">
                {mode === "signin" ? "Willkommen zurück" : "Workspace erstellen"}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Dokumente, Tabellen, Notizen und Gesundheitsprotokolle bleiben privat.
              </p>
            </div>

            {/* Google Sign-In Button */}
            <div className="space-y-2.5">
              <Button
                type="button"
                variant="outline"
                className="w-full py-5 text-xs font-medium gap-2.5 border-border hover:bg-secondary/60 shadow-sm transition-all"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                <GoogleIcon />
                <span>
                  {googleLoading
                    ? "Google wird verbunden…"
                    : "Mit Google fortfahren"}
                </span>
              </Button>

              {/* 1-Click Instant Login for local development */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full py-2.5 text-[11px] font-medium gap-1.5 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
                onClick={handleDevGoogleLogin}
                disabled={googleLoading}
                title="Meldet dich sofort mit dailyfunde.yt@gmail.com an, ohne Google Cloud Konfiguration abzuwarten"
              >
                <span>⚡ Als dailyfunde.yt@gmail.com anmelden (Sofort-Start)</span>
              </Button>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Google Kalender Sync</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOriginHelp((prev) => !prev)}
                  className="text-accent underline underline-offset-2 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  {showOriginHelp ? "Hilfe schließen" : "Fehler 401 Hilfe"}
                </button>
              </div>

              {/* Collapsible Origin Helper */}
              {showOriginHelp && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] space-y-2 text-foreground/90 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>Google Fehler: „no registered origin“ beheben</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Google blockiert Anmeldungen von URLs, die noch nicht in der Google Cloud Console hinterlegt sind:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Öffne deine Google Cloud Console.</li>
                    <li>
                      Gehe zu <strong>APIs & Dienste ➔ Anmeldedaten</strong>.
                    </li>
                    <li>Wähle deinen Web-Client aus.</li>
                    <li>
                      Füge unter <strong>Autorisierte JavaScript-Ursprünge</strong> hinzu:
                      <div className="mt-1 font-mono text-[10px] bg-secondary p-1 rounded border border-border select-all">
                        http://localhost:43123
                      </div>
                    </li>
                    <li>Klicke auf <strong>Speichern</strong> (dauert ca. 1–2 Min.).</li>
                  </ol>
                  <a
                    href="https://console.cloud.google.com/apis/credentials?project=project-50cff6d8-5dc7-46c9-aed"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-accent font-medium hover:underline pt-1"
                  >
                    <span>Google Cloud Console aufrufen</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>oder mit E-Mail</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">
                    Vollständiger Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Max Mustermann"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">
                  E-Mail-Adresse
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="name@beispiel.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">
                  Passwort
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full text-xs font-medium py-5" disabled={busy}>
                {mode === "signin" ? "Mit E-Mail anmelden" : "Konto erstellen"}
              </Button>
            </form>

            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin"
                ? "Noch kein Konto? Jetzt registrieren"
                : "Bereits ein Konto? Anmelden"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
