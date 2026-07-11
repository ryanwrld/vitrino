"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signInSchema, type SignInInput } from "@/lib/validation/auth";
import { signInAction } from "@/lib/auth/actions";

/**
 * Login (AUTH-02). Mesma convenção de validação/feedback do cadastro. Esta
 * página NÃO fica atrás de gate de sessão: é uma entrada pública do grupo
 * `(admin)` (ver nota em `(admin)/layout.tsx`).
 */
export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const onSubmit = (values: SignInInput) => {
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);

    startTransition(async () => {
      const result = await signInAction(formData);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold text-[#0D3D2B]">Entrar</h1>
        <p className="mt-1 text-sm text-[#6B6B6B]">Acesse o painel da sua vitrine.</p>
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
            className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]"
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
            autoComplete="current-password"
            {...register("password")}
            className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]"
          />
          {errors.password && <span className="text-sm text-[#FF4D4D]">{errors.password.message}</span>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#00C46A] px-4 py-2 font-medium text-white transition disabled:opacity-60"
        >
          {isPending ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="text-center text-sm text-[#6B6B6B]">
        Ainda não tem conta?{" "}
        <a href="/cadastro" className="font-medium text-[#0D3D2B] underline">
          Criar minha vitrine grátis
        </a>
      </p>
    </main>
  );
}
