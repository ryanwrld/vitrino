"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AsYouType } from "libphonenumber-js";
import { onboardingSchema, type OnboardingInput } from "@/lib/validation/onboarding";
import { saveStoreSettings } from "@/lib/settings/actions";

/**
 * Formulário de edição pós-onboarding (Loja + WhatsApp), escrito do zero
 * para esta tela (D-07 — reusa `onboardingSchema` e a convenção visual de
 * `onboarding-wizard.tsx`, mas NÃO importa o componente do wizard: aqui é
 * uma página de edição em vigência, não um wizard de conclusão única).
 *
 * Cada campo é pré-preenchido com os valores atuais da loja/config via
 * `defaultValues` (props vindas do Server Component `page.tsx`). O submit
 * único chama `saveStoreSettings` e mostra toast de sucesso/erro (D-12) —
 * nunca faz `redirect()`, pois esta tela é revisitável.
 */
export type SettingsFormProps = {
  store: {
    name: string;
    accentColor: string | null;
    tagline: string | null;
    hideSoldOutDefault: boolean;
  };
  settings: {
    whatsapp: string;
    messageTemplate: string;
  };
};

export function SettingsForm({ store, settings }: SettingsFormProps) {
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
      name: store.name,
      accentColor: store.accentColor ?? "#0D21A1",
      tagline: store.tagline ?? "",
      whatsapp: settings.whatsapp,
      messageTemplate: settings.messageTemplate,
      hideSoldOutDefault: store.hideSoldOutDefault ? "true" : "false",
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
    formData.set("hideSoldOutDefault", values.hideSoldOutDefault ?? "false");
    if (logoFile) {
      formData.set("logo", logoFile);
    }

    startTransition(async () => {
      const result = await saveStoreSettings(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Configurações salvas!");
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-[#111111]">Loja</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium text-[#111111]">
            Nome da loja
          </label>
          <input
            id="name"
            type="text"
            autoComplete="organization"
            {...register("name")}
            className="rounded-lg border border-[#E7F2FD] bg-white px-3 py-2 text-base outline-none focus:border-[#0D21A1]"
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
            className="rounded-lg border border-[#E7F2FD] bg-white px-3 py-2 text-sm outline-none focus:border-[#0D21A1]"
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
            className="h-10 w-20 rounded-lg border border-[#E7F2FD] bg-white p-1"
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
            className="rounded-lg border border-[#E7F2FD] bg-white px-3 py-2 text-base outline-none focus:border-[#0D21A1]"
          />
          {errors.tagline && <span className="text-sm text-[#FF4D4D]">{errors.tagline.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="hideSoldOutDefault" className="text-sm font-medium text-[#111111]">
            Ocultar produtos esgotados por padrão
          </label>
          <select
            id="hideSoldOutDefault"
            {...register("hideSoldOutDefault")}
            className="rounded-lg border border-[#E7F2FD] bg-white px-3 py-2 text-base outline-none focus:border-[#0D21A1]"
          >
            <option value="false">Não — mostrar esmaecido (padrão)</option>
            <option value="true">Sim — ocultar da vitrine</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-[#111111]">WhatsApp</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="whatsapp" className="text-sm font-medium text-[#111111]">
            WhatsApp
          </label>
          <input
            id="whatsapp"
            type="tel"
            placeholder="(11) 99999-9999"
            {...register("whatsapp")}
            className="rounded-lg border border-[#E7F2FD] bg-white px-3 py-2 text-base outline-none focus:border-[#0D21A1]"
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
            className="rounded-lg border border-[#E7F2FD] bg-white px-3 py-2 text-sm outline-none focus:border-[#0D21A1]"
          />
          {errors.messageTemplate && (
            <span className="text-sm text-[#FF4D4D]">{errors.messageTemplate.message}</span>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#0D21A1] px-4 py-2 font-medium text-white transition disabled:opacity-60"
      >
        {isPending ? "Salvando…" : "Salvar alterações"}
      </button>
    </form>
  );
}
