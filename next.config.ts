import type { NextConfig } from "next";

// Deriva o host do Supabase Storage a partir da URL do projeto para permitir
// `next/image` servir imagens públicas (logo da loja, fotos de produto) sem
// usar `images.domains` (depreciado). Ver 01-RESEARCH.md §Standard Stack.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  // Permite acessar o dev server via IP de rede local (ex.: testar em
  // celular real na mesma Wi-Fi) sem o Next bloquear os recursos de dev
  // (HMR) por origem cruzada — sem isso o JS não hidrata no celular e o
  // <form> cai no submit nativo GET, vazando credenciais na URL.
  allowedDevOrigins: ["172.20.10.12", "192.168.100.116", "192.168.1.242"],
  // Server Actions limitam o corpo a 1MB por padrão — separado do limite de
  // 5MB por foto já validado em `validatePhotoFile`. Até 5 fotos comprimidas
  // a ~1MB cada (browser-image-compression, meta não-garantida) + overhead
  // de multipart facilmente passam de 1MB somadas num único saveProduct.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
