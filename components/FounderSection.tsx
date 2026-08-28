export default function FounderSection() {
  return (
    <section className="bg-horizon-cloud py-20 sm:py-28">
      <div className="container-page">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="mx-auto w-full max-w-sm">
            {/*
              FOUNDER PHOTO — how to replace this placeholder:
              1. Add a real photo to /public/images/founder.jpg (or .png).
              2. Replace the placeholder <div> below with:
                   import Image from "next/image";
                   <Image
                     src="/images/founder.jpg"
                     alt="Gowan Mclin, Founder and President of Next Horizon AI Academy"
                     width={480}
                     height={480}
                     className="w-full rounded-2xl object-cover shadow-md"
                   />
              This is the only place the founder photo appears — no other
              component needs to change. See docs/OWNER-ACTION-GUIDE.md.
            */}
            <div
              className="flex aspect-square w-full items-center justify-center rounded-2xl bg-gradient-to-br from-horizon-navy to-horizon-blue text-white shadow-md"
              role="img"
              aria-label="Placeholder photo of Gowan Mclin, Founder and President"
            >
              <span className="font-heading text-6xl font-extrabold opacity-80">
                GM
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-horizon-blue">
              Built From a Learner&rsquo;s Perspective
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-horizon-navy sm:text-4xl">
              Gowan Mclin
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Founder &amp; President
            </p>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Gowan founded Next Horizon AI Academy after experiencing
              firsthand how artificial intelligence could improve learning,
              productivity, creativity, and problem-solving. After beginning
              his own AI journey with little prior knowledge, he saw an
              opportunity to help millions of other people confidently
              understand and benefit from this technology.
            </p>
            <div className="mt-8">
              <a
                href="/about"
                className="rounded-md border border-horizon-blue px-6 py-3 text-sm font-semibold text-horizon-blue transition-colors hover:bg-horizon-blue hover:text-white"
              >
                Read Our Story
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
