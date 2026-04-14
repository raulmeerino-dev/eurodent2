import { Link } from "react-router-dom";

import { useAuthStore } from "@/store/authStore";

interface GestionCardProps {
  to: string;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
}

function GestionCard({ to, eyebrow, title, description, cta }: GestionCardProps) {
  return (
    <Link
      to={to}
      className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_20px_48px_rgba(15,23,42,0.08)]"
    >
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-cyan-700/70">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-slate-900">
        {cta}
        <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </div>
    </Link>
  );
}

export default function GestionPage() {
  const user = useAuthStore((s) => s.user);
  const puedeVerFacturacionGlobal = user?.rol === "admin" || user?.rol === "recepcion";

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f3f8fc_48%,#eef6ff_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-slate-400">
          Gestion interna
        </p>
        <div className="mt-3 max-w-4xl">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Operativa de presupuestos, trabajos y control diario
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Este modulo agrupa la gestion interna de la clinica. El trabajo diario con cobros y
            facturas sale desde la ficha del paciente; aqui dejamos el acceso a presupuestos,
            laboratorio y vistas globales de soporte.
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <GestionCard
          to="/presupuestos"
          eyebrow="Planes"
          title="Presupuestos y planes"
          description="Crea, revisa y convierte propuestas clinicas. El odontograma operativo del tratamiento vive aqui."
          cta="Abrir presupuestos"
        />
        <GestionCard
          to="/laboratorio"
          eyebrow="Produccion"
          title="Laboratorio"
          description="Controla encargos externos, fechas previstas, recepciones e incidencias ligadas a cada caso."
          cta="Abrir laboratorio"
        />
        <GestionCard
          to="/listados"
          eyebrow="Control"
          title="Listados y seguimiento"
          description="Consulta actividad, pendientes y revision global del centro sin salir del puesto clinico."
          cta="Ir a listados"
        />
      </section>

      {puedeVerFacturacionGlobal && (
        <section className="rounded-[28px] border border-amber-200/70 bg-amber-50/80 p-5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-amber-700/80">
            Control administrativo
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">Facturacion global</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            La facturacion diaria debe salir desde la ficha del paciente. Esta vista global queda
            como apoyo para supervision, revision, rectificaciones y control administrativo.
          </p>
          <Link
            to="/facturacion"
            className="mt-4 inline-flex rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
          >
            Abrir vista global de facturacion
          </Link>
        </section>
      )}
    </div>
  );
}
