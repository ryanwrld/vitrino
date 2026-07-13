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
  allowedDevOrigins: ["172.20.10.12"],
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
