/**
 * Decisão pura do botão "Pedir agora" (PED-04), isolada do DOM para dar
 * cobertura de teste em milissegundos sem precisar simular clique/evento.
 *
 * D-02 proíbe desabilitar o botão quando nenhum tamanho está selecionado —
 * em vez disso, o clique é interceptado (guard) e o CTA "sacode" (feedback
 * visual) sem navegar. Este módulo só decide o QUÊ fazer; o componente que
 * consome `decideOrderAction` é responsável por aplicar `preventDefault()` e
 * disparar a animação quando `shouldShake` é `true`.
 */

export function decideOrderAction(selectedSize: number | null): {
  shouldNavigate: boolean;
  shouldShake: boolean;
} {
  if (selectedSize === null) {
    return { shouldNavigate: false, shouldShake: true };
  }
  return { shouldNavigate: true, shouldShake: false };
}
