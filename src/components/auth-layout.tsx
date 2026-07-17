import type { ReactNode } from "react";
import { LogoMark } from "@/components/logo-mark";

/**
 * Layout compartilhado das 4 telas de auth (login/cadastro/esqueci-senha/
 * redefinir-senha) — split-screen com o painel de marca à direita, conforme
 * o Design System (`ui_kits/admin/Auth.jsx`, componente `AuthLayout`). O
 * painel direito é decorativo e escondido no mobile (`hidden md:flex`),
 * mesma convenção de breakpoint do `admin-sidebar.tsx`.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh">
      {/* Painel esquerdo — formulário */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex w-full max-w-sm flex-col gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <LogoMark size={30} />
            <span className="font-display text-lg font-extrabold text-gray-900">Vitrino</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-gray-900">{title}</h1>
            {subtitle && <p className="text-base text-gray-500">{subtitle}</p>}
          </div>

          {children}
          {footer}
        </div>
      </div>

      {/* Painel direito — identidade de marca, oculto em mobile */}
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-primary md:flex">
        {/* Gradientes de profundidade */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 15% 15%, rgba(255,255,255,0.10) 0, transparent 50%), radial-gradient(ellipse at 85% 80%, rgba(13,33,161,0.7) 0, transparent 50%)",
          }}
          aria-hidden="true"
        />

        {/* Grade de pontos — textura sutil */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
          aria-hidden="true"
        />

        {/* Conteúdo */}
        <div className="relative flex max-w-sm flex-col gap-8 p-10 text-white">
          {/* Headline */}
          <div className="flex flex-col gap-3">
            <span className="font-display text-2xl font-extrabold leading-tight">
              Do WhatsApp para uma vitrine profissional.
            </span>
            <span className="text-base leading-relaxed text-white/80">
              Cadastre seus produtos uma vez e compartilhe um único link. Seus clientes
              escolhem o tamanho e o pedido cai pronto no seu WhatsApp.
            </span>
          </div>

          {/* Feature highlights */}
          <ul className="flex flex-col gap-3">
            {[
              { icon: "📦", text: "Catálogo completo com fotos e tamanhos" },
              { icon: "🔗", text: "Vitrine pública com link único e QR Code" },
              { icon: "💬", text: "Pedido automático via WhatsApp em 1 toque" },
            ].map(({ icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
                  style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
                  aria-hidden="true"
                >
                  {icon}
                </span>
                <span className="text-sm font-medium text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

export function RequiredMark() {
  return (
    <span className="text-error-solid" aria-hidden="true">
      {" "}
      *
    </span>
  );
}
