"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { signUpSchema } from "@/lib/validation/auth";
import { requestPasswordReset } from "@/lib/auth/reset-actions";
import { VitrinoWordmark } from "@/components/vitrino-wordmark";

const requestResetSchema = z.object({
  email: signUpSchema.shape.email,
});

type RequestResetInput = z.infer<typeof requestResetSchema>;

/**
 * Solicitação de recuperação de senha (AUTH-05). Sempre exibe a mesma
 * mensagem de confirmação genérica retornada pelo Server Action — nunca
 * confirma/nega a existência da conta (anti-enumeração, ver
 * `src/lib/auth/reset-actions.ts`). Esta página NÃO fica atrás de gate de
 * sessão: é uma entrada pública do grupo `(admin)` (ver nota em
 * `(admin)/layout.tsx`).
 */
export default function EsqueciSenhaPage() {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestResetInput>({ resolver: zodResolver(requestResetSchema) });

  const onSubmit = (values: RequestResetInput) => {
    const formData = new FormData();
    formData.set("email", values.email);

    startTransition(async () => {
      const result = await requestPasswordReset(formData);
      toast.success(result.message);
    });
  };

  return (
    <main className="bg-white mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <VitrinoWordmark />
      <div>
        <h1 className="text-2xl font-bold text-black">Esqueci minha senha</h1>
        <p className="mt-1 text-sm text-muted">
          Informe o email da sua conta e enviaremos um link para redefinir sua senha.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className="rounded-lg border border-surface bg-white px-3 py-2 text-base outline-none focus:border-brand"
          />
          {errors.email && <span className="text-sm text-danger">{errors.email.message}</span>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand px-4 py-2 font-medium text-white transition disabled:opacity-60"
        >
          {isPending ? "Enviando…" : "Enviar link de recuperação"}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        Lembrou a senha?{" "}
        <Link href="/login" className="font-medium text-black underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
