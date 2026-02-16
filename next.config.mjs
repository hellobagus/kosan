/** @type {import('next').NextConfig} */
const nextConfig = {
  // Izinkan request dari IP/domain server saat akses dari 43.173.1.89 (dev)
  allowedDevOrigins: [
    'http://43.173.1.89',
    'http://43.173.1.89:3000',
    'https://43.173.1.89',
    'https://43.173.1.89:3000',
  ],
};

export default nextConfig;
