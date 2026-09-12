import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cloudinary's delivery domain is fixed regardless of cloud name (the
    // cloud name lives in the URL path, not the host), so unlike the old
    // R2 setup this needs no env var at build time.
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
