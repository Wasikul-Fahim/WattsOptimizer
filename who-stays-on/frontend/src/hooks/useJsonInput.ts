import { useCallback, useState } from "react";
import sample from "@/assets/sample_input.json";
import { parseInputText } from "@/lib/validate";
import type { MarketInput } from "@/types/api";

const MAX_BYTES = 64 * 1024;

/** Reads a market JSON from a file, pasted text or the practice sample, with client-side checks. */
export function useJsonInput(onLoad?: () => void) {
  const [input, setInput] = useState<MarketInput | null>(null);
  const [original, setOriginal] = useState<MarketInput | null>(null);
  const [name, setName] = useState("");
  const [problem, setProblem] = useState<{ field: string; message: string } | null>(null);

  const accept = useCallback(
    (text: string, label: string) => {
      onLoad?.();
      const checked = parseInputText(text);
      if (!checked.ok) {
        setProblem({ field: checked.field, message: checked.message });
        setInput(null);
        return;
      }
      setProblem(null);
      setInput(checked.input);
      setOriginal(structuredClone(checked.input));
      setName(label);
    },
    [onLoad],
  );

  const readFile = useCallback(
    (file: File) => {
      if (!/\.json$/i.test(file.name) && file.type !== "application/json") {
        setProblem({ field: "file", message: `${file.name} is not a .json file` });
        return;
      }
      if (file.size > MAX_BYTES) {
        setProblem({ field: "file", message: `File is ${(file.size / 1024).toFixed(0)} KB; the limit is 64 KB` });
        return;
      }
      file.text().then((t) => accept(t, file.name));
    },
    [accept],
  );

  const loadSample = useCallback(() => accept(JSON.stringify(sample), "sample_input.json (practice)"), [accept]);

  const clear = useCallback(() => {
    setInput(null);
    setOriginal(null);
    setProblem(null);
    setName("");
  }, []);

  return { input, setInput, original, name, problem, accept, readFile, loadSample, clear };
}
