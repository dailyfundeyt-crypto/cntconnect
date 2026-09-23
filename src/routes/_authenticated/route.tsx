import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // 1. Check active Supabase user session
    const { data } = await supabase.auth.getUser();
    if (data?.user) return { user: data.user };

    // 2. Check local Google user session
    if (typeof window !== "undefined") {
      const localGoogle = window.localStorage.getItem("spark_google_user");
      if (localGoogle) {
        try {
          const user = JSON.parse(localGoogle);
          if (user && (user.email || user.sub)) {
            return { user };
          }
        } catch {}
      }
    }

    throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
