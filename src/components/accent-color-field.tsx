"use client";

/**
 * Seletor de "cor de destaque" curado (Seção 2, item 3 do checklist de UI) —
 * substitui o `<input type="color">` cru usado sozinho em onboarding-wizard.tsx
 * e settings-form.tsx. Combina swatches sugeridos (paleta de marca + tons
 * complementares curados), o color picker nativo como opção "outra cor", e um
 * mini-preview de como a cor fica no hero da vitrine pública.
 *
 * Compatível com react-hook-form via `value`/`onChange` controlados
 * explicitamente pelo pai (`watch("accentColor")` + `setValue("accentColor", ...)`),
 * em vez de `register` — o componente não conhece o formulário, só recebe o
 * valor atual e um callback de mudança.
 */
export type AccentColorFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Nome exibido no mini-preview do hero — "Sua loja" quando ainda vazio. */
  storeNamePreview?: string;
};

const CURATED_SWATCHES: { color: string; name: string }[] = [
  { color: "#0D21A1", name: "Azul Vitrino" },
  { color: "#000000", name: "Preto" },
  { color: "#111111", name: "Grafite" },
  { color: "#16A34A", name: "Verde" },
  { color: "#FF4D4D", name: "Vermelho" },
  { color: "#6D28D9", name: "Roxo" },
];

export function AccentColorField({ id, value, onChange, storeNamePreview }: AccentColorFieldProps) {
  const normalizedValue = value?.toLowerCase() ?? "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {CURATED_SWATCHES.map((swatch) => {
          const isActive = normalizedValue === swatch.color.toLowerCase();
          return (
            <button
              key={swatch.color}
              type="button"
              aria-label={swatch.name}
              aria-pressed={isActive}
              onClick={() => onChange(swatch.color)}
              className={`h-9 w-9 rounded-full border transition ${
                isActive ? "border-brand ring-2 ring-brand/40" : "border-surface"
              }`}
              style={{ backgroundColor: swatch.color }}
            />
          );
        })}

        <label
          htmlFor={id}
          className="flex h-9 items-center gap-1 rounded-full border border-surface px-2 text-xs font-medium text-muted"
        >
          <input
            id={id}
            type="color"
            value={value || "#0D21A1"}
            onChange={(event) => onChange(event.target.value)}
            className="h-5 w-5 shrink-0 rounded border-0 bg-transparent p-0"
          />
          Outra cor
        </label>
      </div>

      <div
        className="flex h-16 items-center justify-center rounded-lg text-sm font-medium text-white"
        style={{ backgroundColor: value || "#0D21A1" }}
      >
        {storeNamePreview?.trim() ? storeNamePreview : "Sua loja"}
      </div>
    </div>
  );
}
