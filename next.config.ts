import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  // CSP設定: Rechartsが内部でFunction constructorを使用するため unsafe-eval が必要
  // Note: 本番環境で問題が続く場合はCSPを一時的に無効化して調査
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://avatars.githubusercontent.com https://*.githubusercontent.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://api.github.com https://vercel.live https://va.vercel-scripts.com wss://ws-us3.pusher.com",
              "worker-src 'self' blob:",
              "frame-src 'self' https://vercel.live",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
