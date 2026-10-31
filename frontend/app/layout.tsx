import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/shell/Footer";

export const metadata: Metadata = {
  title: "SecondBrain for Founders — AI Due-Diligence War Room",
  description: "Face three hostile AI investors before pitching real venture capital.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col justify-between bg-background text-foreground antialiased">
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
