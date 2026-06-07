import { Hero } from "@/components/sections/hero";
import { WhyNumerology } from "@/components/sections/why-numerology";
import { AboutLiliana } from "@/components/sections/about-liliana";
import { Consultations } from "@/components/sections/consultations";

/**
 * Home — the marketing landing: hero (#23), trust sections (#24), and the
 * consultations grid (#25).
 */
export default function Home() {
  return (
    <>
      <Hero />
      <WhyNumerology />
      <AboutLiliana />
      <Consultations />
    </>
  );
}
