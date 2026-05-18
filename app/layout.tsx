import type { Metadata } from "next";
import "./globals.css";
import { BasketProvider } from "../components/BasketContext";

export const metadata: Metadata = {
  title: "QuickCart — Compare Grocery Prices",
  description: "Compare prices across Blinkit, Instamart, and Zepto instantly.",
  keywords: "blinkit, jiomart, zepto, price comparison, grocery",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <BasketProvider>{children}</BasketProvider>
      </body>
    </html>
  );
}
