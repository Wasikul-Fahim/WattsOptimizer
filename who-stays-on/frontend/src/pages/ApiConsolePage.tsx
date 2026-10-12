import { Check, Copy, LayoutDashboard, Send } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import sample from "@/assets/sample_input.json";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { useRoster } from "@/hooks/useRoster";
import { postRosterRaw } from "@/services/api";
import { checkInput } from "@/lib/validate";
import type { RosterResult } from "@/types/api";

const ENDPOINTS = [
  { method: "POST", path: "/api/roster", who: "Anyone", note: "Input JSON in, roster JSON out" },
  { method: "POST", path: "/api/roster/today", who: "Secretary", note: "Compute and publish today's roster" },
  { method: "GET", path: "/api/today", who: "Signed in", note: "Last published roster" },
];

const STATUS_ROWS = [
  ["200", "ok", "Roster meets every rule"],
  ["200", "infeasible", "Conflict named, best effort attached"],
  ["400", "invalid_input", "Field and message"],
  ["413", "invalid_input", "Body over 64 KB"],
];

export default function ApiConsolePage() {
  const { current, show } = useRoster();
  const navigate = useNavigate();
  const [body, setBody] = useState(() => JSON.stringify(current?.input ?? sample, null, 2));
  const [res, setRes] = useState<{ httpStatus: number; body: unknown; ms: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const origin = window.location.origin;
  const curl = `curl -s -X POST ${origin}/api/roster \\\n  -H 'content-type: application/json' \\\n  --data-binary @market.json`;

  async function send() {
    setBusy(true);
    setErr(null);
    try {
      setRes(await postRosterRaw(body));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    navigator.clipboard
      .writeText(curl)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => setErr("Clipboard blocked; select the command and copy it."));
  }

  const result = res?.body as { status?: string } | undefined;
  const canOpen = result?.status === "ok" || result?.status === "infeasible";

  function openOnBoard() {
    let input = null;
    try {
      const checked = checkInput(JSON.parse(body));
      if (checked.ok) input = checked.input;
    } catch {
      /* keep null: board still renders without per-shop values */
    }
    show(input, res!.body as RosterResult);
    navigate("/");
  }

  const statusTone = !res ? "neutral" : res.httpStatus >= 400 ? "danger" : result?.status === "infeasible" ? "warning" : "success";

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="For committees & judges" title="API console" />

      <div className="grid gap-4 md:grid-cols-3">
        {ENDPOINTS.map((e) => (
          <Card key={e.path} className="p-4">
            <div className="flex items-center gap-2">
              <Badge variant={e.method === "GET" ? "teal" : "mandatory"}>{e.method}</Badge>
              <code className="truncate font-mono text-[13px] font-bold">{e.path}</code>
            </div>
            <div className="mt-2 text-[13px] text-muted-foreground">{e.note}</div>
            <div className="mt-1 text-xs text-muted-foreground">Access: {e.who}</div>
          </Card>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Request body</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setBody(JSON.stringify(sample, null, 2))}>
                Practice input
              </Button>
              <Button variant="primary" size="sm" onClick={() => void send()} loading={busy}>
                {!busy && <Send />} Send
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea id="api-body" rows={22} value={body} onChange={(e) => setBody(e.target.value)} spellCheck={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Response</CardTitle>
            {res && (
              <div className="flex items-center gap-2">
                <Badge variant={statusTone}>
                  HTTP {res.httpStatus} · {result?.status ?? "—"}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">{res.ms} ms</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="grid gap-3">
            {err && <p className="text-sm text-danger-ink">{err}</p>}
            <pre className="h-[452px] overflow-auto rounded-xl border border-border bg-sunken p-3 font-mono text-[12px] leading-relaxed">
              {res ? JSON.stringify(res.body, null, 2) : <span className="text-muted-foreground">Send a request to see the response.</span>}
            </pre>
            {canOpen && (
              <Button variant="secondary" onClick={openOnBoard}>
                <LayoutDashboard /> Open on dashboard (not published)
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>From another market</CardTitle>
            <Button variant="ghost" size="sm" onClick={copy}>
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-xl border border-border bg-sunken p-3 font-mono text-[12px]">{curl}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-[13px]">
              <tbody>
                {STATUS_ROWS.map(([code, status, note]) => (
                  <tr key={code + status} className="border-b border-border last:border-0">
                    <td className="py-2 font-mono font-bold">{code}</td>
                    <td className="py-2 font-mono text-blue-ink">{status}</td>
                    <td className="py-2 text-muted-foreground">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
