import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["jszip", "@cursor/sdk"],
};

export default nextConfig;
