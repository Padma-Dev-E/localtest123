import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "GitLab Operations",
  description: "Read-only delivery intelligence for GitLab projects, pipelines, jobs, and runners.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
