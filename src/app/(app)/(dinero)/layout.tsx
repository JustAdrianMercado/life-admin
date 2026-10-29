import { SectionTabs } from "@/components/nav";

export default function DineroLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SectionTabs section="dinero" />
      {children}
    </>
  );
}
