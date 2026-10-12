import { motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const location = useLocation();
  return (
    <div className="flex min-h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="print-page mx-auto w-full max-w-[1320px] flex-1 px-6 py-7 max-md:px-4">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
