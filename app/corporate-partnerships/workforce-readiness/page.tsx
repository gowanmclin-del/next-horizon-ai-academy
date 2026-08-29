import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import ReadinessAssessment from "@/components/partnerships/ReadinessAssessment";
export const metadata: Metadata = { title: "AI Workforce Readiness Assessment | Next Horizon AI Academy", description: "Assess AI adoption, governance, workforce confidence, and training readiness." };
export default function ReadinessPage(){return <><PageHero eyebrow="AI Workforce Readiness" title="Identify the Gap Between AI Interest and Responsible Adoption" description="Use this preliminary assessment to surface strengths, risks, and training priorities before designing a pilot or workforce program."/><section className="bg-horizon-cloud py-20"><div className="container-page max-w-4xl"><ReadinessAssessment/></div></section></>}
