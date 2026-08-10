import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The builder and the job monitor were merged into /query and /jobs.
  async redirects() {
    return [
      { source: "/preview", destination: "/query", permanent: false },
      { source: "/export", destination: "/jobs", permanent: false },
      { source: "/history", destination: "/jobs", permanent: false },
    ];
  },
};

export default nextConfig;
