import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Lock, Mail, ShieldCheck, Sparkles, User } from "lucide-react";

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

const GOOGLE_CLIENT_ID =
  (import.meta.env["VITE_GOOGLE_WEB_CLIENT_ID"] as string | undefined) ||
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

  // Google Sign-In Handler
  async function handleGoogleSignIn() {
    setGoogleLoading(true);

    try {
      await loadGsiScript();

      if (!window.google?.accounts?.oauth2) {
        // Fallback to Supabase OAuth redirect if GIS library is blocked
        await fallbackSupabaseOAuth();
        return;
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope:
          "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
        callback: async (tokenResponse: {
          access_token?: string;
          error?: string;
          expires_in?: number;
        }) => {
          if (tokenResponse.error || !tokenResponse.access_token) {
            setGoogleLoading(false);
            if (tokenResponse.error !== "access_denied") {
              toast.error("Google-Anmeldung abgebrochen oder fehlgeschlagen.");
            }
            return;
          }

          const accessToken = tokenResponse.access_token;
          const expiresIn = tokenResponse.expires_in || 3600;

          // 1. Save Calendar & API Token
          window.localStorage.setItem("spark_gcal_token", accessToken);
          window.localStorage.setItem(
            "spark_gcal_token_expiry",
            (Date.now() + expiresIn * 1000).toString()
          );

          // 2. Fetch User Profile from Google UserInfo endpoint
          try {
            const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (!res.ok) throw new Error("Konnte Google-Profildaten nicht abrufen");

            const profile = await res.json();
            const googleUser = {
              id: profile.sub || crypto.randomUUID(),
              sub: profile.sub,
              email: profile.email,
              name: profile.name || profile.given_name || "Google Nutzer",
              picture: profile.picture,
              email_verified: profile.email_verified,
            };

            // Save authenticated Google user session locally
            window.localStorage.setItem("spark_google_user", JSON.stringify(googleUser));

            // 3. Sync to Supabase in the background (create or sign in user)
            const deterministicPass = `SparkGoogle_${profile.sub || "user"}_Sec!99`;
            try {
              const { error: signInErr } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password: deterministicPass,
              });

              if (signInErr) {
                // Account does not exist yet -> create account
                await supabase.auth.signUp({
                  email: profile.email,
                  password: deterministicPass,
                  options: {
                    data: {
                      full_name: googleUser.name,
                      avatar_url: googleUser.picture,
                    },
                  },
                });
              }
            } catch {
              // Supabase background sync error is non-fatal since local session is active
            }

            toast.success(`Willkommen, ${googleUser.name}! Mit Google angemeldet.`);
            navigate({ to: nextTarget });
          } catch (profileErr: any) {
            console.error("Profile fetch error:", profileErr);
            toast.error("Fehler beim Abrufen des Google-Profils: " + profileErr.message);
          } finally {
            setGoogleLoading(false);
          }
        },
      });

      client.requestAccessToken({ prompt: "consent" });
    } catch (err: any) {
      console.warn("Direct GIS popup failed, trying Supabase OAuth redirect:", err);
      await fallbackSupabaseOAuth();
    }
  }

  // Fallback: Standard Supabase OAuth Redirect
  async function fallbackSupabaseOAuth() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${nextTarget}`,
        },
      });

      if (error) {
        const lovableResult = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: `${window.location.origin}${nextTarget}`,
        });
        if (lovableResult.error) {
          toast.error("Google-Anmeldung fehlgeschlagen: " + (error.message || lovableResult.error));
          setGoogleLoading(false);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Google-Anmeldung fehlgeschlagen");
      setGoogleLoading(false);
    }
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
            <div className="space-y-2">
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
              <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Inklusive Google Kalender Synchronisation</span>
              </div>
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
