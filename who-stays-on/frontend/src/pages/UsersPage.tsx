import { Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader } from "@/components/common/Loader";
import { Modal } from "@/components/common/Modal";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { api } from "@/services/api";
import type { Role, UserRecord } from "@/types/api";

const ROLE_VARIANT = { admin: "teal", secretary: "mandatory", committee: "neutral" } as const;

export default function UsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRecord[] | null>(null);
  const [form, setForm] = useState({ username: "", password: "", role: "committee" as Role });
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .listUsers()
      .then(setUsers)
      .catch((e) => toast({ kind: "error", title: "Could not load users", description: e.message }));
  }, [toast]);
  useEffect(load, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createUser(form.username.trim(), form.password, form.role);
      toast({ kind: "success", title: `Added ${form.username}` });
      setForm({ username: "", password: "", role: "committee" });
      load();
    } catch (err) {
      toast({ kind: "error", title: "Could not add user", description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api.deleteUser(toDelete);
      toast({ kind: "success", title: `Removed ${toDelete}` });
      setToDelete(null);
      load();
    } catch (err) {
      toast({ kind: "error", title: "Could not remove user", description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Admin" title="Users" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          {!users ? (
            <CardContent>
              <Loader label="Loading users…" />
            </CardContent>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="label-caps px-5 py-3">User</th>
                  <th className="label-caps px-5 py-3">Role</th>
                  <th className="label-caps px-5 py-3 max-sm:hidden">Created</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.username} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-bold">
                      {u.username}
                      {u.username === user?.username && <span className="ml-2 text-xs font-normal text-muted-foreground">you</span>}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={ROLE_VARIANT[u.role]}>{u.role}</Badge>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground tabular max-sm:hidden">{new Date(u.created * 1000).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">
                      {u.username !== user?.username && (
                        <Button variant="ghost" size="icon-sm" onClick={() => setToDelete(u.username)} aria-label={`Remove ${u.username}`}>
                          <Trash2 />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Add user</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={add} className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="new-user">Username</Label>
                <Input id="new-user" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required minLength={3} maxLength={32} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="new-pass">Password</Label>
                <Input id="new-pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
              </div>
              <div className="grid gap-1.5">
                <Label>Role</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["committee", "secretary", "admin"] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, role: r })}
                      aria-pressed={form.role === r}
                      className={`cursor-pointer rounded-lg border py-2 text-[15px] font-bold capitalize ${form.role === r ? "border-blue bg-blue/12 text-blue-ink" : "border-border text-muted-foreground"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" variant="primary" loading={busy} className="mt-1">
                {!busy && <UserPlus />} Add user
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Modal
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Remove ${toDelete}?`}
        description="They will no longer be able to sign in."
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={() => void remove()}
        busy={busy}
      />
    </div>
  );
}
