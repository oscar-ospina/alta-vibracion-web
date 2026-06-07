import { Hero } from "@/components/sections/hero";
import { WhyNumerology } from "@/components/sections/why-numerology";
import { AboutLiliana } from "@/components/sections/about-liliana";

/**
 * Home — the marketing landing. Hero (#23) + trust sections (#24). The
 * consultations grid (#25) appends below next.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <WhyNumerology />
      <AboutLiliana />
    </>
  );
}
