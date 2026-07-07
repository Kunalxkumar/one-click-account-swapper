import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "One-Click Account Swapper",
  description: "Securely swap between multiple accounts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans">
        {children}
      </body>
    </html>
  );
}
