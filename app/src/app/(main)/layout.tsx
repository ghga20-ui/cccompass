import BottomNav from "@/components/BottomNav";
import ChatBot from "@/components/ChatBot";
import { CohortProvider } from "@/contexts/CohortContext";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CohortProvider>
      <div className="min-h-dvh">
        <main className="pb-safe">{children}</main>
        <BottomNav />
        <ChatBot />
      </div>
    </CohortProvider>
  );
}
