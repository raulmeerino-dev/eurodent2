import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function MainLayout() {
  return (
    <div className="relative flex h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-ink)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(84,214,255,0.12),transparent_25%),radial-gradient(circle_at_top_right,rgba(45,212,191,0.08),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.42),rgba(236,242,249,0))]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[34vw] bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.08),transparent_54%)]" />
      <Sidebar />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col overflow-auto px-3 pb-3 pt-2 md:px-5 md:pb-5 md:pt-3 xl:px-7 xl:pb-7">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
