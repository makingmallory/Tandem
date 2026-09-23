export const APP_BRAND = {
  name: "Tandem",
  shortName: "Tandem",
  tagline: "Better together at home",
  description: "A cheerful shared home dashboard for the things you do together.",
  notificationTitle: "A little nudge from Tandem",
  themeColor: "#176b5b",
  backgroundColor: "#f8f3e9",
  iconPath: "/icons/app-icon.svg",
} as const;

export type AppBrand = typeof APP_BRAND;
