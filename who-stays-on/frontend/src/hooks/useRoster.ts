import { useContext, useMemo } from "react";
import { RosterContext } from "@/context/RosterContext";
import { analyse } from "@/lib/analytics";

/** The roster currently on screen, plus everything derived from it. */
export function useRoster() {
  const ctx = useContext(RosterContext);
  if (!ctx) throw new Error("useRoster must be used inside RosterProvider");
  const { current, previous } = ctx;
  const analysis = useMemo(() => (current ? analyse(current.result, current.input) : null), [current]);
  const previousAnalysis = useMemo(() => (previous ? analyse(previous.result, previous.input) : null), [previous]);
  return { ...ctx, analysis, previousAnalysis };
}
