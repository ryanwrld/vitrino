"use client";

import { useEffect, useState } from "react";

/**
 * Debounce de um valor de estado que muda rápido (ex.: digitação em tempo
 * real). Usado pelo editor de slug (plan 02-05, D-03, ~400ms) para não
 * disparar a checagem de disponibilidade a cada tecla — dispara só depois
 * que o valor "assenta" por `delayMs`.
 *
 * Primeiro hook de debounce do projeto (02-RESEARCH.md Pattern 2, sem
 * precedente no codebase).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
