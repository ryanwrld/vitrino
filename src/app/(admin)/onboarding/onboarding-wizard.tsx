"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AsYouType } from "libphonenumber-js";
import {
  onboardingSchema,
  DEFAULT_MESSAGE_TEMPLATE,
  type OnboardingInput,
} from "@/lib/validation/onboarding";
import { saveOnboarding } from "@/lib/onboarding/actions";

/**
 * Wizard de onboarding em tela única (decisão de UI a critério do executor,
 * conforme 01-CONTEXT.md — poucos campos obrigatórios, percebido como
 * rápido). Só `name` e `whatsapp` são obrigatórios; logo/cor/frase são
 * opcionais. O template de mensagem vem pré-preenchido e editável
 * (Pergunta em Aberto #2 do 01-RESEARCH.md).
 *
 * A prévia de telefone usa `AsYouType` (formatação de exibição, client-side)
 * só para feedback visual enquanto o revendedor digita — NUNCA é o valor
 * enviado/persistido. A normalização real e definitiva acontece uma única
 * vez dentro de `saveOnboarding` (Armadilha 2 do 01-RESEARCH.md).
 */
export function OnboardingWizard() {
  const [isPending, startTransition] = useTransition();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      accentColor: "#00C46A",
      tagline: "",
      whatsapp: "",
      messageTemplate: DEFAULT_MESSAGE_TEMPLATE,
    },
  });

  const whatsappValue = watch("whatsapp");
  const formattedPreview = whatsappValue ? new AsYouType("BR").input(whatsappValue) : "";

  const onSubmit = (values: OnboardingInput) => {
    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("accentColor", values.accentColor ?? "");
    formData.set("tagline", values.tagline ?? "");
    formData.set("whatsapp", values.whatsapp);
    formData.set("messageTemplate", values.messageTemplate);
    if (logoFile) {
      formData.set("logo", logoFile);
    }

    startTransition(async () => {
      const result = await saveOnboarding(formData);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <main className="bg-white mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold text-[#0D3D2B]">Configure sua vitrine</h1>
        <p className="mt-1 text-sm text-[#6B6B6B]">
          Só o essencial para começar — você pode ajustar tudo depois no painel.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium text-[#111111]">
            Nome da loja
          </label>
          <input
            id="name"
            type="text"
            autoComplete="organization"
            {...register("name")}
            className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]"
          />
          {errors.name && <span className="text-sm text-[#FF4D4D]">{errors.name.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="logo" className="text-sm font-medium text-[#111111]">
            Logo (opcional)
          </label>
          <input
            id="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
            className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-sm outline-none focus:border-[#00C46A]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="accentColor" className="text-sm font-medium text-[#111111]">
            Cor de destaque
          </label>
          <input
            id="accentColor"
            type="color"
            {...register("accentColor")}
            className="h-10 w-20 rounded-lg border border-[#F5F5F3] bg-white p-1"
          />
          {errors.accentColor && (
            <span className="text-sm text-[#FF4D4D]">{errors.accentColor.message}</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="tagline" className="text-sm font-medium text-[#111111]">
            Frase de apresentação (opcional, até 100 caracteres)
          </label>
          <input
            id="tagline"
            type="text"
            maxLength={100}
            {...register("tagline")}
            className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]"
          />
          {errors.tagline && <span className="text-sm text-[#FF4D4D]">{errors.tagline.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="whatsapp" className="text-sm font-medium text-[#111111]">
            WhatsApp
          </label>
          <input
            id="whatsapp"
            type="tel"
            placeholder="(11) 99999-9999"
            {...register("whatsapp")}
            className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]"
          />
          {formattedPreview && (
            <span className="text-xs text-[#6B6B6B]">Prévia: {formattedPreview}</span>
          )}
          {errors.whatsapp && <span className="text-sm text-[#FF4D4D]">{errors.whatsapp.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="messageTemplate" className="text-sm font-medium text-[#111111]">
            Template da mensagem de pedido
          </label>
          <textarea
            id="messageTemplate"
            rows={6}
            {...register("messageTemplate")}
            className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-sm outline-none focus:border-[#00C46A]"
          />
          {errors.messageTemplate && (
            <span className="text-sm text-[#FF4D4D]">{errors.messageTemplate.message}</span>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#00C46A] px-4 py-2 font-medium text-white transition disabled:opacity-60"
        >
          {isPending ? "Salvando…" : "Concluir e ver minha vitrine"}
        </button>
      </form>
    </main>
  );
}
