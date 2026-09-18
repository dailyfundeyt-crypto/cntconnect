import { createFileRoute, Link } from "@tanstack/react-router";
import { Database, FileText, KanbanSquare, Lock, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SparkLogo, SparkWordmark } from "@/components/spark/logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spark — Your private workspace for docs and data" },
      {
        name: "description",
        content:
          "Spark joins documents and flexible tables with table, gallery and board views in one private workspace.",
      },
      { property: "og:title", content: "Spark — Your private workspace for docs and data" },
      {
        property: "og:description",
        content: "Documents, tables, galleries and boards. Private to your account.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: FileText,
    title: "Documents",
    text: "Write in Markdown with a live preview, nest pages, and mark favourites.",
  },
  {
    icon: Database,
    title: "Tables",
    text: "Build your own fields: text, numbers, checkboxes, dates, links and select lists.",
  },
  {
    icon: KanbanSquare,
    title: "Views",
    text: "Show the same data as a grid, a gallery of cards, or a board grouped by status.",
  },
  {
    icon: Search,
    title: "Instant search",
    text: "One shortcut opens search across every page and table you own.",
  },
  {
    icon: Lock,
    title: "Private by default",
    text: "Every page and row is bound to your account — nobody else can read it.",
  },
  {
    icon: Sparkles,
    title: "Spaces",
    text: "Group work into separate spaces and keep projects apart.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <SparkWordmark />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/app">Open workspace</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="grain-bg border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-24 text-center">
            <SparkLogo className="mx-auto h-16 w-16" />
            <h1 className="mt-8 text-5xl font-bold tracking-tight sm:text-6xl">
              Docs and databases,
              <br />
              in one calm workspace
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Spark keeps your notes and your structured data side by side. Write a page, turn a
              list into a table, and switch to a board when you need to see progress.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/app">Open my workspace</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-bold tracking-tight">Everything in one place</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="panel p-6">
                <feature.icon className="h-5 w-5 text-accent" strokeWidth={2} />
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-sm text-muted-foreground">
          <SparkWordmark />
          <span>Private workspace · {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
