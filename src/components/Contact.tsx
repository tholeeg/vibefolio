export default function Contact() {
  return (
    <section className="px-12 py-48 bg-black" id="contact">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-headline font-black text-6xl md:text-8xl kerning-tight mb-16">
          READY_TO_DEPLOY?
        </h2>
        <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
          <a
            className="px-12 py-5 bg-primary text-on-primary font-headline font-black text-sm tracking-widest uppercase hover:bg-primary-fixed transition-all duration-300"
            href="mailto:connect@architect.ia"
          >
            ESTABLISH_UPLINK
          </a>
          <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest max-w-[150px] text-left">
            ESTIMATED RESPONSE LATENCY: &lt; 24 HOURS
          </p>
        </div>
      </div>
    </section>
  );
}
