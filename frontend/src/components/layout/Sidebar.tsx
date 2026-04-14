import { NavLink } from "react-router-dom";

import { useAuthStore } from "@/store/authStore";
import type { Rol } from "@/types";

interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  group: string;
  roles: Rol[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/pacientes", label: "Pacientes", shortLabel: "PA", group: "Clinica", roles: ["recepcion", "doctor", "admin"] },
  { to: "/gestion", label: "Gestion", shortLabel: "GE", group: "Operacion", roles: ["recepcion", "doctor", "admin"] },
  { to: "/agenda", label: "Agenda", shortLabel: "AG", group: "Operacion", roles: ["recepcion", "doctor", "admin"] },
  { to: "/listados", label: "Listados", shortLabel: "LI", group: "Analitica", roles: ["recepcion", "doctor", "admin"] },
  { to: "/configuracion", label: "Configuracion", shortLabel: "CO", group: "Sistema", roles: ["admin"] },
  { to: "/cumplimiento", label: "Cumplimiento", shortLabel: "SI", group: "Sistema", roles: ["admin"] },
];

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);

  const visibleItems = NAV_ITEMS.filter((item) => !user || item.roles.includes(user.rol));
  const groupedItems = visibleItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = [];
    }
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <aside className="relative hidden h-screen w-[250px] shrink-0 overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#08111f_0%,#0d1727_42%,#111d2f_100%)] text-slate-100 lg:flex lg:flex-col xl:w-[280px]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(110,231,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.16),transparent_36%)]" />

      <div className="relative flex items-center justify-between border-b border-white/10 px-7 pb-6 pt-7">
        <div>
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.35em] text-cyan-200/70">
            Eurodent Suite
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">DentOrg</h1>
          <p className="mt-2 max-w-[14rem] text-sm leading-5 text-slate-300/72">
            Clinica, gestion operativa y cumplimiento en un mismo puesto de trabajo.
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-sm font-semibold text-cyan-100 shadow-[0_18px_40px_rgba(4,10,24,0.35)] backdrop-blur">
          ED2
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto px-5 py-6 scrollbar-thin">
        <nav className="space-y-6">
          {Object.entries(groupedItems).map(([group, items]) => (
            <section key={group}>
              <p className="px-3 text-[0.68rem] font-medium uppercase tracking-[0.32em] text-slate-400/70">
                {group}
              </p>
              <div className="mt-3 space-y-1.5">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        "group flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-200",
                        isActive
                          ? "bg-white text-slate-950 shadow-[0_18px_38px_rgba(8,145,178,0.18)]"
                          : "text-slate-300/76 hover:bg-white/6 hover:text-white",
                      ].join(" ")
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={[
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-[0.72rem] font-semibold tracking-[0.16em] transition-all duration-200",
                            isActive
                              ? "border-slate-200 bg-slate-100 text-slate-700"
                              : "border-white/10 bg-white/5 text-cyan-100/88 group-hover:border-cyan-300/25 group-hover:bg-cyan-200/10",
                          ].join(" ")}
                        >
                          {item.shortLabel}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium tracking-tight">{item.label}</div>
                          <div
                            className={[
                              "mt-1 text-xs transition-colors",
                              isActive ? "text-slate-500" : "text-slate-400/72 group-hover:text-slate-300",
                            ].join(" ")}
                          >
                            {item.group}
                          </div>
                        </div>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </section>
          ))}
        </nav>
      </div>

      {user && (
        <div className="relative border-t border-white/10 px-5 py-5">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/6 px-4 py-4 shadow-[0_18px_40px_rgba(3,8,20,0.25)] backdrop-blur">
            <p className="text-[0.66rem] font-medium uppercase tracking-[0.28em] text-slate-400/72">
              Sesion activa
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/14 text-sm font-semibold text-cyan-100">
                {user.nombre.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-white">{user.nombre}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400/72">
                  {user.rol}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
