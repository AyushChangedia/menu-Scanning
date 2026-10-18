import {
  Bean,
  Candy,
  Citrus,
  Droplets,
  Flame,
  FlameKindling,
  Leaf,
  Milk,
  Nut,
  Pizza,
  Popcorn,
  Soup,
  type LucideIcon,
} from "lucide-react";

import type { FlavorId } from "@/lib/taste";

export const FLAVOR_ICON: Record<FlavorId, LucideIcon> = {
  spicy: Flame,
  cheesy: Pizza,
  creamy: Milk,
  tangy: Citrus,
  sweet: Candy,
  smoky: FlameKindling,
  garlicky: Bean,
  herby: Leaf,
  crispy: Popcorn,
  umami: Soup,
  saucy: Droplets,
  nutty: Nut,
};
