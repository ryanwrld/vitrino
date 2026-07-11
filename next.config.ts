import type { NextConfig } from "next";

// Deriva o host do Supabase Storage a partir da URL do projeto para permitir
// `next/image` servir imagens públicas (logo da loja, fotos de produto) sem
// usar `images.domains` (depreciado). Ver 01-RESEARCH.md §Standard Stack.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
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
