import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TTT Email Automation",
  description: "TopTechTubers inbound-email routing, classification, and reply automation",
};

// Every page reads live DB state, so force dynamic rendering everywhere --
// nothing here should ever be statically prerendered at build time.
export const dynamic = "force-dynamic";

// Deliberately minimal: /login must render without the Sidebar (which
// queries DB state that shouldn't be reachable pre-auth) -- see
// src/app/(app)/layout.tsx for the authenticated app shell.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full text-neutral-900">{children}</body>
    </html>
  );
}
