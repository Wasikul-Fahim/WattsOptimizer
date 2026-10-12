# WattsOptimizer frontend

React + TypeScript + Tailwind v4 + shadcn-style components (dialog uses native <dialog>) + Framer Motion + Recharts + Lucide.
It is a pure client of the FastAPI backend in `..` — every roster decision comes from `POST /api/roster`.

## Run

```bash
# backend (port 8000)
cd .. && .venv/bin/python app.py

# frontend dev server (port 5173, proxies /api to :8000)
npm install
npm run dev
```

`npm run build` writes the production app into `../static/`, which FastAPI already serves at `/`.
No backend change is needed. Routes use the URL hash (`/#/roster`) so they work under the static mount.

## Structure

```
src/
  services/api.ts        every backend call (roster, today, login, users)
  hooks/                 useRoster, useOptimization, useAuth, useTheme, useToast
  context/               Auth, Roster (current + previous run), Theme, Toast providers
  lib/analytics.ts       derives metrics/charts from a backend result (no decisions made here)
  lib/reasons.ts         parses the backend's reason strings into numbers for the reason cards
  components/
    ui/                  Button, Card, Badge, Input, Tabs, Dialog, Tooltip
    upload/              JsonDropzone, InputSummary, UpdateJsonDialog (dashboard shortcut)
    layout/              Sidebar, Navbar, ThemeToggle, AppLayout
    common/              Modal, Toaster, Loader, PageHeader, EmptyState, Logo
    dashboard/           MetricCard, StatusCard, FuelCard, LoadGauge
    roster/              RosterTable, ShopRow, StatusCell
    charts/              FuelChart, LoadChart, ValueCharts, PieCharts
  pages/                 Dashboard, Roster, Shops, Fuel, Insights, Reasons, Upload, Report, Users, Login
```

## Roles

| Role | Sees |
|---|---|
| committee | all read-only pages |
| secretary | + Upload JSON page and the dashboard's Update JSON button (publish via `/api/roster/today`) |
| admin (judges) | + Users |

## Notes

- The backend CSP is `default-src 'self'`: fonts are bundled (`@fontsource`), assets are never inlined
  (`assetsInlineLimit: 0`), and no inline scripts or `<style>` tags are emitted.
- Print view (`Export & Print`) fits the board, hourly load and fuel on one A4 landscape page.
