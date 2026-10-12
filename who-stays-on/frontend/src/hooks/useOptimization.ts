import { useCallback, useContext, useState } from "react";
import { RosterContext } from "@/context/RosterContext";
import type { MarketInput, RosterResponse } from "@/types/api";

/** Sends an input to the optimizer and tracks the request state. */
export function useOptimization() {
  const ctx = useContext(RosterContext);
  if (!ctx) throw new Error("useOptimization must be used inside RosterProvider");
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<RosterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const optimize = useCallback(
    async (input: MarketInput, opts?: { publish?: boolean }) => {
      setRunning(true);
      setError(null);
      try {
        const res = await ctx.run(input, opts);
        setResponse(res);
        return res;
      } catch (e) {
        setError((e as Error).message);
        return null;
      } finally {
        setRunning(false);
      }
    },
    [ctx],
  );

  return { optimize, running, response, error, reset: () => setResponse(null) };
}
