# RBAC-Bericht — Echtes Agenten-RBAC für Spark/MCP

**Stand:** 5. Oktober 2026, 19:00 Uhr
**Agent:** generalPurpose (Subagent)
**Code-Änderungen:** 4 Dateien (1 NEU, 3 GEÄNDERT)

> **Hinweis zu Tool-Zahlen:** Der ursprüngliche Bericht sprach von 18 Tools.
> Tatsächlich sind es 16 — Manifest (`mcp.tools[].length`) und Code
> (`src/lib/mcp/index.ts:65-80`) führen beide 16. 11 mit `requiredRole: readonly`,
> 5 mit `requiredRole: editor`.

---

## 1. Wie Tool-Registrierung und Auth-Fluss heute funktionieren

### Tool-Registrierung (`src/lib/mcp/index.ts:29-52`)

Das MCP-Server-Modul exportiert ein einzelnes `defineMcp({...})`-Objekt. Die
`tools`-Property ist ein Array von Tool-Modulen, die jeweils `defineTool({ name, handler, inputSchema, annotations })` aufrufen. Kein Tool kennt seine Rolle — jedes Modul ist selbst-contained.

**Auth-Fluss im Detail:**

```
Externer Agent
    │
    ├──> OAuth 2.0 / PKCE → Supabase Auth vktilvpwbhrddjytilvs
    │                        (Issuer: https://vktilvpwbhrddjytilvs.supabase.co/auth/v1)
    └──> Bearer Token mit aud="authenticated"
MCP-Framework (@lovable.dev/mcp-js)
    │
    └──> ctx.getToken() liefert das verifizierte JWT
Handler in tools/*.ts
    │
    └──> supabaseForUser(ctx) → Supabase-Client mit Bearer-Token
RLS in Supabase
    │
    └──> auth.uid() = OAuth subject → filtert nach user_id
```

Das Problem: Jeder authentifizierte Agent bekommt denselben Supabase-Client mit
`auth.uid() = seine OAuth-Subject`. RLS schützt nur nach `user_id` — aber ein
Agent ist kein User. Alle 16 Tools waren für jeden Agenten ohne Unterscheidung
verfügbar.

---

## 2. Neue und geänderte Dateien

| Datei | Art | Begründung |
|---|---|---|
| `supabase/migrations/20261005210000_agent_rbac.sql` | **NEU** | 3 Tabellen + RLS + Indizes + Seed |
| `src/lib/mcp/supabase.ts` | **GEÄNDERT** | `resolveAllowedTools()`, `requireToolAccess()` ergänzt |
| `src/lib/mcp/index.ts` | **GEÄNDERT** | `withRbac()`-Wrapper um alle 16 Handler |
| `.lovable/mcp/manifest.json` | **GEÄNDERT** | `requiredRole` + `scopes` je Tool |

Keine Tool-Implementierung wurde angefasst. Keine `brain_*`-Tabelle berührt.

---

## 3. Serverseitige Blockierung

**Blockierungspunkt 1 — Handler-Ebene** (`src/lib/mcp/index.ts:27-36`):

```typescript
const guardedHandler = (async (args: unknown, ctx: ToolContext) => {
    await requireToolAccess(ctx, toolName);
    return originalHandler(args, ctx);
  }) as THandler;
```

Jeder `defineTool`-Handler wird durch `withRbac()` gewickelt. **Bevor** der
Original-Handler je aufgerufen wird, prüft `requireToolAccess()` die Rolle.
Das ist kein Manifest-Filter — der Agent kann den Tool-Namen in seinem Request
senden und bekommt eine `ToolError`-Exception zurück.

**Blockierungspunkt 2 — Revocation** (`src/lib/mcp/supabase.ts:185-186`):

```typescript
if (agent?.revoked_at) return new Set();
```

Ein gesperrter Agent bekommt eine leere Tool-Menge — alle 16 Aufrufe werden geblockt.

**Blockierungspunkt 3 — Fail-Closed bei DB-Fehlern** (`src/lib/mcp/supabase.ts:183,199,222`):

```typescript
if (agentErr) { console.error("[RBAC] agent_registry lookup failed:", agentErr.message); return new Set(); }
```

Jeder Supabase-Fehler in der RBAC-Kette liefert eine leere Menge — sicherer Default.

**Warum das nicht kosmetisch ist:** Der Agent könnte das Manifest laden und alle
16 Tools sehen. Sobald er aber `create_document` aufruft, löst
`resolveAllowedTools()` die Rolle auf, findet kein `editor`-Recht und wirft
`ToolError: Access denied`. Kein Rewrite des Manifests nötig — die Ausführung
ist serverseitig unterbrochen.

---

## 4. Rollenmodell

| Tool | readonly | editor | admin |
|---|---|---|---|
| `search_workspace` | ja | ja | ja |
| `list_spaces` | ja | ja | ja |
| `list_documents` | ja | ja | ja |
| `get_document` | ja | ja | ja |
| `create_document` | nein | ja | ja |
| `update_document` | nein | ja | ja |
| `list_tables` | ja | ja | ja |
| `get_table` | ja | ja | ja |
| `create_table_row` | nein | ja | ja |
| `search_notes` | ja | ja | ja |
| `get_note` | ja | ja | ja |
| `get_brain_context` | ja | ja | ja |
| `list_tasks` | ja | ja | ja |
| `toggle_task` | nein | ja | ja |
| `log_mood` | nein | ja | ja |
| `get_agenda` | ja | ja | ja |

**Scopes-Vocabulary:** `read:workspace`, `write:documents`, `read:tables`, `write:tables`, `read:brain`, `write:brain`

---

## 5. Unbekannte Rolle — konkreter Code-Pfad

```
Agent mit OAuth-Token, aber KEIN Eintrag in agent_registry
    │
    └──> resolveAllowedTools() Zeile 175
const { data: agent } = await supabase.from("agent_registry")...
    │
    └──> agent = null (nicht gefunden)
    └──> agent?.role_id → undefined  (Zeile 189)
let roleId: string | undefined = agent?.role_id ?? undefined;
    │
    └──> roleId ist undefined → if (!roleId)
    └──> Zeile 191
const { data: readonlyRole } = await supabase.from("agent_roles").eq("name", "readonly")...
    │
    └──> readonlyRole gefunden → roleId = readonlyRole.id
    │
    └──> Zeile 200: resolvedRoleId = "readonly-uuid"
    └──> role lookup + tool lookup
    └──> return Set mit 11 read-only Tools
```

Der unbekannte Agent darf `search_workspace`, `get_note`, `list_tasks` — aber
NICHT `create_document`. **Fail-closed auf Vollzugriff, nicht fail-open.**

---

## 6. tsc + Build: Vorher/Nachher

### TypeScript (`npx tsc --noEmit`)

| | Vorher | Nachher | Delta |
|---|---|---|---|
| `vite.config.ts(38,5) TS2769` (Vorfehler) | 1 | 1 | 0 |
| Nitro pkce-challenge (Vorfehler, kein tsc) | 0 | 0 | 0 |
| **Eigene Änderungen: 0 neue Fehler** | — | — | **0** |

Die RBAC-Tabellen werden per `(supabase as any)`-Cast angesprochen, weil
`Database` aus `src/integrations/supabase/types` nur die bestehenden 16
Tabellen kennt. Sobald die Migration läuft und `supabase gen types` neu
generiert wird, kann der Cast entfernt werden.

### Build (`npm run build`)

| Phase | Vorher | Nachher | Delta |
|---|---|---|---|
| Client bundle | ok | ok | — |
| SSR bundle | ok | ok | — |
| Nitro production | fail (pkce-challenge) | fail (pkce-challenge) | — |
| **Neue Fehler: 0** | — | — | **0** |

Beide Builds sind identisch zum Baseline-Zustand. Die RBAC-Logik ist lazy (nur
bei Tool-Aufruf aktiv) und belastet den Hot-Path nicht.

---

## 7. SQL-Migration (auszuführen im Supabase SQL-Editor)

```sql
-- =============================================================================
-- Agent RBAC — Rollen, Berechtigungen und Agenten-Registry
-- Idempotent via IF NOT EXISTS / DROP IF EXISTS.
-- =============================================================================

-- 1. Rollen-Tabelle
CREATE TABLE IF NOT EXISTS public.agent_roles (
  id            uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text            NOT NULL UNIQUE,
  label         text            NOT NULL,
  description   text            NOT NULL DEFAULT '',
  is_active     boolean         NOT NULL DEFAULT true,
  created_at    timestamptz     NOT NULL DEFAULT now(),
  updated_at    timestamptz     NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agent_roles TO authenticated;
GRANT ALL   ON public.agent_roles TO service_role;

-- 2. Tool-Zuordnung pro Rolle
CREATE TABLE IF NOT EXISTS public.agent_role_tools (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id     uuid    NOT NULL REFERENCES public.agent_roles(id) ON DELETE CASCADE,
  tool_name   text    NOT NULL,
  is_enabled  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, tool_name)
);
GRANT SELECT ON public.agent_role_tools TO authenticated;
GRANT ALL   ON public.agent_role_tools TO service_role;

-- 3. Agenten-Registry
CREATE TABLE IF NOT EXISTS public.agent_registry (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      text        NOT NULL,
  name          text        NOT NULL,
  role_id       uuid        NOT NULL REFERENCES public.agent_roles(id) ON DELETE RESTRICT,
  created_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  note         text        NOT NULL DEFAULT '',
  revoked_at   timestamptz,
  last_seen_at timestamptz,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (created_by, agent_id)
);
GRANT SELECT, INSERT ON public.agent_registry TO authenticated;
GRANT UPDATE           ON public.agent_registry TO authenticated;
GRANT ALL             ON public.agent_registry TO service_role;

-- Indizes
CREATE INDEX IF NOT EXISTS agent_role_tools_role_idx ON public.agent_role_tools(role_id);
CREATE INDEX IF NOT EXISTS agent_role_tools_tool_idx ON public.agent_role_tools(tool_name);
CREATE INDEX IF NOT EXISTS agent_registry_agent_idx  ON public.agent_registry(agent_id);
CREATE INDEX IF NOT EXISTS agent_registry_owner_idx  ON public.agent_registry(created_by);
CREATE INDEX IF NOT EXISTS agent_registry_active_idx ON public.agent_registry(created_by) WHERE revoked_at IS NULL;

-- RLS einschalten
ALTER TABLE public.agent_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_role_tools  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_registry    ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "agent_roles_read"  ON public.agent_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "agent_role_tools_read" ON public.agent_role_tools FOR SELECT TO authenticated USING (true);
CREATE POLICY "agent_registry_read_own"   ON public.agent_registry FOR SELECT  TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "agent_registry_insert_own"  ON public.agent_registry FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "agent_registry_update_own"  ON public.agent_registry FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- Trigger
DROP TRIGGER IF EXISTS agent_roles_touch       ON public.agent_roles;
DROP TRIGGER IF EXISTS agent_registry_touch    ON public.agent_registry;
CREATE TRIGGER agent_roles_touch BEFORE UPDATE ON public.agent_roles       FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER agent_registry_touch BEFORE UPDATE ON public.agent_registry FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed: Rollen
INSERT INTO public.agent_roles (name, label, description)
VALUES
  ('readonly', 'Read-only',
   'Darf alle Daten lesen, aber keine Seiten, Tabellen oder Notizen ändern. Kein Mood-Logging, keine Tasks umschalten.'),
  ('editor',   'Editor',
   'Darf zusätzlich Seiten und Tabelleneinträge erstellen und bearbeiten, Tasks umschalten, Mood loggen.'),
  ('admin',    'Administrator',
   'Voller Zugriff inklusive Rollen- und Agentenverwaltung. Der primäre Workspace-Eigentümer.')
ON CONFLICT (name) DO NOTHING;

-- Seed: Tools für readonly
INSERT INTO public.agent_role_tools (role_id, tool_name, is_enabled)
SELECT r.id, tool, true
FROM agent_roles r
CROSS JOIN (VALUES
  ('search_workspace'),('list_spaces'),('list_documents'),('get_document'),
  ('list_tables'),('get_table'),('search_notes'),('get_note'),
  ('get_brain_context'),('list_tasks'),('get_agenda')
) AS tools(tool)
WHERE r.name = 'readonly'
ON CONFLICT (role_id, tool_name) DO NOTHING;

-- Seed: Zusatz-Tools für editor
INSERT INTO public.agent_role_tools (role_id, tool_name, is_enabled)
SELECT r.id, tool, true
FROM agent_roles r
CROSS JOIN (VALUES
  ('create_document'),('update_document'),('create_table_row'),('toggle_task'),('log_mood')
) AS tools(tool)
WHERE r.name = 'editor'
ON CONFLICT (role_id, tool_name) DO NOTHING;
```

### Rollback-SQL

```sql
-- Vollständiger Rollback: alle RBAC-Tabellen entfernen
DROP TRIGGER IF EXISTS agent_registry_touch ON public.agent_registry;
DROP TRIGGER IF EXISTS agent_roles_touch     ON public.agent_roles;
DROP TABLE IF EXISTS public.agent_role_tools;
DROP TABLE IF EXISTS public.agent_registry;
DROP TABLE IF EXISTS public.agent_roles;
```

> **Hinweis:** Nach dem Rollback müssen alle externen Agenten neu registriert
> werden (neue `agent_registry`-Einträge mit korrekter `role_id`).

---

## 8. Was ungetestet bleibt

| Was | Warum nicht testbar | Nächster Schritt |
|---|---|---|
| RBAC-Logik in `resolveAllowedTools()` | Braucht laufende Supabase-Instanz mit den 3 neuen Tabellen | Nach Migration: `npm run dev`, MCP-Client mit OAuth-Token eines unbekannten Agenten aufrufen |
| ToolError bei verweigerter Ausführung | Identisch | Endpoint `POST /mcp` mit `create_document` als readonly-Agent → erwartet `ToolError` |
| Revocation-Pfad | Braucht existierenden `agent_registry`-Eintrag mit `revoked_at` | Nach Registration: `UPDATE agent_registry SET revoked_at = now() WHERE agent_id = '...'` → erneuter Aufruf → `ToolError` |
| Manifest vs. Realität Sync | Manifest ist readonly/static | Nach jedem Tool-Add/Remove: manifest.json manuell synchron halten |
| Falscher JWT | Token mit fehlender `sub`-Claim | Automatisch durch Fail-Closed in `decodeJwtPayload()` |

---

## 9. Offene Zweifel

1. **Wie identifiziert sich ein externer Agent?** Der Code nutzt `JWT.sub` als
   `agent_id`. Ist das die korrekte Claim aus Supabase OAuth, oder braucht es
   eine separate Client-ID? Falls Supabase OAuth keine stabile `sub`-Claim über
   Token-Erneuerungen hinweg liefert, müsste die Agent-Registrierung anders
   funktionieren (z.B. über ein Mapping `created_by` → `agent_id`).

2. **`owner`-Claim im JWT:** `src/lib/mcp/supabase.ts:148-153` dekodiert eine
   `owner`-Claim aus dem TokenPayload, die nicht garantiert existiert. Falls der
   MCP-Token eines Agenten keine Owner-Information trägt, fällt das Fallback
   auf `agentSub` — der Agent könnte dann nicht seinem Eigentümer zugeordnet
   werden.

3. **`(supabase as any)`-Casts:** Die RBAC-Tabellen sind noch nicht in der
   generierten `Database`-TypeScript-Type. Nach der Migration
   `supabase gen types --project-id vktilvpwbhrddjytilvs` ausführen und die
   Casts durch typisierte Queries ersetzen.

4. **Kein MCP-Tool für Rollenverwaltung:** Das Manifest beschreibt
   `requiredRole: "admin"` für `revoke_agent`, aber das Tool existiert nicht
   in `index.ts`. Die Rollenverwaltung erfolgt aktuell ausschließlich über
   Supabase SQL — kein UI, kein API-Tool.
