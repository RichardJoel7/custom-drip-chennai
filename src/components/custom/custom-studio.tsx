"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { DesignHubDialog } from "@/components/custom/design-hub-dialog";
import { TeeMockup, type TeeView } from "@/components/custom/tee-mockup";
import { Button } from "@/components/ui/button";
import {
  MAX_CUSTOM_QUANTITY,
  SIDE_LABELS,
  customCartKey,
  gsmLabel,
  printPriceFor,
  sidesNeedBack,
  sidesNeedFront,
} from "@/lib/custom/pricing";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import type { CustomCartItem, CustomCatalog, CustomPrintOption, PrintSides, StudioDesign } from "@/types";

const SIDES: PrintSides[] = ["front", "back", "both"];

function formatCm(option: Pick<CustomPrintOption, "width_cm" | "height_cm">) {
  return `${option.width_cm} × ${option.height_cm} cm`;
}

export function CustomStudio({
  catalog,
  designs,
  ownArtworkHref,
}: {
  catalog: CustomCatalog;
  designs: StudioDesign[];
  ownArtworkHref: string | null;
}) {
  const { sizes, colors, gsmOptions, printOptions } = catalog;
  const router = useRouter();
  const { addItem } = useCart();

  const sideAvailable = useCallback(
    (sides: PrintSides) => printOptions.some((o) => printPriceFor(o, sides) !== null),
    [printOptions]
  );
  const initialSides = SIDES.find(sideAvailable) ?? "front";

  const [colorId, setColorId] = useState(colors[0]?.id ?? "");
  const [sizeId, setSizeId] = useState(
    (sizes.find((s) => s.label.toUpperCase() === "L") ?? sizes[Math.floor(sizes.length / 2)])?.id ?? ""
  );
  const [gsmId, setGsmId] = useState(gsmOptions[0]?.id ?? null);
  const [sides, setSides] = useState<PrintSides>(initialSides);
  const [printOptionId, setPrintOptionId] = useState(
    printOptions.find((o) => printPriceFor(o, initialSides) !== null)?.id ?? ""
  );
  const [frontDesign, setFrontDesign] = useState<StudioDesign | null>(null);
  const [backDesign, setBackDesign] = useState<StudioDesign | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [view, setView] = useState<TeeView>(initialSides === "back" ? "back" : "front");
  const [showGuide, setShowGuide] = useState(true);
  const [hubSide, setHubSide] = useState<TeeView | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const designStepRef = useRef<HTMLElement>(null);

  const color = colors.find((c) => c.id === colorId) ?? colors[0];
  const size = sizes.find((s) => s.id === sizeId) ?? sizes[0];
  const gsm = gsmOptions.find((g) => g.id === gsmId) ?? null;
  const option = printOptions.find((o) => o.id === printOptionId);
  const needFront = sidesNeedFront(sides);
  const needBack = sidesNeedBack(sides);
  // No GSM choice offered = nothing extra to pay; offered but none picked = no price yet.
  const gsmPrice = gsmOptions.length === 0 ? 0 : gsm ? gsm.price : null;
  const printPrice = option ? printPriceFor(option, sides) : null;
  const unitPrice = size && gsmPrice !== null && printPrice !== null ? size.price + gsmPrice + printPrice : null;
  const total = unitPrice === null ? null : unitPrice * quantity;
  const sizePricesVary = new Set(sizes.map((s) => s.price)).size > 1;

  const missing = useMemo(() => {
    const list: string[] = [];
    if (gsmOptions.length > 0 && !gsm) list.push("a fabric weight");
    if (!option || printPrice === null) list.push("a print size");
    if (needFront && !frontDesign) list.push("a front design");
    if (needBack && !backDesign) list.push("a back design");
    return list;
  }, [gsmOptions.length, gsm, option, printPrice, needFront, needBack, frontDesign, backDesign]);

  function chooseSides(next: PrintSides) {
    setSides(next);
    if (!option || printPriceFor(option, next) === null) {
      setPrintOptionId(printOptions.find((o) => printPriceFor(o, next) !== null)?.id ?? "");
    }
    setView(next === "back" ? "back" : "front");
  }

  const closeHub = useCallback(() => setHubSide(null), []);

  const pickDesign = useCallback(
    (design: StudioDesign) => {
      if (hubSide === "back") setBackDesign(design);
      else setFrontDesign(design);
      setView(hubSide ?? "front");
      setHubSide(null);
      // On phones the preview is far above the steps — bring it back so the change is seen.
      if (window.matchMedia("(max-width: 1023px)").matches) {
        requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    },
    [hubSide]
  );

  function buildCartItem(): CustomCartItem | null {
    if (missing.length > 0 || !color || !size || !option || unitPrice === null) return null;
    const config = {
      colorId: color.id,
      sizeId: size.id,
      gsmId: gsm?.id ?? null,
      printOptionId: option.id,
      sides,
      frontDesignId: needFront ? frontDesign?.id ?? null : null,
      backDesignId: needBack ? backDesign?.id ?? null : null,
    };
    return {
      kind: "custom",
      key: customCartKey(config),
      config,
      name: "Custom Tee",
      colorName: color.name,
      colorHex: color.hex,
      sizeLabel: size.label,
      gsmLabel: gsm ? gsmLabel(gsm.gsm) : null,
      printOption: {
        name: option.name,
        width_cm: option.width_cm,
        height_cm: option.height_cm,
        front_placement: option.front_placement,
      },
      frontDesign: needFront ? frontDesign : null,
      backDesign: needBack ? backDesign : null,
      price: unitPrice,
      quantity,
      maxStock: MAX_CUSTOM_QUANTITY,
    };
  }

  function handleAdd(goToCheckout: boolean) {
    const item = buildCartItem();
    if (!item) {
      setAttempted(true);
      designStepRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    addItem(item);
    if (goToCheckout) {
      router.push("/checkout");
      return;
    }
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2500);
  }

  const frontUrl = needFront ? frontDesign?.image_url : null;
  const backUrl = needBack ? backDesign?.image_url : null;
  const guideLabel = option ? `${option.name} · ${formatCm(option)}` : undefined;

  // Steps are numbered as they render, since the GSM step only shows when GSM options exist.
  let stepCount = 0;
  const nextStep = () => String(++stepCount).padStart(2, "0");

  const mockupFor = (side: TeeView, extra?: { className?: string; imageWidth?: number; guide?: boolean }) => {
    const printsThisSide = side === "front" ? needFront : needBack;
    return (
      <TeeMockup
        colorHex={color?.hex ?? "#111111"}
        view={side}
        printArea={printsThisSide ? option : null}
        designUrl={side === "front" ? frontUrl : backUrl}
        showGuide={extra?.guide ?? showGuide}
        guideLabel={guideLabel}
        imageWidth={extra?.imageWidth}
        className={extra?.className ?? "w-full"}
        title={`${side === "front" ? "Front" : "Back"} preview of your custom tee`}
      />
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-12">
        {/* PREVIEW */}
        <div ref={previewRef} className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-[radial-gradient(circle_at_50%_32%,#ffffff_0%,#f1f1ee_55%,#e6e6e2_100%)] p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex rounded-full border border-border bg-background p-1" role="tablist" aria-label="Preview side">
                {(["front", "back"] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    role="tab"
                    aria-selected={view === side}
                    onClick={() => setView(side)}
                    className={cn(
                      "h-9 rounded-full px-4 text-xs font-semibold uppercase tracking-wide transition-colors",
                      view === side ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {side}
                  </button>
                ))}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showGuide}
                onClick={() => setShowGuide((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                <span
                  className={cn(
                    "relative h-5 w-9 rounded-full transition-colors",
                    showGuide ? "bg-foreground" : "bg-border"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0 top-0.5 h-4 w-4 rounded-full bg-background transition-transform",
                      showGuide ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </span>
                Print area
              </button>
            </div>

            <div className="mx-auto mt-2 max-w-xl perspective-[1600px]">
              <div
                className={cn(
                  "relative transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] transform-3d",
                  view === "back" && "rotate-y-180"
                )}
              >
                <div className="backface-hidden">{mockupFor("front")}</div>
                <div className="absolute inset-0 rotate-y-180 backface-hidden">{mockupFor("back")}</div>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
              {color && (
                <span className="flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5">
                  <span className="h-3 w-3 rounded-full border border-black/15" style={{ backgroundColor: color.hex }} />
                  {color.name}
                </span>
              )}
              {size && <span className="rounded-full bg-background px-3 py-1.5">Size {size.label}</span>}
              {gsm && <span className="rounded-full bg-background px-3 py-1.5">{gsmLabel(gsm.gsm)}</span>}
              {option && (
                <span className="rounded-full bg-background px-3 py-1.5">
                  {option.name} · {SIDE_LABELS[sides]}
                </span>
              )}
            </div>

            {sides === "both" && (
              <button
                type="button"
                onClick={() => setView(view === "front" ? "back" : "front")}
                className="absolute bottom-16 right-4 w-20 rounded-2xl border border-border bg-background/90 p-1.5 shadow-lg backdrop-blur transition-transform hover:scale-105 sm:bottom-20 sm:right-6 sm:w-24"
                aria-label={`Show the ${view === "front" ? "back" : "front"}`}
              >
                {mockupFor(view === "front" ? "back" : "front", { guide: false, imageWidth: 256 })}
                <span className="block text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {view === "front" ? "Back" : "Front"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* STEPS */}
        <div className="space-y-4">
          <Step index={nextStep()} title="Tee colour" aside={color?.name}>
            <div className="flex flex-wrap gap-3">
              {colors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.name}
                  aria-label={c.name}
                  aria-pressed={c.id === color?.id}
                  onClick={() => setColorId(c.id)}
                  className={cn(
                    "h-10 w-10 rounded-full border transition-all",
                    c.id === color?.id
                      ? "border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-background"
                      : "border-black/15 hover:scale-110"
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </Step>

          {gsmOptions.length > 0 && (
            <Step index={nextStep()} title="Fabric weight" aside={gsm ? gsmLabel(gsm.gsm) : undefined}>
              <div className="grid gap-2 sm:grid-cols-2">
                {gsmOptions.map((g) => {
                  const selected = g.id === gsm?.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setGsmId(g.id)}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-colors",
                        selected ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground"
                      )}
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold">{gsmLabel(g.gsm)}</span>
                        <span className="text-sm font-bold">{g.price > 0 ? `+${formatPrice(g.price)}` : "Included"}</span>
                      </span>
                      <WeightMeter gsm={g.gsm} />
                      {g.description && <span className="mt-1.5 block text-xs text-muted-foreground">{g.description}</span>}
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          <Step index={nextStep()} title="Print sides">
            <div className="grid grid-cols-3 gap-2">
              {SIDES.map((s) => {
                const available = sideAvailable(s);
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={!available}
                    aria-pressed={s === sides}
                    onClick={() => chooseSides(s)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-xs font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-35",
                      s === sides ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
                    )}
                  >
                    <SidesGlyph sides={s} />
                    {SIDE_LABELS[s]}
                  </button>
                );
              })}
            </div>
          </Step>

          <Step index={nextStep()} title="Print size" aside={option ? formatCm(option) : undefined}>
            <div className="grid gap-2 sm:grid-cols-2">
              {printOptions.map((o) => {
                const price = printPriceFor(o, sides);
                const selected = o.id === option?.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    disabled={price === null}
                    aria-pressed={selected}
                    onClick={() => setPrintOptionId(o.id)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      selected ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground"
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold">{o.name}</span>
                      <span className="text-sm font-bold">{price === null ? "—" : `+${formatPrice(price)}`}</span>
                    </span>
                    <span className="mt-0.5 block text-xs font-semibold text-muted-foreground">{formatCm(o)}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {price === null ? `Not available for ${SIDE_LABELS[sides].toLowerCase()}` : o.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </Step>

          <Step
            index={nextStep()}
            title="Your design"
            innerRef={designStepRef}
            invalid={attempted && ((needFront && !frontDesign) || (needBack && !backDesign))}
          >
            <div className="space-y-3">
              {needFront && (
                <DesignSlot
                  label="Front"
                  design={frontDesign}
                  onBrowse={() => setHubSide("front")}
                  onRemove={() => setFrontDesign(null)}
                />
              )}
              {needBack && (
                <DesignSlot
                  label="Back"
                  design={backDesign}
                  onBrowse={() => setHubSide("back")}
                  onRemove={() => setBackDesign(null)}
                />
              )}
              {sides === "both" && frontDesign && !backDesign && (
                <button
                  type="button"
                  onClick={() => {
                    setBackDesign(frontDesign);
                    setView("back");
                  }}
                  className="text-sm font-semibold underline underline-offset-4"
                >
                  Use the same design on the back
                </button>
              )}
              {ownArtworkHref && (
                <p className="text-xs text-muted-foreground">
                  Have your own artwork?{" "}
                  <a href={ownArtworkHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline underline-offset-4">
                    Send it to us on WhatsApp
                  </a>{" "}
                  and we&apos;ll print it for you.
                </p>
              )}
            </div>
          </Step>

          <Step index={nextStep()} title="Size & quantity" aside={size ? `Size ${size.label}` : undefined}>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={s.id === size?.id}
                  onClick={() => setSizeId(s.id)}
                  className={cn(
                    "flex min-w-14 flex-col items-center rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors",
                    s.id === size?.id ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
                  )}
                >
                  {s.label}
                  {sizePricesVary && (
                    <span className={cn("text-[11px] font-medium", s.id === size?.id ? "text-background/70" : "text-muted-foreground")}>
                      {formatPrice(s.price)}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <Link href="/size-guide" className="mt-3 inline-block text-xs font-semibold underline underline-offset-4">
              Size guide
            </Link>

            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-12 w-32 items-center rounded-full border border-border">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  className="flex h-full w-10 items-center justify-center text-lg"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <span className="flex-1 text-center text-sm font-semibold">{quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  className="flex h-full w-10 items-center justify-center text-lg"
                  onClick={() => setQuantity((q) => Math.min(MAX_CUSTOM_QUANTITY, q + 1))}
                >
                  +
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Need more than {MAX_CUSTOM_QUANTITY}?{" "}
                <Link href="/bulk-orders" className="font-semibold text-foreground underline underline-offset-4">
                  Bulk orders
                </Link>
              </p>
            </div>
          </Step>

          {/* SUMMARY */}
          <section className="rounded-3xl bg-foreground p-5 text-background sm:p-6">
            <div className="space-y-2 text-sm">
              <SummaryRow label={`Tee · size ${size?.label ?? "—"}`} value={size ? formatPrice(size.price) : "—"} />
              {gsmOptions.length > 0 && (
                <SummaryRow
                  label={`Fabric · ${gsm ? gsmLabel(gsm.gsm) : "—"}`}
                  value={!gsm ? "—" : gsm.price > 0 ? formatPrice(gsm.price) : "Included"}
                />
              )}
              <SummaryRow
                label={option ? `${option.name} · ${SIDE_LABELS[sides]}` : "Print"}
                value={printPrice === null ? "—" : formatPrice(printPrice)}
              />
              <SummaryRow label="Per tee" value={unitPrice === null ? "—" : formatPrice(unitPrice)} />
              <SummaryRow label="Quantity" value={`× ${quantity}`} />
            </div>
            <div className="mt-4 flex items-end justify-between border-t border-background/15 pt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-background/60">Total</span>
              <span
                key={total ?? "none"}
                className="font-display text-3xl tracking-wide animate-[price-pop_0.3s_ease-out]"
              >
                {total === null ? "—" : formatPrice(total)}
              </span>
            </div>

            {attempted && missing.length > 0 && (
              <p className="mt-3 text-sm font-semibold text-accent" role="alert">
                Almost there — choose {missing.join(" and ")}.
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="px-4"
                onClick={() => handleAdd(false)}
              >
                {justAdded ? "Added ✓" : "Add to Cart"}
              </Button>
              <Button
                size="lg"
                className="border border-background/30 bg-background px-4 text-foreground"
                onClick={() => handleAdd(true)}
              >
                Buy Now
              </Button>
            </div>
            {justAdded && (
              <Link href="/cart" className="mt-3 block text-center text-sm font-semibold underline underline-offset-4">
                View cart →
              </Link>
            )}

            <ul className="mt-5 grid gap-1.5 text-xs text-background/70 sm:grid-cols-3">
              <li>✓ Printing charges included</li>
              <li>✓ Printed on order in Chennai</li>
              <li>✓ Ships in 3–7 business days</li>
            </ul>
          </section>
        </div>
      </div>

      {/* MOBILE PRICE BAR */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <button
            type="button"
            onClick={() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="w-12 flex-none"
            aria-label="Show preview"
          >
            {mockupFor(view, { guide: false, imageWidth: 256 })}
          </button>
          <div className="min-w-0 flex-1">
            <p key={total ?? "none"} className="text-lg font-bold leading-tight animate-[price-pop_0.3s_ease-out]">
              {total === null ? "—" : formatPrice(total)}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {quantity} × {gsm ? `${gsmLabel(gsm.gsm)} · ` : ""}
              {option?.name ?? "Custom tee"} · {SIDE_LABELS[sides]}
            </p>
          </div>
          <Button size="md" className="px-5" onClick={() => handleAdd(false)}>
            {justAdded ? "Added ✓" : "Add to Cart"}
          </Button>
        </div>
      </div>

      {hubSide && (
        <DesignHubDialog
          designs={designs}
          sideLabel={hubSide === "front" ? "front" : "back"}
          selectedId={(hubSide === "front" ? frontDesign : backDesign)?.id ?? null}
          onSelect={pickDesign}
          onClose={closeHub}
        />
      )}
    </>
  );
}

function Step({
  index,
  title,
  aside,
  invalid,
  innerRef,
  children,
}: {
  index: string;
  title: string;
  aside?: string;
  invalid?: boolean;
  innerRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  return (
    <section
      ref={innerRef}
      className={cn(
        "scroll-mt-24 rounded-3xl border p-5 transition-colors sm:p-6",
        invalid ? "border-danger ring-1 ring-danger" : "border-border"
      )}
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="flex items-baseline gap-3 font-display text-lg tracking-wide">
          <span className="text-sm text-muted-foreground">{index}</span>
          {title.toUpperCase()}
        </h3>
        {aside && <span className="text-sm font-semibold text-muted-foreground">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function DesignSlot({
  label,
  design,
  onBrowse,
  onRemove,
}: {
  label: string;
  design: StudioDesign | null;
  onBrowse: () => void;
  onRemove: () => void;
}) {
  if (!design) {
    return (
      <button
        type="button"
        onClick={onBrowse}
        className="flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-border p-4 text-left transition-colors hover:border-foreground"
      >
        <span className="flex h-14 w-14 flex-none items-center justify-center rounded-xl bg-muted text-2xl" aria-hidden="true">
          +
        </span>
        <span>
          <span className="block font-semibold">Choose a {label.toLowerCase()} design</span>
          <span className="block text-sm text-muted-foreground">Browse the Design Hub</span>
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border p-3">
      <div className="checkerboard relative h-16 w-16 flex-none overflow-hidden rounded-xl">
        <Image src={design.image_url} alt={design.name} fill sizes="64px" className="object-contain p-1.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
          {design.category && <span className="font-medium normal-case tracking-normal"> · {design.category}</span>}
        </p>
        <p className="truncate font-semibold">{design.name}</p>
        <div className="mt-1 flex gap-4 text-xs font-semibold uppercase tracking-wide">
          <button type="button" onClick={onBrowse} className="underline underline-offset-4">
            Change
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label.toLowerCase()} design`}
            className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

/** A five-bar "how heavy is it" hint: 180 GSM fills two bars, 240 fills four. */
function WeightMeter({ gsm }: { gsm: number }) {
  const filled = Math.min(5, Math.max(1, Math.round((gsm - 100) / 40)));
  const word = gsm < 160 ? "Light" : gsm < 200 ? "Regular" : gsm < 260 ? "Heavy" : "Extra heavy";
  return (
    <span className="mt-2 flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={cn("h-1.5 w-5 rounded-full", i < filled ? "bg-foreground" : "bg-border")} />
      ))}
      <span className="ml-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{word}</span>
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-background/70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function SidesGlyph({ sides }: { sides: PrintSides }) {
  const tee = "M7 3 4 5.5 5.5 8.5 7 8v12h10V8l1.5.5L20 5.5 17 3h-2.5a2.5 2.5 0 0 1-5 0H7Z";
  return (
    <span className="flex gap-1" aria-hidden="true">
      {(["front", "back"] as const).map((side) => {
        const active = side === "front" ? sidesNeedFront(sides) : sidesNeedBack(sides);
        return (
          <svg key={side} width="18" height="18" viewBox="0 0 24 24">
            <path d={tee} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" opacity={active ? 1 : 0.4} />
          </svg>
        );
      })}
    </span>
  );
}
