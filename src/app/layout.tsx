import type { Metadata, Viewport } from "next";
import "@fontsource-variable/nunito-sans";
import "@/styles/globals.css";
import { APP_BRAND } from "@/config/brand";

export const metadata: Metadata = {
  applicationName: APP_BRAND.name,
  title: {
    default: APP_BRAND.name,
    template: `%s · ${APP_BRAND.name}`,
  },
  description: APP_BRAND.description,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_BRAND.shortName,
  },
  icons: {
    icon: "/icons/app-icon-192.png",
    apple: "/icons/app-icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: APP_BRAND.themeColor,
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
