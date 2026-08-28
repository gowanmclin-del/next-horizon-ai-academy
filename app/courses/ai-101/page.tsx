import type { Metadata } from "next";
import AI101PageClient from "@/components/marketing/AI101PageClient";

export const metadata: Metadata = {
  title: "AI-101: Foundations of Artificial Intelligence | Next Horizon AI Academy",
  description:
    "A beginner-friendly introduction to artificial intelligence: understanding AI, generative AI, prompting, everyday productivity, and responsible use. Earn the CAFP credential.",
  openGraph: {
    title: "AI-101: Foundations of Artificial Intelligence",
    description:
      "A beginner-friendly introduction to artificial intelligence, from Next Horizon AI Academy.",
    type: "website",
  },
};

export default function AI101Page() {
  return <AI101PageClient />;
}
