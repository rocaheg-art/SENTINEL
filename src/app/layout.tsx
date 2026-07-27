import type { Metadata } from "next";
import { JetBrains_Mono, Inter, Instrument_Serif } from "next/font/google";
import { V3ContextProvider } from "@/context/V3Context";
import DashboardLayoutWrapper from "@/components/DashboardLayoutWrapper";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "SENTINEL | Analytics Engine",
  description: "Panel de control de inteligencia de redes sociales en tiempo real.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} h-full antialiased`}
      data-theme="light"
    >
      <body className="h-screen w-screen bg-background text-foreground overflow-hidden flex flex-col font-sans light">
        <V3ContextProvider>
          <DashboardLayoutWrapper>
            {children}
          </DashboardLayoutWrapper>
        </V3ContextProvider>
      </body>
    </html>
  );
}
