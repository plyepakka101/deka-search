import LawMateWrapper from "@/components/LawMateWrapper";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ค้นหาตัวบทกฎหมาย | Thai Law Mate",
  description: "ระบบค้นหาตัวบทกฎหมาย เชื่อมต่อกับคำพิพากษาศาลฎีกา",
};

export default function LawsPage() {
  return <LawMateWrapper />;
}
