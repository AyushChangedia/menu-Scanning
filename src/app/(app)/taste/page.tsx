import type { Metadata } from "next";

import { TasteView } from "@/components/pages/taste-view";

export const metadata: Metadata = { title: "Taste" };

export default function TastePage() {
  return <TasteView />;
}
