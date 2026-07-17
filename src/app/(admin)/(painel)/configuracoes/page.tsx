import { requireCompletedOnboarding } from "@/lib/auth/onboarding-guard";
import { createClient } from "@/lib/supabase/server";
import { UserCircle, Monitor, Sun, Moon, Shield, Paintbrush } from "lucide-react";
import { ProfileForm } from "./profile-form";

/**
 * Rota `/configuracoes` principal.
 * Usada para configurações da conta do usuário e interface do SaaS
 * (tema, preferências, senha, etc).
 * As configurações específicas da loja (nome, cor, slug, WhatsApp)
 * foram movidas para `/configuracoes/loja` e são acessadas clicando
 * no perfil da loja na sidebar.
 */
export default async function ConfiguracoesContaPage() {
  await requireCompletedOnboarding();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 md:py-10">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-gray-900">Configurações da conta</h1>
        <p className="mt-1 text-sm text-gray-500">Gerencie suas preferências de interface e segurança da sua conta.</p>
      </div>

      <section className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 text-gray-900">
          <UserCircle className="h-5 w-5" />
          <h2 className="font-display font-bold">Seu perfil</h2>
        </div>
        <ProfileForm email={user?.email ?? ""} />
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 text-gray-900">
          <Paintbrush className="h-5 w-5" />
          <h2 className="font-display font-bold">Interface</h2>
        </div>
        
        <div className="flex flex-col gap-2 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-medium text-gray-900 block">Tema (Em breve)</span>
              <span className="text-sm text-gray-500">Escolha como a plataforma Vitrino será exibida.</span>
            </div>
            
            <div className="flex w-full sm:w-auto bg-gray-100/80 p-1 rounded-lg border border-gray-200/60 shadow-sm pointer-events-none opacity-60">
              <button className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-gray-500">
                <Sun className="h-4 w-4" />
                Claro
              </button>
              <button className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-white text-gray-900 shadow-sm">
                <Monitor className="h-4 w-4" />
                Auto
              </button>
              <button className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-gray-500">
                <Moon className="h-4 w-4" />
                Escuro
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 text-gray-900">
          <Shield className="h-5 w-5" />
          <h2 className="font-display font-bold">Segurança</h2>
        </div>
        
        <div className="flex flex-col gap-2 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-medium text-gray-900 block">Senha</span>
              <span className="text-sm text-gray-500">Alterar a senha de acesso da sua conta.</span>
            </div>
            <button disabled className="text-sm font-medium text-gray-400 cursor-not-allowed">
              Alterar
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
