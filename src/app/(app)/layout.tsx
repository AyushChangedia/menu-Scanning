import { ScanPickerProvider } from "@/components/providers/scan-picker";
import { GradientBlobs } from "@/components/shared/gradient-blobs";
import { AppHeader } from "@/components/shell/app-header";
import { BottomTabs, ScanFab } from "@/components/shell/bottom-tabs";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ScanPickerProvider>
      <GradientBlobs variant="subtle" />
      <AppHeader />
      <main className="mx-auto w-full max-w-md px-gutter pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))] pt-7">
        {children}
      </main>
      <ScanFab />
      <BottomTabs />
    </ScanPickerProvider>
  );
}
