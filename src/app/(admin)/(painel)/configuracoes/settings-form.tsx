"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AsYouType } from "libphonenumber-js";
import { ChevronDown } from "lucide-react";
import { onboardingSchema, type OnboardingInput } from "@/lib/validation/onboarding";
import { saveStoreSettings } from "@/lib/settings/actions";
import { ColorSwatchPicker } from "@/components/color-picker";

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
    control,
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
      <div className="flex flex-col gap-4 rounded-lg border border-divider bg-surface-subtle p-5">
        <h2 className="font-display font-bold text-gray-900">Identidade visual</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium text-ink-navy">
            Nome da loja
          </label>
          <input
            id="name"
            type="text"
            autoComplete="organization"
            {...register("name")}
            className="rounded-md border border-field-border bg-white px-3 h-11 text-base text-gray-900 outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary-subtle placeholder:text-gray-400"
          />
          {errors.name && <span className="text-sm text-error-solid">{errors.name.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="logo" className="text-sm font-medium text-ink-navy">
            Logo (opcional)
          </label>
          <input
            id="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
            className="rounded-md border border-field-border bg-white px-3 py-2 text-sm outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary-subtle"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="accentColor" className="text-sm font-medium text-ink-navy">
            Cor de destaque
          </label>
          <Controller
            control={control}
            name="accentColor"
            render={({ field }) => (
              <ColorSwatchPicker id="accentColor" value={field.value ?? "#0D21A1"} onChange={field.onChange} />
            )}
          />
          {errors.accentColor && (
            <span className="text-sm text-error-solid">{errors.accentColor.message}</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="tagline" className="text-sm font-medium text-ink-navy">
            Frase de apresentação (opcional, até 100 caracteres)
          </label>
          <input
            id="tagline"
            type="text"
            maxLength={100}
            {...register("tagline")}
            className="rounded-md border border-field-border bg-white px-3 h-11 text-base text-gray-900 outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary-subtle placeholder:text-gray-400"
          />
          {errors.tagline && <span className="text-sm text-error-solid">{errors.tagline.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="hideSoldOutDefault" className="text-sm font-medium text-ink-navy">
            Ocultar produtos esgotados por padrão
          </label>
          <div className="relative">
            <select
              id="hideSoldOutDefault"
              {...register("hideSoldOutDefault")}
              className="w-full min-h-11 appearance-none rounded-md border border-field-border bg-white px-3 pr-9 h-11 text-base text-gray-900 outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary-subtle"
            >
              <option value="false">Não — mostrar esmaecido (padrão)</option>
              <option value="true">Sim — ocultar da vitrine</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-divider bg-surface-subtle p-5">
        <h2 className="font-display font-bold text-gray-900">WhatsApp e mensagem de pedido</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="whatsapp" className="text-sm font-medium text-ink-navy">
            WhatsApp
          </label>
          <input
            id="whatsapp"
            type="tel"
            placeholder="(11) 99999-9999"
            {...register("whatsapp")}
            className="rounded-md border border-field-border bg-white px-3 h-11 text-base text-gray-900 outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary-subtle placeholder:text-gray-400"
          />
          {formattedPreview && (
            <span className="text-xs text-gray-500">Prévia: {formattedPreview}</span>
          )}
          {errors.whatsapp && <span className="text-sm text-error-solid">{errors.whatsapp.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="messageTemplate" className="text-sm font-medium text-ink-navy">
            Template da mensagem de pedido
          </label>
          <textarea
            id="messageTemplate"
            rows={6}
            {...register("messageTemplate")}
            className="rounded-md border border-field-border bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary-subtle placeholder:text-gray-400"
          />
          {errors.messageTemplate && (
            <span className="text-sm text-error-solid">{errors.messageTemplate.message}</span>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:bg-primary-hover active:bg-primary-active active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:pointer-events-none"
      >
        {isPending ? "Salvando…" : "Salvar alterações"}
      </button>
    </form>
  );
}
