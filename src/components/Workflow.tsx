import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: "01",
    title: "Intent_Analysis",
    description:
      "Defining the creative north star through deep-dive stakeholder interrogation and mood mapping.",
  },
  {
    number: "02",
    title: "Neural_Scaffolding",
    description:
      "Selecting architecture weights and training sets that align with the required aesthetic and logical output.",
  },
  {
    number: "03",
    title: "Vibe_Tuning",
    description:
      "The high-precision phase where we adjust hyper-parameters to find the soul within the system.",
  },
  {
    number: "04",
    title: "Final_Synthetis",
    description:
      "Hardening the code into a production-ready, ultra-performant interface that exceeds expectations.",
  },
];

export default function Workflow() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<Element>(".workflow-step").forEach((step, i) => {
        gsap.from(step, {
          scrollTrigger: {
            trigger: step,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
          y: 50,
          opacity: 0,
          duration: 0.7,
          delay: i * 0.1,
          ease: "power3.out",
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-48 bg-surface-dim" id="methodology">
      <div className="px-12 mb-32">
        <h2 className="font-headline font-black text-8xl md:text-[10rem] text-primary/5 tracking-tighter absolute select-none pointer-events-none">
          METHODOLOGY
        </h2>
        <div className="relative z-10 pt-16 md:pt-32">
          <h3 className="font-headline font-extrabold text-4xl mb-4 border-l-4 border-secondary-fixed pl-8">
            HUMAN_MACHINE_LOOP
          </h3>
          <p className="font-body text-on-surface-variant max-w-xl ml-10">
            Optimizing the creative workflow: Human intuition guides prompt
            engineering with Gemini for perfect input, which is then processed by
            Cursor (connected to Claude) for rapid, high-fidelity design
            execution.
          </p>
        </div>
      </div>

      <div className="px-12 grid grid-cols-1 md:grid-cols-4 gap-0 relative">
        <div className="hidden md:block absolute top-0 left-12 right-12 h-px bg-outline-variant/20" />

        {steps.map((step) => (
          <div
            key={step.number}
            className="workflow-step pt-12 border-t md:border-t-0 md:border-l border-outline-variant/20 p-8 hover:bg-white/5 transition-all group"
          >
            <span className="font-label text-4xl font-bold text-primary-fixed mb-8 block group-hover:scale-110 transition-transform origin-left">
              {step.number}
            </span>
            <h4 className="font-headline font-bold text-lg mb-4 uppercase">
              {step.title}
            </h4>
            <p className="font-body text-sm text-on-surface-variant leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
