import { SiteHeader } from "@/components/SiteHeader";
import { ClientSidebar } from "@/components/ClientSidebar";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      {/* Franja coral superior (marca) */}
      <div className="h-1.5 bg-coral" />
      <SiteHeader />
      <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-6 lg:px-6">
        <ClientSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
