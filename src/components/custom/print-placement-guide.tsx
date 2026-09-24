import Image from "next/image";
import printPlacement from "../../../public/images/print-placement.jpg";

const PLACEMENTS = [
  { title: "Brand Logo", description: "Pocket area — ideal for subtle brand identity" },
  { title: "Chest", description: "Center chest — maximum visibility and impact" },
  { title: "Sleeve", description: "Left or right sleeve — modern and trendy" },
  { title: "A4 Print", description: "Back A4 size — great for detailed designs" },
  { title: "A3 Print", description: "Back A3 size — full back statement piece" },
  { title: "Collar", description: "Inside collar — premium branding touch" },
];

export function PrintPlacementGuide({ requestHref }: { requestHref: string | null }) {
  return (
    <section id="placements" className="scroll-mt-20 bg-foreground text-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
            Customization
          </span>
          <h2 className="mt-5 font-display text-4xl tracking-tight sm:text-5xl">Know Your Print Placement</h2>
          <p className="mt-4 text-base leading-relaxed text-background/70 sm:text-lg">
            Choose from 6 strategic print positions to make your brand pop. All printing charges are included in our
            pricing.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 items-center gap-8 lg:mt-16 lg:grid-cols-2 lg:gap-12">
          <div className="overflow-hidden rounded-3xl bg-white p-2 shadow-2xl shadow-black/40">
            <Image
              src={printPlacement}
              alt="Print placement guide: brand logo, chest, sleeve, A4, A3 and collar positions"
              sizes="(max-width: 1024px) 100vw, 560px"
              className="h-auto w-full rounded-2xl"
            />
          </div>

          <ol className="space-y-3">
            {PLACEMENTS.map((placement, i) => (
              <li
                key={placement.title}
                className="flex items-center gap-5 rounded-2xl border border-background/10 bg-background/[0.03] px-5 py-4 transition-colors hover:border-accent/40 hover:bg-background/[0.06]"
              >
                <span className="w-9 flex-none font-display text-2xl text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block font-semibold">{placement.title}</span>
                  <span className="block text-sm text-background/60">{placement.description}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {requestHref && (
          <p className="mt-10 text-center text-sm text-background/60">
            Sleeve and collar prints are made on request —{" "}
            <a
              href={requestHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-accent underline underline-offset-4"
            >
              message us on WhatsApp
            </a>
            .
          </p>
        )}
      </div>
    </section>
  );
}
