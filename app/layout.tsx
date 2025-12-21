// app/layout.tsx
import type { Metadata } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";
import { AnimationSyncProvider } from "@/context/AnimationSyncContext";
import { MatrixBackground } from "@/components/MatrixBackground";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "700", "900"],
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  variable: "--font-rajdhani",
  weight: ["300", "500", "700"],
});

export const metadata: Metadata = {
  title: "TIEMPOSPRO v4.1 | Phront Maestro",
  description: "Next-Generation Betting Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${orbitron.variable} ${rajdhani.variable} font-sans antialiased bg-cyber-black text-white min-h-screen relative overflow-x-hidden`}>
        <div className="cinematic-grain" />
        <div className="neural-bg">
          <div className="star-dust" />
          <div className="neural-web" />
          <div className="neural-breath" />
        </div>
        <AnimationSyncProvider>
          <div className="relative z-10">
            <MatrixBackground />
            {children}
          </div>
        </AnimationSyncProvider>
      </body>
    </html>
  );
}
