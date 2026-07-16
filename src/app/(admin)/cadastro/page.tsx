"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signUpSchema, type SignUpInput } from "@/lib/validation/auth";
import { signUpAction } from "@/lib/auth/actions";

/**
 * Cadastro (AUTH-01). Validação client-side com react-hook-form + Zod
 * (feedback inline imediato) — sempre revalidado no servidor dentro do
 * Server Action (nunca confiar só no client, Armadilha 2 do 01-RESEARCH.md).
 * Esta página NÃO fica atrás de gate de sessão: é uma entrada pública do
 * grupo `(admin)` (ver nota em `(admin)/layout.tsx`).
 */
export default function CadastroPage() {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = (values: SignUpInput) => {
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);

    startTransition(async () => {
      const result = await signUpAction(formData);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <main className="bg-white mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold text-[#000000]">Criar minha vitrine grátis</h1>
        <p className="mt-1 text-sm text-[#6B6B6B]">
          Pare de mandar foto por foto. Cadastre-se com email e senha para começar.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-[#111111]">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className="rounded-lg border border-[#E7F2FD] bg-white px-3 py-2 text-base outline-none focus:border-[#0D21A1]"
          />
          {errors.email && <span className="text-sm text-[#FF4D4D]">{errors.email.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-[#111111]">
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
            className="rounded-lg border border-[#E7F2FD] bg-white px-3 py-2 text-base outline-none focus:border-[#0D21A1]"
          />
          {errors.password && <span className="text-sm text-[#FF4D4D]">{errors.password.message}</span>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0D21A1] px-4 py-2 font-medium text-white transition disabled:opacity-60"
        >
          {isPending ? "Criando conta…" : "Criar minha vitrine grátis"}
        </button>
      </form>

      <p className="text-center text-sm text-[#6B6B6B]">
        Já tem conta?{" "}
        <a href="/login" className="font-medium text-[#000000] underline">
          Entrar
        </a>
      </p>
    </main>
  );
}
