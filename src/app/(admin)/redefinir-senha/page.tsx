"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { signUpSchema } from "@/lib/validation/auth";
import { updatePassword } from "@/lib/auth/reset-actions";

const redefinirSenhaSchema = z
  .object({
    password: signUpSchema.shape.password,
    confirmPassword: z.string().min(1, "Confirme sua nova senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type RedefinirSenhaInput = z.infer<typeof redefinirSenhaSchema>;

/**
 * Definição da nova senha (AUTH-05), depois que a sessão de recuperação já
 * foi estabelecida pelo Route Handler `/auth/confirm`. Esta página não
 * precisa de um guard de auth explícito próprio: é alcançada logo após o
 * redirect do Route Handler, que só ocorre quando a troca de token teve
 * sucesso — se não houver sessão válida, `updatePassword` (Server Action)
 * simplesmente falha e exibe erro via toast.
 */
export default function RedefinirSenhaPage() {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RedefinirSenhaInput>({ resolver: zodResolver(redefinirSenhaSchema) });

  const onSubmit = (values: RedefinirSenhaInput) => {
    const formData = new FormData();
    formData.set("password", values.password);

    startTransition(async () => {
      const result = await updatePassword(formData);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold text-[#0D3D2B]">Definir nova senha</h1>
        <p className="mt-1 text-sm text-[#6B6B6B]">Escolha uma nova senha para sua conta.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-[#111111]">
            Nova senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
            className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]"
          />
          {errors.password && <span className="text-sm text-[#FF4D4D]">{errors.password.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-[#111111]">
            Confirme a nova senha
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword")}
            className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]"
          />
          {errors.confirmPassword && (
            <span className="text-sm text-[#FF4D4D]">{errors.confirmPassword.message}</span>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#00C46A] px-4 py-2 font-medium text-white transition disabled:opacity-60"
        >
          {isPending ? "Salvando…" : "Salvar nova senha"}
        </button>
      </form>
    </main>
  );
}
