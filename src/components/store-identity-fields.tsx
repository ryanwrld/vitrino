"use client";

import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { AccentColorField } from "@/components/accent-color-field";
import type { OnboardingInput } from "@/lib/validation/onboarding";

/**
 * Campos de identidade da loja compartilhados entre `onboarding-wizard.tsx`
 * e `configuracoes/settings-form.tsx` (Seção 6, item 5 do checklist de UI) —
 * Nome da loja, Logo, Cor de destaque (`AccentColorField`) e Frase de
 * apresentação são IDENTICOS nas duas telas; extraídos aqui para nunca mais
 * serem escritos do zero duas vezes. WhatsApp/template de mensagem/ocultar
 * esgotados permanecem em cada tela (agrupamento diferente entre as duas).
 *
 * Recebe `register`/`errors`/`watch`/`setValue` do `useForm<OnboardingInput>`
 * do componente pai — não possui estado de formulário próprio. O arquivo de
 * logo é mantido fora do react-hook-form pelo pai (não é um campo Zod), daí
 * o callback dedicado `onLogoFileChange`.
 */
export type StoreIdentityFieldsProps = {
  register: UseFormRegister<OnboardingInput>;
  errors: FieldErrors<OnboardingInput>;
  watch: UseFormWatch<OnboardingInput>;
  setValue: UseFormSetValue<OnboardingInput>;
  onLogoFileChange: (file: File | null) => void;
};

export function StoreIdentityFields({
  register,
  errors,
  watch,
  setValue,
  onLogoFileChange,
}: StoreIdentityFieldsProps) {
  const nameValue = watch("name");
  const accentColorValue = watch("accentColor");

  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-ink">
          Nome da loja
        </label>
        <input
          id="name"
          type="text"
          autoComplete="organization"
          aria-invalid={errors.name ? true : undefined}
          {...register("name")}
          className="rounded-lg border border-surface bg-white px-3 py-2 text-base outline-none focus:border-brand aria-invalid:border-danger"
        />
        {errors.name && <span className="text-sm text-danger">{errors.name.message}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="logo" className="text-sm font-medium text-ink">
          Logo (opcional)
        </label>
        <input
          id="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => onLogoFileChange(event.target.files?.[0] ?? null)}
          className="rounded-lg border border-surface bg-white px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="accentColor" className="text-sm font-medium text-ink">
          Cor de destaque
        </label>
        <AccentColorField
          id="accentColor"
          value={accentColorValue ?? "#0D21A1"}
          onChange={(color) => setValue("accentColor", color)}
          storeNamePreview={nameValue}
        />
        {errors.accentColor && (
          <span className="text-sm text-danger">{errors.accentColor.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="tagline" className="text-sm font-medium text-ink">
          Frase de apresentação (opcional, até 100 caracteres)
        </label>
        <input
          id="tagline"
          type="text"
          maxLength={100}
          aria-invalid={errors.tagline ? true : undefined}
          {...register("tagline")}
          className="rounded-lg border border-surface bg-white px-3 py-2 text-base outline-none focus:border-brand aria-invalid:border-danger"
        />
        {errors.tagline && <span className="text-sm text-danger">{errors.tagline.message}</span>}
      </div>
    </>
  );
}
