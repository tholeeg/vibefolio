import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { lenisStore } from "./lenisStore";
import { MotionProvider } from "./lib/MotionProvider";
import { useMotion } from "./lib/useMotion";
import { EASE } from "./lib/easings";
import BackgroundShader from "./components/BackgroundShader";
import PostFXOverlay from "./components/PostFXOverlay";
import Cursor from "./components/Cursor";
import GlassLens from "./components/GlassLens";
import CommandPalette from "./components/CommandPalette";
import NavBar from "./components/NavBar";
import Hero from "./components/Hero";
import ProjectGrid from "./components/ProjectGrid";
import Methodology from "./components/Methodology";
import SectionDivider from "./components/SectionDivider";
import Footer from "./components/Footer";
import StandaloneProjectCard from "./components/StandaloneProjectCard";

gsap.registerPlugin(ScrollTrigger);

const isPoc = new URLSearchParams(window.location.search).has("poc");

function SmoothScroll() {
  const { prefersReducedMotion } = useMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      // Native scroll only — no Lenis, no scrub. ScrollTriggers still work.
      const onScroll = () => ScrollTrigger.update();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    const lenis = new Lenis({
      lerp: 0.08,
      easing: EASE.lenisDefault,
    });
    lenisStore.instance = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    let alive = true;
    const syncScrollHeight = () => {
      if (!alive) return;
      ScrollTrigger.refresh();
      lenis.resize();
    };
    const raf1 = requestAnimationFrame(() => {
      syncScrollHeight();
      requestAnimationFrame(syncScrollHeight);
    });
    const t150 = setTimeout(syncScrollHeight, 150);
    const t500 = setTimeout(syncScrollHeight, 500);
    if (document.fonts?.ready) {
      void document.fonts.ready.then(syncScrollHeight);
    }

    return () => {
      alive = false;
      cancelAnimationFrame(raf1);
      clearTimeout(t150);
      clearTimeout(t500);
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
      lenisStore.instance = null;
    };
  }, [prefersReducedMotion]);

  return null;
}

export default function App() {
  if (isPoc) {
    return (
      <MotionProvider>
        <StandaloneProjectCard />
      </MotionProvider>
    );
  }

  return (
    <MotionProvider>
      <BackgroundShader />
      <PostFXOverlay />
      <SmoothScroll />
      <Cursor />
      <GlassLens />
      <CommandPalette />
      <NavBar />
      {/* No pb-* here: avoids a phantom scroll notch under Methodology;
          the Footer is handled by GSAP `pinSpacing`. */}
      <div
        className="relative w-full pb-0"
        style={{ overflowX: "clip", zIndex: "var(--z-content)" as unknown as number }}
      >
        <main className="min-h-0 min-w-0 w-full max-w-full pb-0">
          <div data-section="hero">
            <Hero />
          </div>
          <SectionDivider index="01" label="OUTPUTS" next="PROJECTS" />
          <div data-section="projects">
            <ProjectGrid />
          </div>
          <SectionDivider index="02" label="METHODOLOGY" next="PROCESS" />
          <div data-section="methodology">
            <Methodology />
          </div>
        </main>
        <div data-section="footer">
          <Footer />
        </div>
      </div>
    </MotionProvider>
  );
}
