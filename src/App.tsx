import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { lenisStore } from "./lenisStore";
import NavBar from "./components/NavBar";
import Hero from "./components/Hero";
import ProjectGrid from "./components/ProjectGrid";
import Methodology from "./components/Methodology";
import Footer from "./components/Footer";
import StandaloneProjectCard from "./components/StandaloneProjectCard";

gsap.registerPlugin(ScrollTrigger);

const isPoc = new URLSearchParams(window.location.search).has("poc");

export default function App() {
  useEffect(() => {
    if (isPoc) return;
    const lenis = new Lenis();
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
  }, []);

  if (isPoc) return <StandaloneProjectCard />;

  return (
    <>
      <NavBar />
      {/* Pas de pb-* ici : évite un cran de scroll sous Methodology ; Footer géré par pinSpacing GSAP */}
      <div className="relative w-full pb-0" style={{ overflowX: "clip" }}>
        <main className="min-h-0 min-w-0 w-full max-w-full pb-0">
          <Hero />
          <ProjectGrid />
          <Methodology />
        </main>
        <Footer />
      </div>
    </>
  );
}
