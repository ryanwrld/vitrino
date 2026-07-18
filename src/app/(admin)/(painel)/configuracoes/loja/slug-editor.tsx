"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Check, X, Link as LinkIcon } from "lucide-react";
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
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2 text-gray-900 dark:text-gray-50">
        <LinkIcon className="h-5 w-5" />
        <h2 className="font-display font-bold">Link da vitrine</h2>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="slug" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Slug
        </label>
        <input
          id="slug"
          type="text"
          value={rawSlug}
          onChange={(event) => setRawSlug(event.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 h-11 text-base text-gray-900 outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary-subtle placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:placeholder:text-gray-600 dark:focus:ring-blue-400/20"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">/loja/{slug}</p>
        {formatError ? (
          <span className="text-sm text-error-fg">{formatError}</span>
        ) : (
          <StatusPill status={displayStatus} />
        )}
      </div>

      <button
        type="button"
        disabled={!canSave}
        onClick={openConfirmDialog}
        className="w-full sm:w-auto sm:self-end rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow active:translate-y-0 active:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none dark:disabled:bg-gray-800 dark:disabled:text-gray-600"
      >
        Salvar novo link
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-lg bg-white p-6 text-gray-900 shadow-lg backdrop:bg-black/45 backdrop:backdrop-blur-[2px] dark:bg-gray-900 dark:text-gray-50"
      >
        <div className="animate-scale-in">
          <h2 className="font-display text-xl font-medium text-gray-900 dark:text-gray-50">Trocar o link da sua vitrine?</h2>
          <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Isso vai quebrar links já compartilhados: quem tiver o link antigo não vai mais
            conseguir acessar sua vitrine. Essa ação não pode ser desfeita.
          </p>
          <form method="dialog" className="mt-4 flex gap-3">
            <button
              type="submit"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition-all duration-150 hover:bg-gray-100 active:bg-gray-200 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:hover:bg-gray-800 dark:active:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleConfirm}
              className="rounded-md bg-error-solid px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:bg-error-solid-hover active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-bg focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {isSaving ? "Salvando…" : "Sim, trocar o link"}
            </button>
          </form>
        </div>
      </dialog>
    </div>
  );
}

function StatusPill({ status }: { status: AvailabilityStatus }) {
  if (status === "checking") {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        Verificando disponibilidade…
      </span>
    );
  }

  if (status === "available") {
    return (
      <span className="flex items-center gap-1 text-xs text-success-fg">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        Disponível
      </span>
    );
  }

  if (status === "taken") {
    return (
      <span className="flex items-center gap-1 text-xs text-error-fg">
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        Este link já está em uso.
      </span>
    );
  }

  return null;
}
