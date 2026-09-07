import type { NextConfig } from "next";

function r2RemotePattern(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) return [];

  try {
    const url = new URL(publicUrl);
    return [
      {
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: r2RemotePattern(),
  },
};

export default nextConfig;
