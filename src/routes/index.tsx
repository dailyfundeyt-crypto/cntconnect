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
      <header className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-4 sm:px-6 sm:py-6">
        <div className="min-w-0 overflow-hidden"><SparkWordmark /></div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/app"><span className="sm:hidden">Open</span><span className="hidden sm:inline">Open workspace</span></Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="grain-bg border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
            <SparkLogo className="mx-auto h-14 w-14 sm:h-16 sm:w-16" />
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:mt-8 sm:text-6xl">
              Docs and databases,
              <br />
              in one calm workspace
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:mt-6 sm:text-lg">
              Spark keeps your notes and your structured data side by side. Write a page, turn a
              list into a table, and switch to a board when you need to see progress.
            </p>
            <div className="mx-auto mt-8 grid max-w-xs gap-2 sm:mt-10 sm:flex sm:max-w-none sm:flex-wrap sm:justify-center sm:gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/app">Open my workspace</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Everything in one place</h2>
          <div className="mt-7 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="panel p-5 sm:p-6">
                <feature.icon className="h-5 w-5 text-accent" strokeWidth={2} />
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6 sm:py-8 sm:text-sm">
          <SparkWordmark />
          <span>Private workspace · {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
