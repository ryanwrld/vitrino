"use client";

import { useId } from "react";
import { Check, Pipette } from "lucide-react";

/**
 * Swatches predefinidos do campo "Cor de destaque" — marca + acentos uteis
 * para a vitrine (nao a paleta round 2 inteira, so as cores que fazem
 * sentido como cor de marca de uma loja). Substitui o `<input type="color">`
 * nativo nu (Direcao extra do brief de redesign).
 */
const SWATCHES = [
  { hex: "#0D21A1", label: "Azul marca" },
  { hex: "#2D4BF0", label: "Azul vibrante" },
  { hex: "#0A1680", label: "Indigo" },
  { hex: "#1FA860", label: "Verde" },
  { hex: "#E56A1C", label: "Laranja" },
  { hex: "#6D3EE8", label: "Violeta" },
  { hex: "#D82A44", label: "Vermelho" },
  { hex: "#000000", label: "Preto" },
] as const;

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function ColorSwatchPicker({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (hex: string) => void;
  id?: string;
}) {
  const generatedId = useId();
  const customInputId = id ?? generatedId;
  const normalizedValue = HEX_PATTERN.test(value ?? "") ? value.toUpperCase() : "";
  const isCustom = normalizedValue !== "" && !SWATCHES.some((swatch) => swatch.hex === normalizedValue);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {SWATCHES.map((swatch) => {
        const isSelected = swatch.hex === normalizedValue;
        return (
          <button
            key={swatch.hex}
            type="button"
            aria-label={swatch.label}
            aria-pressed={isSelected}
            onClick={() => onChange(swatch.hex)}
            className={`flex min-h-11 min-w-11 items-center justify-center rounded-full transition-all duration-150 ${
              isSelected ? "ring-2 ring-primary-bright ring-offset-2" : ""
            }`}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10"
              style={{ backgroundColor: swatch.hex }}
            >
              {isSelected && <Check className="h-4 w-4 text-white" aria-hidden="true" strokeWidth={3} />}
            </span>
          </button>
        );
      })}

      <label
        htmlFor={customInputId}
        className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-2.5 transition-all duration-150 ${
          isCustom ? "border-primary-bright ring-2 ring-primary-bright ring-offset-2" : "border-field-border hover:border-primary-bright"
        }`}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white"
          style={isCustom ? { backgroundColor: normalizedValue } : undefined}
        >
          {isCustom ? (
            <Check className="h-4 w-4 text-white" aria-hidden="true" strokeWidth={3} />
          ) : (
            <Pipette className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
          )}
        </span>
        <span className="text-sm font-medium text-ink-navy">Personalizada</span>
        <input
          id={customInputId}
          type="color"
          value={HEX_PATTERN.test(value ?? "") ? value : "#0D21A1"}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="sr-only"
        />
      </label>
    </div>
  );
}
