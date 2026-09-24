import { Hero } from "@/components/sections/hero";
import { FirstSession } from "@/components/sections/first-session";
import { Universe } from "@/components/sections/universe";
import { WhyNumerology } from "@/components/sections/why-numerology";
import { AboutLiliana } from "@/components/sections/about-liliana";

/**
 * Home (plan section 8, "/"): the general promise and the two CTAs (hero),
 * the first session as the one product on sale, the 729 universe with the
 * services in preparation, then the trust sections.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <FirstSession />
      <Universe />
      <WhyNumerology />
      <AboutLiliana />
    </>
  );
}
