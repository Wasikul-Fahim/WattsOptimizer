import { BarChart3, FileUp, Fuel, LayoutDashboard, MessageSquareWarning, Printer, Store, Table2, Users } from "lucide-react";
import type { Role } from "@/types/api";

export const NAV: { to: string; label: string; icon: typeof LayoutDashboard; role: Role; group: "Monitor" | "Operate" | "Admin" }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, role: "committee", group: "Monitor" },
  { to: "/roster", label: "Roster Board", icon: Table2, role: "committee", group: "Monitor" },
  { to: "/shops", label: "Shop Analysis", icon: Store, role: "committee", group: "Monitor" },
  { to: "/fuel", label: "Fuel Analytics", icon: Fuel, role: "committee", group: "Monitor" },
  { to: "/insights", label: "Insights", icon: BarChart3, role: "committee", group: "Monitor" },
  { to: "/reasons", label: "Power-cut Reasons", icon: MessageSquareWarning, role: "committee", group: "Monitor" },
  { to: "/upload", label: "Upload JSON", icon: FileUp, role: "secretary", group: "Operate" },
  { to: "/report", label: "Export & Print", icon: Printer, role: "committee", group: "Operate" },
  { to: "/users", label: "Users", icon: Users, role: "admin", group: "Admin" },
];
