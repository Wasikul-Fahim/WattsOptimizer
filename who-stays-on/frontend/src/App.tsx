import { lazy, Suspense, type ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Spinner } from "@/components/common/Loader";
import { LogoMark } from "@/components/common/Logo";
import { Toaster } from "@/components/common/Toaster";
import { AppLayout } from "@/components/layout/AppLayout";
import { RosterProvider } from "@/context/RosterContext";
import { useAuth } from "@/hooks/useAuth";
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";
import type { Role } from "@/types/api";

const RosterPage = lazy(() => import("@/pages/RosterPage"));
const ShopsPage = lazy(() => import("@/pages/ShopsPage"));
const FuelPage = lazy(() => import("@/pages/FuelPage"));
const InsightsPage = lazy(() => import("@/pages/InsightsPage"));
const ReasonsPage = lazy(() => import("@/pages/ReasonsPage"));
const UploadPage = lazy(() => import("@/pages/UploadPage"));
const ReportPage = lazy(() => import("@/pages/ReportPage"));
const ApiConsolePage = lazy(() => import("@/pages/ApiConsolePage"));
const UsersPage = lazy(() => import("@/pages/UsersPage"));

function Splash() {
  return (
    <div className="grid min-h-full place-items-center">
      <div className="flex flex-col items-center gap-5">
        <LogoMark size={64} />
        <Spinner className="size-8" />
      </div>
    </div>
  );
}

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { can } = useAuth();
  return can(role) ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  const { user, checking } = useAuth();
  if (checking) return <Splash />;

  return (
    <>
      {!user ? (
        <LoginPage />
      ) : (
        <RosterProvider enabled={!!user}>
          <HashRouter>
            <Suspense fallback={<Splash />}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="roster" element={<RosterPage />} />
                  <Route path="shops" element={<ShopsPage />} />
                  <Route path="fuel" element={<FuelPage />} />
                  <Route path="insights" element={<InsightsPage />} />
                  <Route path="reasons" element={<ReasonsPage />} />
                  <Route path="upload" element={<RequireRole role="secretary"><UploadPage /></RequireRole>} />
                  <Route path="report" element={<ReportPage />} />
                  <Route path="api" element={<ApiConsolePage />} />
                  <Route path="users" element={<RequireRole role="admin"><UsersPage /></RequireRole>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </HashRouter>
        </RosterProvider>
      )}
      <Toaster />
    </>
  );
}
