"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Check, X } from "lucide-react";
import { slugify } from "@/lib/slug/slugify";
import { slugSchema } from "@/lib/slug/validation";
import { useDebouncedValue } from "@/lib/hooks/use-debounce";
import { checkSlugAvailability, updateStoreSlug } from "@/lib/settings/actions";

/**
 * Editor real do slug da vitrine (D-01–D-04, D-08, LOJA-02).
 *
 * O valor exibido é sempre `slugify(raw)` a cada tecla (D-01 — sem acento,
 * minúsculo, espaços viram hífen). O formato é validado de forma síncrona
 * via `slugSchema` (02-RESEARCH.md Open Question 2 — checagem de formato
 * NUNCA é debounced, só a checagem de disponibilidade de rede é). O valor
 * slugificado é debounced ~400ms (D-03) antes de disparar
 * `checkSlugAvailability`.
 *
 * A troca efetiva do slug é uma ação separada ("Salvar novo link", D-08),
 * isolada do formulário de Loja/WhatsApp, que exige confirmação em um
 * `<dialog>` nativo em linguagem simples (D-04). `updateStoreSlug` só é
 * chamado a partir do onClick explícito do botão "Sim, trocar o link" —
 * nunca a partir do cancelamento/close/escape do dialog (02-PATTERNS.md
 * Pitfall 4).
 */
export type SlugEditorProps = {
  currentSlug: string;
};

type AvailabilityStatus = "idle" | "checking" | "available" | "taken";

export function SlugEditor({ currentSlug }: SlugEditorProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [rawSlug, setRawSlug] = useState(currentSlug);
  const [status, setStatus] = useState<"idle" | "available" | "taken">("idle");
  const [isCheckPending, startCheckTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  const slug = slugify(rawSlug);
  const debouncedSlug = useDebouncedValue(slug, 400);

  const formatResult = slugSchema.safeParse(slug);
  const formatError = formatResult.success ? null : formatResult.error.issues[0]?.message ?? null;

  // Só há algo a checar quando o formato é válido e o valor debounced
  // diverge do slug atual — tudo derivado no render, nunca via setState
  // síncrono dentro do efeito (anti-padrão "adjusting state on prop
  // change" que o react-hooks/set-state-in-effect sinaliza; ver
  // https://react.dev/learn/you-might-not-need-an-effect). O estado
  // "checking" vem de `isCheckPending` (useTransition), que o próprio
  // React atualiza de forma síncrona ao chamar `startCheckTransition` —
  // não precisamos de um `setStatus("checking")` manual.
  const needsCheck = formatResult.success && debouncedSlug !== currentSlug;
  const displayStatus: AvailabilityStatus = !needsCheck
    ? "idle"
    : isCheckPending
      ? "checking"
      : status;

  useEffect(() => {
    if (!needsCheck) {
      return;
    }

    let cancelled = false;
    startCheckTransition(async () => {
      const result = await checkSlugAvailability(debouncedSlug);
      if (cancelled) {
        return;
      }
      setStatus(result.available ? "available" : "taken");
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedSlug, currentSlug, needsCheck]);

  const canSave = displayStatus === "available" && !isSaving;

  function openConfirmDialog() {
    if (!canSave) return;
    dialogRef.current?.showModal();
  }

  function handleConfirm() {
    const targetSlug = debouncedSlug;
    startSaveTransition(async () => {
      const result = await updateStoreSlug(targetSlug);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Link atualizado!");
        router.refresh();
      }
      dialogRef.current?.close();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="slug" className="text-sm font-medium text-ink">
          Link da vitrine
        </label>
        <input
          id="slug"
          type="text"
          value={rawSlug}
          onChange={(event) => setRawSlug(event.target.value)}
          className="rounded-lg border border-surface bg-white px-3 py-2 text-base outline-none focus:border-brand"
        />
        <p className="text-xs text-muted">/loja/{slug}</p>
        {formatError ? (
          <span className="text-sm text-danger">{formatError}</span>
        ) : (
          <StatusPill status={displayStatus} />
        )}
      </div>

      <button
        type="button"
        disabled={!canSave}
        onClick={openConfirmDialog}
        className="self-start rounded-lg bg-brand px-4 py-2 font-medium text-white transition disabled:opacity-60"
      >
        Salvar novo link
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-lg p-6 backdrop:bg-black/40"
      >
        <h2 className="text-xl font-medium text-ink">Trocar o link da sua vitrine?</h2>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Isso vai quebrar links já compartilhados: quem tiver o link antigo não vai mais
          conseguir acessar sua vitrine. Essa ação não pode ser desfeita.
        </p>
        <form method="dialog" className="mt-4 flex gap-3">
          <button
            type="submit"
            className="rounded-lg border border-black px-4 py-2 font-medium text-black"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleConfirm}
            className="rounded-lg bg-danger px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {isSaving ? "Salvando…" : "Sim, trocar o link"}
          </button>
        </form>
      </dialog>
    </div>
  );
}

function StatusPill({ status }: { status: AvailabilityStatus }) {
  if (status === "checking") {
    return (
      <span className="flex items-center gap-1 text-xs text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        Verificando disponibilidade…
      </span>
    );
  }

  if (status === "available") {
    return (
      <span className="flex items-center gap-1 text-xs text-brand">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        Disponível
      </span>
    );
  }

  if (status === "taken") {
    return (
      <span className="flex items-center gap-1 text-xs text-danger">
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        Este link já está em uso.
      </span>
    );
  }

  return null;
}
