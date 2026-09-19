"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { choreKeys } from "@/data/chores/keys";
import { completionKeys } from "@/data/completions/keys";
import { historyKeys } from "@/data/history/keys";
import { occurrenceKeys } from "@/data/occurrences/keys";
import { createSupabaseBrowserClient } from "@/data/supabase/browser";

const REALTIME_TABLES = ["chores", "chore_occurrences", "occurrence_completions", "activity_events"] as const;
const LOCAL_MUTATION_SETTLE_MS = 600;

type LocalMutationContextValue = {
  setMutationPending: (id: string, pending: boolean) => void;
};

const LocalMutationContext = createContext<LocalMutationContextValue>({
  setMutationPending: () => undefined,
});

export function useLocalHouseholdMutation() {
  return useContext(LocalMutationContext);
}

export function RealtimeHouseholdProvider({
  householdId,
  children,
}: Readonly<{ householdId: string; children: React.ReactNode }>) {
  const [supabase] = useState(createSupabaseBrowserClient);
  const queryClient = useQueryClient();
  const router = useRouter();
  const pendingMutationIds = useRef(new Set<string>());
  const suppressRefreshUntil = useRef(0);

  const setMutationPending = useCallback((id: string, pending: boolean) => {
    if (pending) {
      pendingMutationIds.current.add(id);
      suppressRefreshUntil.current = Date.now() + LOCAL_MUTATION_SETTLE_MS;
      return;
    }
    pendingMutationIds.current.delete(id);
    suppressRefreshUntil.current = Math.max(
      suppressRefreshUntil.current,
      Date.now() + LOCAL_MUTATION_SETTLE_MS,
    );
  }, []);

  const localMutationContext = useMemo(() => ({ setMutationPending }), [setMutationPending]);

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const invalidateSharedData = () => Promise.all([
      queryClient.invalidateQueries({ queryKey: choreKeys.household(householdId) }),
      queryClient.invalidateQueries({ queryKey: occurrenceKeys.household(householdId) }),
      queryClient.invalidateQueries({ queryKey: completionKeys.household(householdId) }),
      queryClient.invalidateQueries({ queryKey: historyKeys.household(householdId) }),
    ]);
    const refreshSharedData = () => {
      if (pendingMutationIds.current.size > 0 || Date.now() < suppressRefreshUntil.current) {
        void invalidateSharedData();
        return;
      }
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void invalidateSharedData();
        router.refresh();
      }, 80);
    };

    let channel = supabase.channel(`household:${householdId}`);
    for (const table of REALTIME_TABLES) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `household_id=eq.${householdId}` },
        refreshSharedData,
      );
    }
    channel.subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [householdId, queryClient, router, supabase]);

  return <LocalMutationContext value={localMutationContext}>{children}</LocalMutationContext>;
}
