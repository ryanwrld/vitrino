/**
 * Escreve `text` na área de transferência (LOJA-04, D-12). Fronteira pura,
 * sem toast/sonner (T-02-11 do 02-RESEARCH.md) — quem chama decide como
 * reagir ao boolean: nunca lança, nunca falha silenciosamente sem sinalizar
 * (retorna `false` em vez de engolir o erro sem retorno nenhum).
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
