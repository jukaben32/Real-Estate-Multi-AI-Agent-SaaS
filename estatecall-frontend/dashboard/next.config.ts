import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El lockfile del backend queda arriba; fijamos la raíz para Turbopack.
  turbopack: { root: "./" },
};

export default nextConfig;
