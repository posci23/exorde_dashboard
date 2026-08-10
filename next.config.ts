import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Builder + monitor merged into /query and /jobs; the docs pages into /reference.
  async redirects() {
    return [
      { source: "/preview", destination: "/query", permanent: false },
      { source: "/export", destination: "/jobs", permanent: false },
      { source: "/history", destination: "/jobs", permanent: false },
      { source: "/fields", destination: "/reference?tab=fields", permanent: false },
      { source: "/limits", destination: "/reference?tab=limits", permanent: false },
      { source: "/guide", destination: "/reference", permanent: false },
    ];
  },
};

export default nextConfig;
