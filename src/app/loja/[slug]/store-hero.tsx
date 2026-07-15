import { ImageWithFallback } from "./image-with-fallback";

export type StoreHeroData = {
  name: string;
  logoUrl: string | null;
  accentColor: string | null;
  tagline: string | null;
};

/**
 * Hero proeminente no topo da vitrine (D-12/D-13, Server Component). Sem
 * analog direto no codebase (nenhum "hero" de loja existe hoje) — compõe a
 * partir dos campos já lidos por src/app/(admin)/configuracoes/settings-form.tsx
 * (logo_url/accent_color/tagline), mas como exibição pública, não formulário.
 *
 * Cor de destaque da loja como fundo/acento (D-12) — fallback para o verde
 * escuro de marca (#000000) quando a loja não configurou uma cor própria.
 * A frase de apresentação SÓ renderiza quando preenchida (D-13) — sem
 * elemento/espaço vazio quando ausente.
 */
export function StoreHero({ store }: { store: StoreHeroData }) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl px-6 py-8 text-center text-white"
      style={{ backgroundColor: store.accentColor ?? "#000000" }}
    >
      <div className="relative h-16 w-16 overflow-hidden rounded-full bg-white/20">
        <ImageWithFallback src={store.logoUrl} alt={store.name} />
      </div>
      <h1 className="text-2xl font-bold">{store.name}</h1>
      {store.tagline && <p className="max-w-sm text-sm text-white/90">{store.tagline}</p>}
    </div>
  );
}
