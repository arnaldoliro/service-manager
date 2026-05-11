import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import Providers from "@/components/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tomcat Manager",
  description: "Gerenciador de serviços Tomcat",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#1f2937",
                color: "#f9fafb",
                border: "1px solid #374151",
              },
              success: { iconTheme: { primary: "#10b981", secondary: "#f9fafb" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#f9fafb" } },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
