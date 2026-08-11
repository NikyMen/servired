/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      // El alta de profesional manda foto de perfil y portada por el propio
      // server action (todavía no hay sesión para pasar por /api/upload).
      // Con el default de 1 MB, cualquier foto sacada con el celular rebota.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
