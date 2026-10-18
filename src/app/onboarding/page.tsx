import type { Metadata } from "next";

import { OnboardingView } from "@/components/pages/onboarding-view";

export const metadata: Metadata = { title: "Set up your taste" };

export default function OnboardingPage() {
  return <OnboardingView />;
}
