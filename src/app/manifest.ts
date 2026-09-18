import type { MetadataRoute } from "next";
import { APP_BRAND } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_BRAND.name,
    short_name: APP_BRAND.shortName,
    description: APP_BRAND.description,
    start_url: "/",
    display: "standalone",
    background_color: APP_BRAND.backgroundColor,
    theme_color: APP_BRAND.themeColor,
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/maskable-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
