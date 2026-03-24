import { Inter, Outfit, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata = {
  title: "Arduino Day Mindanao 2026 - Registration",
  description: "Official Check-in system for Arduino Day Mindanao 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        inter.variable,
        outfit.variable,
        "font-sans",
        geist.variable,
      )}
      // No "dark" class — forces light mode regardless of OS preference
    >
      <body className="antialiased bg-slate-50 text-slate-900 font-inter min-h-screen">
        {children}
      </body>
    </html>
  );
}
