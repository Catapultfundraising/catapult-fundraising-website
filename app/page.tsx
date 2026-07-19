import { Hero } from "@/components/hero";
import { ServicesOverview } from "@/components/services-overview";
import { ProcessTimeline } from "@/components/process-timeline";
import { SectorsServed } from "@/components/sectors-served";
import { TestimonialStrip } from "@/components/testimonial-strip";
import { CtaBand } from "@/components/cta-band";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServicesOverview />
      <ProcessTimeline />
      <SectorsServed />
      <TestimonialStrip />
      <CtaBand />
    </>
  );
}
