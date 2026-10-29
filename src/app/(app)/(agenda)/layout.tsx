import { SectionTabs } from "@/components/nav";

export default function AgendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SectionTabs section="agenda" />
      {children}
    </>
  );
}
