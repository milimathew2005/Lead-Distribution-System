import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini Lead Distribution System",
  description:
    "A full-stack lead distribution system that allocates customer service requests to providers using round-robin assignment with PostgreSQL persistence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
