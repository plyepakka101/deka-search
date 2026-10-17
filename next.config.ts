import withPWAInit from "@ducanh2912/next-pwa";
import path from "path";
import type { NextConfig } from "next";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  /* config options here */
};

export default withPWA(nextConfig);
