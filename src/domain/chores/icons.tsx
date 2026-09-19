import {
  Bath,
  BedDouble,
  BrushCleaning,
  CarFront,
  CookingPot,
  House,
  Leaf,
  ListChecks,
  Package,
  PawPrint,
  Shirt,
  ShoppingBasket,
  Sparkles,
  Toilet,
  Trash2,
  Utensils,
  Wind,
  type LucideIcon,
} from "lucide-react";

export const CHORE_ICON_KEYS = [
  "paw",
  "trash",
  "sparkle",
  "bed",
  "laundry",
  "utensils",
  "plants",
  "bathtub",
  "toilet",
  "vacuum",
  "broom",
  "dishes",
  "groceries",
  "car",
  "package",
  "home",
  "checklist",
] as const;

export type ChoreIconKey = (typeof CHORE_ICON_KEYS)[number];

export type ChoreIconOption = {
  key: ChoreIconKey;
  label: string;
  icon: LucideIcon;
};

export const CHORE_ICONS: readonly ChoreIconOption[] = [
  { key: "paw", label: "Pet care", icon: PawPrint },
  { key: "trash", label: "Trash", icon: Trash2 },
  { key: "sparkle", label: "Cleaning", icon: Sparkles },
  { key: "bed", label: "Bed", icon: BedDouble },
  { key: "laundry", label: "Laundry", icon: Shirt },
  { key: "utensils", label: "Meals", icon: Utensils },
  { key: "plants", label: "Plants", icon: Leaf },
  { key: "bathtub", label: "Bathtub", icon: Bath },
  { key: "toilet", label: "Toilet", icon: Toilet },
  { key: "vacuum", label: "Vacuum", icon: Wind },
  { key: "broom", label: "Broom", icon: BrushCleaning },
  { key: "dishes", label: "Dishes", icon: CookingPot },
  { key: "groceries", label: "Groceries", icon: ShoppingBasket },
  { key: "car", label: "Car", icon: CarFront },
  { key: "package", label: "Packages", icon: Package },
  { key: "home", label: "Home", icon: House },
  { key: "checklist", label: "Checklist", icon: ListChecks },
] as const;

export function getChoreIcon(key: string): ChoreIconOption {
  return CHORE_ICONS.find((option) => option.key === key) ?? {
    key: "checklist",
    label: "Checklist",
    icon: ListChecks,
  };
}
