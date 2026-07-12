"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Check, X } from "lucide-react";
import { slugify } from "@/lib/slug/slugify";
import { slugSchema } from "@/lib/slug/validation";
import { useDebouncedValue } from "@/lib/hooks/use-debounce";
import { checkSlugAvailability } from "@/lib/settings/actions";

/**
 * Editor real do slug da vitrine (D-01–D-03, LOJA-02).
 *
 * O valor exibido é sempre `slugify(raw)` a cada tecla (D-01 — sem acento,
 * minúsculo, espaços viram hífen). O formato é validado de forma síncrona
 * via `slugSchema` (02-RESEARCH.md Open Question 2 — checagem de formato
 * NUNCA é debounced, só a checagem de disponibilidade de rede é). O valor
 * slugificado é debounced ~400ms (D-03) antes de disparar
 * `checkSlugAvailability`.
 *
 * O botão "Salvar novo link" + diálogo de confirmação chegam na Task 2.
 */
export type SlugEditorProps = {
  currentSlug: string;
};

type AvailabilityStatus = "idle" | "checking" | "available" | "taken";

export function SlugEditor({ currentSlug }: SlugEditorProps) {
  const [rawSlug, setRawSlug] = useState(currentSlug);
  const [status, setStatus] = useState<AvailabilityStatus>("idle");
  const [, startCheckTransition] = useTransition();

  const slug = slugify(rawSlug);
  const debouncedSlug = useDebouncedValue(slug, 400);

  const formatResult = slugSchema.safeParse(slug);
  const formatError = formatResult.success ? null : formatResult.error.issues[0]?.message ?? null;

  useEffect(() => {
    if (!formatResult.success || debouncedSlug === currentSlug) {
      setStatus("idle");
      return;
    }

    setStatus("checking");
    startCheckTransition(async () => {
      const result = await checkSlugAvailability(debouncedSlug);
      // Evita aplicar um resultado obsoleto se o usuário já digitou algo
      // diferente enquanto a checagem estava em voo.
      if (slugify(rawSlug) !== debouncedSlug) {
        return;
      }
      setStatus(result.available ? "available" : "taken");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSlug, currentSlug]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="slug" className="text-sm font-medium text-[#111111]">
          Link da vitrine
        </label>
        <input
          id="slug"
          type="text"
          value={rawSlug}
          onChange={(event) => setRawSlug(event.target.value)}
          className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]"
        />
        <p className="text-xs text-[#6B6B6B]">/loja/{slug}</p>
        {formatError ? (
          <span className="text-sm text-[#FF4D4D]">{formatError}</span>
        ) : (
          <StatusPill status={status} />
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: AvailabilityStatus }) {
  if (status === "checking") {
    return (
      <span className="flex items-center gap-1 text-xs text-[#6B6B6B]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        Verificando disponibilidade…
      </span>
    );
  }

  if (status === "available") {
    return (
      <span className="flex items-center gap-1 text-xs text-[#00C46A]">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        Disponível
      </span>
    );
  }

  if (status === "taken") {
    return (
      <span className="flex items-center gap-1 text-xs text-[#FF4D4D]">
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        Este link já está em uso.
      </span>
    );
  }

  return null;
}
