import type { Metadata } from "next";

import { RequireAccount } from "@/components/auth/guards";
import { OnboardingView } from "@/components/pages/onboarding-view";

export const metadata: Metadata = { title: "Set up your taste" };

export default function OnboardingPage() {
  return (
    <RequireAccount onboarding>
      <OnboardingView />
    </RequireAccount>
  );
}
