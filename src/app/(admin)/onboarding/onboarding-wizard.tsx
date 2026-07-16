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
import { VitrinoWordmark } from "@/components/vitrino-wordmark";
import { StoreIdentityFields } from "@/components/store-identity-fields";

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
    setValue,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      accentColor: "#0D21A1",
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
      <VitrinoWordmark />
      <p className="text-center text-xs text-muted">Etapa única — leva menos de 1 minuto</p>
      <div>
        <h1 className="text-2xl font-bold text-black">Configure sua vitrine</h1>
        <p className="mt-1 text-sm text-muted">
          Só o essencial para começar — você pode ajustar tudo depois no painel.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <StoreIdentityFields
          register={register}
          errors={errors}
          watch={watch}
          setValue={setValue}
          onLogoFileChange={setLogoFile}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="whatsapp" className="text-sm font-medium text-ink">
            WhatsApp
          </label>
          <input
            id="whatsapp"
            type="tel"
            placeholder="(11) 99999-9999"
            aria-invalid={errors.whatsapp ? true : undefined}
            {...register("whatsapp")}
            className="rounded-lg border border-surface bg-white px-3 py-2 text-base outline-none focus:border-brand aria-invalid:border-danger"
          />
          {formattedPreview && (
            <span className="text-xs text-muted">Prévia: {formattedPreview}</span>
          )}
          {errors.whatsapp && <span className="text-sm text-danger">{errors.whatsapp.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="messageTemplate" className="text-sm font-medium text-ink">
            Template da mensagem de pedido
          </label>
          <textarea
            id="messageTemplate"
            rows={6}
            aria-invalid={errors.messageTemplate ? true : undefined}
            {...register("messageTemplate")}
            className="rounded-lg border border-surface bg-white px-3 py-2 text-sm outline-none focus:border-brand aria-invalid:border-danger"
          />
          {errors.messageTemplate && (
            <span className="text-sm text-danger">{errors.messageTemplate.message}</span>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand px-4 py-2 font-medium text-white transition disabled:opacity-60"
        >
          {isPending ? "Salvando…" : "Concluir e ver minha vitrine"}
        </button>
      </form>
    </main>
  );
}
