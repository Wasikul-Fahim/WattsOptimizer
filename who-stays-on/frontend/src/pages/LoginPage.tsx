import { motion } from "framer-motion";
import { LockKeyhole, LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import { LogoMark } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-full place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[780px] -translate-x-1/2 rounded-full bg-brand-gradient opacity-[0.13] blur-3xl" />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="relative w-full max-w-[400px]">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={144} />
          <h1 className="mt-6 font-display text-[26.5px] font-extrabold tracking-[0.12em]">WATTSOPTIMIZER</h1>
          <p className="mt-1 text-sm text-muted-foreground">Smart Energy Allocation System</p>
        </div>
        <form onSubmit={submit} className="mt-8 grid gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card">
          <div className="grid gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-[15.5px] text-danger-ink">{error}</p>}
          <Button type="submit" variant="primary" size="lg" loading={busy}>
            {!busy && <LogIn />} Sign in
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <LockKeyhole className="size-3.5" /> Secretary, committee and admin accounts
          </p>
        </form>
      </motion.div>
    </div>
  );
}
