import type { ReactNode } from "react";

/**
 * Estado vazio com ilustração geométrica + título + descrição + ação
 * opcional, conforme `components/data/EmptyState.jsx` do design system.
 * Usado em listas/buscas/404 — nunca texto solto sem contexto visual.
 */
export function EmptyState({
  icon = "box",
  title,
  description,
  action,
}: {
  icon?: "box" | "search" | "lost";
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <EmptyIllustration icon={icon} />
      <div className="flex max-w-[360px] flex-col gap-1.5">
        <span className="font-display text-xl font-extrabold text-gray-900">{title}</span>
        {description && <span className="text-base leading-normal text-gray-500">{description}</span>}
      </div>
      {action}
    </div>
  );
}

function EmptyIllustration({ icon }: { icon: "box" | "search" | "lost" }) {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      {icon === "box" && (
        <>
          <rect x="26" y="40" width="68" height="48" rx="8" className="fill-primary-subtle" />
          <rect x="26" y="40" width="68" height="48" rx="8" className="stroke-primary-border" strokeWidth="2" />
          <path d="M26 54h68" className="stroke-primary-border" strokeWidth="2" />
          <circle cx="60" cy="30" r="12" className="fill-gray-100" />
        </>
      )}
      {icon === "search" && (
        <>
          <circle cx="52" cy="52" r="26" className="fill-primary-subtle stroke-primary-border" strokeWidth="2" />
          <line x1="70" y1="70" x2="90" y2="90" className="stroke-primary-border" strokeWidth="6" strokeLinecap="round" />
        </>
      )}
      {icon === "lost" && (
        <>
          <circle cx="60" cy="60" r="34" className="fill-gray-100" />
          <rect x="42" y="46" width="36" height="28" rx="6" className="fill-primary-subtle stroke-primary-border" strokeWidth="2" />
          <path d="M52 46v-6a8 8 0 0 1 16 0v6" className="stroke-primary-border" strokeWidth="2" fill="none" />
        </>
      )}
    </svg>
  );
}
