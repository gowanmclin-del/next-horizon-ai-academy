import Hero from "@/components/Hero";
import ValueStrip from "@/components/ValueStrip";
import FeaturedCourse from "@/components/FeaturedCourse";
import WhyNextHorizon from "@/components/WhyNextHorizon";
import HorizonNetwork from "@/components/HorizonNetwork";
import FounderSection from "@/components/FounderSection";
import FoundingClassCTA from "@/components/FoundingClassCTA";
import Newsletter from "@/components/Newsletter";

export default function Home() {
  return (
    <>
      <Hero />
      <ValueStrip />
      <FeaturedCourse />
      <WhyNextHorizon />
      <HorizonNetwork />
      <FounderSection />
      <FoundingClassCTA />
      <Newsletter />
    </>
  );
}
