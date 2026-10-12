import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/services/api";
import type { MarketInput, RosterResponse, RosterResult } from "@/types/api";

export type RosterSource = "today" | "published" | "preview";

export interface LoadedRoster {
  input: MarketInput | null;
  result: RosterResult;
  source: RosterSource;
  by?: string;
  at: number; // unix seconds
}

interface RosterState {
  current: LoadedRoster | null;
  previous: LoadedRoster | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Run the optimizer. publish=true stores it as today's roster (secretary). */
  run: (input: MarketInput, opts?: { publish?: boolean }) => Promise<RosterResponse>;
  /** Show a result computed elsewhere (API console) without publishing it. */
  show: (input: MarketInput | null, result: RosterResult) => void;
}

export const RosterContext = createContext<RosterState | null>(null);

export function RosterProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [current, setCurrent] = useState<LoadedRoster | null>(null);
  const [previous, setPrevious] = useState<LoadedRoster | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const replace = useCallback((next: LoadedRoster) => {
    setCurrent((cur) => {
      if (cur) setPrevious(cur);
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = await api.getToday();
      if ("output" in today && today.output.status !== "invalid_input") {
        setCurrent({ input: today.input, result: today.output, source: "today", by: today.by, at: today.at });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void refresh();
    else {
      setCurrent(null);
      setPrevious(null);
    }
  }, [enabled, refresh]);

  const run = useCallback(
    async (input: MarketInput, opts: { publish?: boolean } = {}) => {
      const res = opts.publish ? await api.publishTodayRoster(input) : await api.postRoster(input);
      if (res.status !== "invalid_input") {
        replace({ input, result: res, source: opts.publish ? "published" : "preview", at: Date.now() / 1000 });
      }
      return res;
    },
    [replace],
  );

  const show = useCallback(
    (input: MarketInput | null, result: RosterResult) => replace({ input, result, source: "preview", at: Date.now() / 1000 }),
    [replace],
  );

  const value = useMemo(
    () => ({ current, previous, loading, error, refresh, run, show }),
    [current, previous, loading, error, refresh, run, show],
  );
  return <RosterContext.Provider value={value}>{children}</RosterContext.Provider>;
}
