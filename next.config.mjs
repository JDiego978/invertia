/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignorar errores de ESLint en el build de producción
  eslint: { ignoreDuringBuilds: true },
  // Ignorar errores de TypeScript en el build (ya los validamos manualmente)
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
