import { LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";
import { LogoMark, Wordmark } from "@/components/common/Logo";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";

export function Sidebar() {
  const { can, user, logout } = useAuth();
  const items = NAV.filter((n) => can(n.role));
  const groups = [...new Set(items.map((i) => i.group))];

  return (
    <aside className="no-print sticky top-0 flex h-screen w-[248px] shrink-0 flex-col border-r border-border bg-surface max-lg:w-[72px]">
      <div className="flex items-center gap-3 px-4 py-4 max-lg:justify-center max-lg:px-2">
        <LogoMark size={34} />
        <Wordmark className="max-lg:hidden" />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4 max-lg:px-2">
        {groups.map((g) => (
          <div key={g} className="mt-4">
            <div className="label-caps px-3 pb-2 !text-[10px] max-lg:hidden">{g}</div>
            <ul className="grid gap-0.5">
              {items
                .filter((i) => i.group === g)
                .map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={to === "/"}
                      title={label}
                      className={({ isActive }) =>
                        cn(
                          "group relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-bold text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground max-lg:justify-center max-lg:px-0",
                          isActive && "bg-blue/10 text-foreground",
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={cn("size-[18px] shrink-0", isActive && "text-blue-ink")} />
                          <span className="max-lg:hidden">{label}</span>
                          {isActive && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand-gradient" />}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>
      {user && (
        <div className="flex items-center gap-3 border-t border-border p-3 max-lg:flex-col max-lg:px-2">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-gradient font-black uppercase text-[#05222f]">
            {user.username[0]}
          </div>
          <div className="min-w-0 flex-1 max-lg:hidden">
            <div className="truncate text-sm font-bold">{user.username}</div>
            <div className="text-xs capitalize text-muted-foreground">{user.role === "admin" ? "Admin · Judge" : user.role}</div>
          </div>
          <button onClick={() => void logout()} className="cursor-pointer rounded-lg p-2 text-muted-foreground hover:bg-sunken hover:text-foreground" title="Sign out" aria-label="Sign out">
            <LogOut className="size-[18px]" />
          </button>
        </div>
      )}
    </aside>
  );
}
