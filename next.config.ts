import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // The Playwright dev server is reached via 127.0.0.1 while Next binds localhost.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
