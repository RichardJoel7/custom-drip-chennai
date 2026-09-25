"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { useCart } from "@/components/cart/cart-context";
import { DesignHubDialog, type HubTab } from "@/components/custom/design-hub-dialog";
import { GarmentMockup, type MockupEditor, type MockupPrint } from "@/components/custom/garment-mockup";
import { Button } from "@/components/ui/button";
import {
  MIN_PRINT_SCALE,
  colorPhotosOf,
  garmentSpec,
  printDpi,
  printMeasurements,
  printRect,
  rectsOverlap,
  transformFor,
} from "@/lib/custom/mockup";
import {
  MAX_CUSTOM_QUANTITY,
  MAX_PRINTS,
  PRINT_SIDE_LIST,
  SIDE_NAMES,
  customCartKey,
  garmentFromPrice,
  gsmLabel,
  isGarmentReady,
  optionsForGarment,
  printCharges,
  sidePrice,
} from "@/lib/custom/pricing";
import { decodeStudioDraft, encodeStudioDraft, type StudioDraft } from "@/lib/custom/studio-draft";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import type {
  CustomCartItem,
  CustomCatalog,
  CustomGarment,
  CustomPrintOption,
  CustomTeeSize,
  GarmentGender,
  MockupSpec,
  PrintSide,
  PrintTransform,
  StudioDesign,
} from "@/types";

type GenderFilter = "all" | Exclude<GarmentGender, "unisex">;

/** One print the customer has picked: a print size on a side, its design, and where it sits. */
interface StudioPrint {
  side: PrintSide;
  printOptionId: string;
  design: StudioDesign | null;
  transform: PrintTransform | null;
}

// Below this many dots per inch an upload starts to look soft once printed.
const LOW_DPI = 100;

const printKey = (p: Pick<StudioPrint, "side" | "printOptionId">) => `${p.side}:${p.printOptionId}`;
const sideOfKey = (key: string) => key.split(":")[0] as PrintSide;

function formatCm(option: Pick<CustomPrintOption, "width_cm" | "height_cm">) {
  return `${option.width_cm} × ${option.height_cm} cm`;
}

function defaultSizeId(sizes: CustomTeeSize[]) {
  return (sizes.find((s) => s.label.toUpperCase() === "L") ?? sizes[Math.floor(sizes.length / 2)])?.id ?? "";
}

/** On phones the preview is far above the steps — bring it back so a change is seen. */
function scrollToPreview(ref: RefObject<HTMLDivElement | null>) {
  if (window.matchMedia("(max-width: 1023px)").matches) {
    requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
}

/** The studio starts on one print: the first print size offered on the front (else the back). */
function firstPrint(printOptions: CustomPrintOption[]): StudioPrint[] {
  for (const side of PRINT_SIDE_LIST) {
    const option = printOptions.find((o) => sidePrice(o, side) !== null);
    if (option) return [{ side, printOptionId: option.id, design: null, transform: null }];
  }
  return [];
}

/** Front before back, then in the admin's print-size order. */
function sortPrints(prints: StudioPrint[], printOptions: CustomPrintOption[]) {
  const order = (p: StudioPrint) =>
    PRINT_SIDE_LIST.indexOf(p.side) * 1000 + printOptions.findIndex((o) => o.id === p.printOptionId);
  return [...prints].sort((a, b) => order(a) - order(b));
}

function initialState({
  catalog,
  garments,
  designs,
  uploads,
  initialGarmentId,
  draft,
}: {
  catalog: CustomCatalog;
  garments: CustomGarment[];
  designs: StudioDesign[];
  uploads: StudioDesign[];
  initialGarmentId?: string;
  draft: StudioDraft | null;
}) {
  const draftGarment = draft ? garments.find((g) => g.id === draft.garmentId) : undefined;
  const garment = draftGarment ?? garments.find((g) => g.id === initialGarmentId) ?? garments[0];
  const options = optionsForGarment(catalog, garment?.id);
  const base = {
    garmentId: garment?.id,
    colorId: options.colors[0]?.id ?? "",
    sizeId: defaultSizeId(options.sizes),
    gsmId: options.gsmOptions[0]?.id ?? null,
    prints: firstPrint(options.printOptions),
    quantity: 1,
    choosingFor: null as string | null,
  };
  if (!draft || !draftGarment) return base;

  // Coming back from sign-in: restore what's still on offer.
  const findDesign = (id: string | null, source: StudioDraft["prints"][number]["designSource"]) =>
    (source === "upload" ? uploads : designs).find((d) => d.id === id) ?? null;
  const prints = draft.prints
    .filter((p) => options.printOptions.some((o) => o.id === p.printOptionId && sidePrice(o, p.side) !== null))
    .map((p) => ({
      side: p.side,
      printOptionId: p.printOptionId,
      design: findDesign(p.designId, p.designSource),
      transform: p.transform,
    }));
  return {
    garmentId: draftGarment.id,
    colorId: options.colors.some((c) => c.id === draft.colorId) ? draft.colorId : base.colorId,
    sizeId: options.sizes.some((s) => s.id === draft.sizeId) ? draft.sizeId : base.sizeId,
    gsmId: options.gsmOptions.some((g) => g.id === draft.gsmId) ? draft.gsmId : base.gsmId,
    prints: prints.length > 0 ? prints : base.prints,
    quantity: Math.min(MAX_CUSTOM_QUANTITY, Math.max(1, Math.round(draft.quantity))),
    choosingFor: prints.some((p) => printKey(p) === draft.choosingFor) ? draft.choosingFor : null,
  };
}

export function CustomStudio({
  catalog,
  designs,
  uploads: initialUploads,
  ownArtworkHref,
  initialGarmentId,
  initialDraft,
}: {
  catalog: CustomCatalog;
  designs: StudioDesign[];
  /** The signed-in customer's own uploads. */
  uploads: StudioDesign[];
  ownArtworkHref: string | null;
  /** From ?garment=<slug>, to open the studio on a specific garment. */
  initialGarmentId?: string;
  /** From ?draft=, after signing in to upload a design. */
  initialDraft?: string;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const { user } = useAuth();

  // Only garments the admin has fully set up (photos, colour, size, priced print size) are offered.
  const garments = useMemo(
    () => catalog.garments.filter((g) => isGarmentReady(g, optionsForGarment(catalog, g.id))),
    [catalog]
  );

  const [init] = useState(() =>
    initialState({
      catalog,
      garments,
      designs,
      uploads: initialUploads,
      initialGarmentId,
      draft: initialDraft ? decodeStudioDraft(initialDraft) : null,
    })
  );

  const [garmentId, setGarmentId] = useState(init.garmentId);
  const garment = garments.find((g) => g.id === garmentId) ?? garments[0];
  const [genderFilter, setGenderFilter] = useState<GenderFilter>(() =>
    garment && garment.gender !== "unisex" ? garment.gender : "all"
  );
  const { sizes, colors, gsmOptions, printOptions } = useMemo(
    () => optionsForGarment(catalog, garment?.id),
    [catalog, garment?.id]
  );
  const spec = useMemo(() => (garment ? garmentSpec(garment) : null), [garment]);

  const [colorId, setColorId] = useState(init.colorId);
  const [sizeId, setSizeId] = useState(init.sizeId);
  const [gsmId, setGsmId] = useState(init.gsmId);
  const [prints, setPrints] = useState<StudioPrint[]>(init.prints);
  const [quantity, setQuantity] = useState(init.quantity);
  const [view, setView] = useState<PrintSide>(() =>
    init.choosingFor ? sideOfKey(init.choosingFor) : init.prints[0]?.side ?? "front"
  );
  const [showGuide, setShowGuide] = useState(true);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [hub, setHub] = useState<{ key: string; tab: HubTab } | null>(() =>
    init.choosingFor ? { key: init.choosingFor, tab: "uploads" } : null
  );
  const [uploads, setUploads] = useState(initialUploads);
  const [attempted, setAttempted] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const designStepRef = useRef<HTMLElement>(null);

  // The draft has done its job once restored — drop it from the address bar.
  useEffect(() => {
    if (!initialDraft) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("draft");
    window.history.replaceState(window.history.state, "", url);
  }, [initialDraft]);

  const color = colors.find((c) => c.id === colorId) ?? colors[0];
  const size = sizes.find((s) => s.id === sizeId) ?? sizes[0];
  const gsm = gsmOptions.find((g) => g.id === gsmId) ?? null;
  const optionOf = useCallback((id: string) => printOptions.find((o) => o.id === id), [printOptions]);

  // No GSM choice offered = nothing extra to pay; offered but none picked = no price yet.
  const gsmPrice = gsmOptions.length === 0 ? 0 : gsm ? gsm.price : null;
  const charges = useMemo(() => printCharges(prints, printOptions), [prints, printOptions]);
  const printPrice = charges && prints.length > 0 ? charges.reduce((sum, c) => sum + c.price, 0) : null;
  const unitPrice = size && gsmPrice !== null && printPrice !== null ? size.price + gsmPrice + printPrice : null;
  const total = unitPrice === null ? null : unitPrice * quantity;
  const sizePricesVary = new Set(sizes.map((s) => s.price)).size > 1;
  const sidesWithPrints = PRINT_SIDE_LIST.filter((side) => prints.some((p) => p.side === side));

  const missing = useMemo(() => {
    const list: string[] = [];
    if (gsmOptions.length > 0 && !gsm) list.push("a fabric weight");
    if (prints.length === 0) list.push("at least one print");
    const noDesign = prints.filter((p) => !p.design).length;
    if (noDesign > 0) list.push(noDesign === 1 ? "a design for your print" : `designs for ${noDesign} prints`);
    return list;
  }, [gsmOptions.length, gsm, prints]);

  // Prints placed on top of each other, by side, so the customer can be told to move them.
  const overlappingSides = useMemo(() => {
    if (!spec) return [];
    return PRINT_SIDE_LIST.filter((side) => {
      const rects = prints.flatMap((p) => {
        const option = p.side === side ? optionOf(p.printOptionId) : undefined;
        return option ? [printRect(spec, side, option, p.transform)] : [];
      });
      return rects.some((a, i) => rects.slice(i + 1).some((b) => rectsOverlap(a, b)));
    });
  }, [spec, prints, optionOf]);


  function changeView(side: PrintSide) {
    setView(side);
    if (activeKey && sideOfKey(activeKey) !== side) setActiveKey(null);
  }

  /** Switch garment, keeping the customer's colour, size and prints where the new garment has them. */
  function chooseGarment(next: CustomGarment) {
    if (next.id === garment?.id) return;
    const options = optionsForGarment(catalog, next.id);
    const sameColor = options.colors.find((c) => c.name.toLowerCase() === color?.name.toLowerCase());
    const sameSize = options.sizes.find((s) => s.label.toUpperCase() === size?.label.toUpperCase());
    const kept = prints.filter((p) =>
      options.printOptions.some((o) => o.id === p.printOptionId && sidePrice(o, p.side) !== null)
    );
    const nextPrints = kept.length > 0 ? kept : firstPrint(options.printOptions);

    setGarmentId(next.id);
    setColorId((sameColor ?? options.colors[0])?.id ?? "");
    setSizeId(sameSize?.id ?? defaultSizeId(options.sizes));
    setGsmId(options.gsmOptions[0]?.id ?? null);
    setPrints(nextPrints);
    setActiveKey(null);
    if (!nextPrints.some((p) => p.side === view)) setView(nextPrints[0]?.side ?? "front");
  }

  function togglePrint(side: PrintSide, option: CustomPrintOption) {
    const key = printKey({ side, printOptionId: option.id });
    if (prints.some((p) => printKey(p) === key)) {
      setPrints(prints.filter((p) => printKey(p) !== key));
      if (activeKey === key) setActiveKey(null);
      return;
    }
    if (prints.length >= MAX_PRINTS) return;
    setPrints(sortPrints([...prints, { side, printOptionId: option.id, design: null, transform: null }], printOptions));
    changeView(side);
  }

  const updatePrint = useCallback((key: string, patch: Partial<StudioPrint>) => {
    setPrints((list) => list.map((p) => (printKey(p) === key ? { ...p, ...patch } : p)));
  }, []);

  function startAdjusting(key: string) {
    setActiveKey(key);
    setView(sideOfKey(key));
    scrollToPreview(previewRef);
  }

  const editor: MockupEditor = useMemo(
    () => ({
      activeKey,
      onSelect: (key) => setActiveKey(key),
      onChange: (key, transform) => updatePrint(key, { transform }),
    }),
    [activeKey, updatePrint]
  );

  const closeHub = useCallback(() => setHub(null), []);

  const pickDesign = useCallback(
    (design: StudioDesign) => {
      if (!hub) return;
      updatePrint(hub.key, { design });
      setView(sideOfKey(hub.key));
      setHub(null);
      scrollToPreview(previewRef);
    },
    [hub, updatePrint]
  );

  const addUpload = useCallback((design: StudioDesign) => {
    setUploads((list) => [design, ...list.filter((d) => d.id !== design.id)]);
  }, []);

  /** Uploading needs an account: sign in, then come back to this exact design. */
  function signInToUpload() {
    if (!garment || !color || !size) return;
    const draft = encodeStudioDraft({
      garmentId: garment.id,
      colorId: color.id,
      sizeId: size.id,
      gsmId: gsm?.id ?? null,
      quantity,
      prints: prints.map((p) => ({
        side: p.side,
        printOptionId: p.printOptionId,
        designId: p.design?.id ?? null,
        designSource: p.design ? p.design.source ?? "hub" : null,
        transform: p.transform,
      })),
      choosingFor: hub?.key ?? null,
    });
    const back = `/customize?garment=${encodeURIComponent(garment.slug)}&draft=${draft}#studio`;
    router.push(`/login?next=${encodeURIComponent(back)}`);
  }

  function buildCartItem(): CustomCartItem | null {
    if (missing.length > 0 || !garment || !color || !size || unitPrice === null) return null;
    const placed = prints.flatMap((p) => {
      const option = optionOf(p.printOptionId);
      return option && p.design ? [{ print: p, option, design: p.design }] : [];
    });
    if (placed.length !== prints.length) return null;

    const config = {
      garmentId: garment.id,
      colorId: color.id,
      sizeId: size.id,
      gsmId: gsm?.id ?? null,
      placements: placed.map(({ print, design }) => ({
        side: print.side,
        printOptionId: print.printOptionId,
        designId: design.id,
        designSource: design.source ?? "hub",
        transform: print.transform,
      })),
    };
    return {
      kind: "custom",
      key: customCartKey(config),
      config,
      name: `Custom ${garment.name}`,
      mockup: { spec, colorPhotos: colorPhotosOf(color) },
      colorName: color.name,
      colorHex: color.hex,
      sizeLabel: size.label,
      gsmLabel: gsm ? gsmLabel(gsm.gsm) : null,
      prints: placed.map(({ print, option, design }) => ({
        side: print.side,
        printOption: {
          id: option.id,
          name: option.name,
          width_cm: option.width_cm,
          height_cm: option.height_cm,
          front_placement: option.front_placement,
        },
        design,
        transform: print.transform,
      })),
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
    setActiveKey(null);
    if (goToCheckout) {
      router.push("/checkout");
      return;
    }
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2500);
  }

  // Steps are numbered as they render, since the GSM step only shows when GSM options exist.
  let stepCount = 0;
  const nextStep = () => String(++stepCount).padStart(2, "0");

  const mockupPrints = (side: PrintSide): MockupPrint[] =>
    prints.flatMap((p) => {
      const option = p.side === side ? optionOf(p.printOptionId) : undefined;
      if (!option) return [];
      const measured = spec && p.transform ? printMeasurements(spec, side, option, p.transform) : null;
      return [
        {
          key: printKey(p),
          printArea: option,
          transform: p.transform,
          designUrl: p.design?.image_url,
          label: `${option.name} · ${measured ? `${measured.widthCm} × ${measured.heightCm} cm` : formatCm(option)}`,
        },
      ];
    });

  const mockupFor = (side: PrintSide, extra?: { imageWidth?: number; guide?: boolean; editable?: boolean }) => (
    <GarmentMockup
      spec={spec}
      colorPhotos={color ? colorPhotosOf(color) : null}
      colorHex={color?.hex ?? "#111111"}
      view={side}
      prints={mockupPrints(side)}
      showGuide={extra?.guide ?? showGuide}
      imageWidth={extra?.imageWidth}
      className="w-full"
      title={`${side === "front" ? "Front" : "Back"} preview of your custom ${garment?.name.toLowerCase() ?? "tee"}`}
      editor={extra?.editable ? editor : undefined}
    />
  );

  const activePrint = prints.find((p) => printKey(p) === activeKey);
  const activeOption = activePrint ? optionOf(activePrint.printOptionId) : undefined;
  const hubPrint = hub ? prints.find((p) => printKey(p) === hub.key) : undefined;

  return (
    <>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-12">
        {/* PREVIEW */}
        <div ref={previewRef} className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-[radial-gradient(circle_at_50%_32%,#ffffff_0%,#f1f1ee_55%,#e6e6e2_100%)] p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex rounded-full border border-border bg-background p-1" role="tablist" aria-label="Preview side">
                {PRINT_SIDE_LIST.map((side) => (
                  <button
                    key={side}
                    type="button"
                    role="tab"
                    aria-selected={view === side}
                    onClick={() => changeView(side)}
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
                <span className={cn("relative h-5 w-9 rounded-full transition-colors", showGuide ? "bg-foreground" : "bg-border")}>
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
                <div className={cn("backface-hidden", view !== "front" && "pointer-events-none")}>
                  {mockupFor("front", { editable: view === "front" })}
                </div>
                <div className={cn("absolute inset-0 rotate-y-180 backface-hidden", view !== "back" && "pointer-events-none")}>
                  {mockupFor("back", { editable: view === "back" })}
                </div>
              </div>
            </div>

            {activePrint && activeOption && spec ? (
              <AdjustBar
                spec={spec}
                print={activePrint}
                option={activeOption}
                onChange={(transform) => updatePrint(printKey(activePrint), { transform })}
                onDone={() => setActiveKey(null)}
              />
            ) : (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
                  {garments.length > 1 && garment && (
                    <span className="rounded-full bg-foreground px-3 py-1.5 text-background">{garment.name}</span>
                  )}
                  {color && (
                    <span className="flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5">
                      <span className="h-3 w-3 rounded-full border border-black/15" style={{ backgroundColor: color.hex }} />
                      {color.name}
                    </span>
                  )}
                  {size && <span className="rounded-full bg-background px-3 py-1.5">Size {size.label}</span>}
                  {gsm && <span className="rounded-full bg-background px-3 py-1.5">{gsmLabel(gsm.gsm)}</span>}
                  {prints.length > 0 && (
                    <span className="rounded-full bg-background px-3 py-1.5">
                      {prints.length} print{prints.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                {prints.some((p) => p.side === view) && (
                  <p className="text-center text-xs text-muted-foreground">Tap a print to move or resize it.</p>
                )}
                {overlappingSides.includes(view) && (
                  <p className="text-center text-xs font-semibold text-amber-700" role="status">
                    Prints overlap on the {view} — tap one to move or shrink it.
                  </p>
                )}
              </div>
            )}

            {sidesWithPrints.length === 2 && !activePrint && (
              <button
                type="button"
                onClick={() => changeView(view === "front" ? "back" : "front")}
                className="absolute bottom-24 right-4 w-20 rounded-2xl border border-border bg-background/90 p-1.5 shadow-lg backdrop-blur transition-transform hover:scale-105 sm:bottom-28 sm:right-6 sm:w-24"
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
          {garments.length > 1 && (
            <Step index={nextStep()} title="Garment" aside={garment?.name}>
              <GarmentPicker
                catalog={catalog}
                garments={garments}
                selectedId={garment?.id}
                filter={genderFilter}
                onFilter={setGenderFilter}
                onSelect={chooseGarment}
              />
            </Step>
          )}

          <Step index={nextStep()} title="Colour" aside={color?.name}>
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

          <Step
            index={nextStep()}
            title="Prints"
            aside={prints.length > 0 ? `${prints.length} selected` : undefined}
            invalid={attempted && prints.length === 0}
          >
            <p className="-mt-1 mb-4 text-sm text-muted-foreground">
              Pick as many as you like on each side — say a chest print and a logo on the front, and A3 on the back.
            </p>
            <div className="space-y-5">
              {PRINT_SIDE_LIST.map((side) => (
                <div key={side}>
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                    <SideGlyph side={side} />
                    {SIDE_NAMES[side]}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {printOptions.map((o) => {
                      const price = sidePrice(o, side);
                      const selected = prints.some((p) => p.side === side && p.printOptionId === o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          role="checkbox"
                          aria-checked={selected}
                          disabled={price === null || (!selected && prints.length >= MAX_PRINTS)}
                          onClick={() => togglePrint(side, o)}
                          className={cn(
                            "flex items-start gap-2.5 rounded-2xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:p-4",
                            selected ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground"
                          )}
                        >
                          <CheckMark checked={selected} />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                              <span className="font-semibold leading-tight">{o.name}</span>
                              <span className="text-sm font-bold">{price === null ? "—" : `+${formatPrice(price)}`}</span>
                            </span>
                            <span className="mt-0.5 block text-xs font-semibold text-muted-foreground">{formatCm(o)}</span>
                            <span className={cn("mt-0.5 text-xs text-muted-foreground", price === null ? "block" : "hidden sm:block")}>
                              {price === null ? `Not on the ${side}` : o.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {charges
              ?.filter((c) => c.fullPrice !== undefined)
              .map((c) => (
                <p key={c.option.id} className="mt-3 text-sm font-semibold text-success">
                  {c.option.name} on both sides: {formatPrice(c.price)} instead of {formatPrice(c.fullPrice ?? 0)}
                </p>
              ))}
          </Step>

          <Step
            index={nextStep()}
            title={prints.length > 1 ? "Your designs" : "Your design"}
            innerRef={designStepRef}
            invalid={attempted && prints.some((p) => !p.design)}
          >
            {prints.length === 0 ? (
              <p className="text-sm text-muted-foreground">Choose a print above, then pick its design here.</p>
            ) : (
              <div className="space-y-3">
                {prints.map((p) => {
                  const key = printKey(p);
                  const option = optionOf(p.printOptionId);
                  if (!option) return null;
                  const measured = spec ? printMeasurements(spec, p.side, option, p.transform) : null;
                  const dpi =
                    p.design?.source === "upload" && measured
                      ? printDpi(p.design, { width: measured.widthCm, height: measured.heightCm })
                      : null;
                  const suggestion = p.design ? null : prints.find((q) => q.design && printKey(q) !== key)?.design ?? null;
                  return (
                    <DesignSlot
                      key={key}
                      label={`${SIDE_NAMES[p.side]} · ${option.name}`}
                      design={p.design}
                      adjusted={!!p.transform}
                      lowResolution={dpi !== null && dpi < LOW_DPI}
                      suggestion={suggestion}
                      onBrowse={() => setHub({ key, tab: p.design?.source === "upload" ? "uploads" : "hub" })}
                      onUpload={() => setHub({ key, tab: "uploads" })}
                      onUseSuggestion={() => {
                        if (!suggestion) return;
                        updatePrint(key, { design: suggestion });
                        setView(p.side);
                      }}
                      onRemove={() => updatePrint(key, { design: null })}
                      onAdjust={() => startAdjusting(key)}
                    />
                  );
                })}
              </div>
            )}
            {ownArtworkHref && (
              <p className="mt-4 text-xs text-muted-foreground">
                Need help with your artwork?{" "}
                <a href={ownArtworkHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline underline-offset-4">
                  Message us on WhatsApp
                </a>
                .
              </p>
            )}
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
              <SummaryRow
                label={`${garment?.name ?? "Tee"} · size ${size?.label ?? "—"}`}
                value={size ? formatPrice(size.price) : "—"}
              />
              {gsmOptions.length > 0 && (
                <SummaryRow
                  label={`Fabric · ${gsm ? gsmLabel(gsm.gsm) : "—"}`}
                  value={!gsm ? "—" : gsm.price > 0 ? formatPrice(gsm.price) : "Included"}
                />
              )}
              {charges && charges.length > 0 ? (
                charges.map((c) => (
                  <SummaryRow
                    key={c.option.id}
                    label={`${c.option.name} · ${c.sides.map((s) => SIDE_NAMES[s].toLowerCase()).join(" & ")}`}
                    value={formatPrice(c.price)}
                  />
                ))
              ) : (
                <SummaryRow label="Print" value="—" />
              )}
              <SummaryRow label="Each" value={unitPrice === null ? "—" : formatPrice(unitPrice)} />
              <SummaryRow label="Quantity" value={`× ${quantity}`} />
            </div>
            <div className="mt-4 flex items-end justify-between border-t border-background/15 pt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-background/60">Total</span>
              <span key={total ?? "none"} className="font-display text-3xl tracking-wide animate-[price-pop_0.3s_ease-out]">
                {total === null ? "—" : formatPrice(total)}
              </span>
            </div>

            {attempted && missing.length > 0 && (
              <p className="mt-3 text-sm font-semibold text-accent" role="alert">
                Almost there — choose {missing.join(" and ")}.
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button variant="secondary" size="lg" className="px-4" onClick={() => handleAdd(false)}>
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
              {prints.length === 0 ? "no print yet" : `${prints.length} print${prints.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <Button size="md" className="px-5" onClick={() => handleAdd(false)}>
            {justAdded ? "Added ✓" : "Add to Cart"}
          </Button>
        </div>
      </div>

      {hub && hubPrint && (
        <DesignHubDialog
          designs={designs}
          uploads={uploads}
          slotLabel={`${SIDE_NAMES[hubPrint.side].toLowerCase()} · ${optionOf(hubPrint.printOptionId)?.name ?? "print"}`}
          selectedId={hubPrint.design?.id ?? null}
          initialTab={hub.tab}
          userId={user?.id ?? null}
          onSelect={pickDesign}
          onUploaded={addUpload}
          onSignIn={signInToUpload}
          onClose={closeHub}
        />
      )}
    </>
  );
}

/** Under the preview while a print is being adjusted: its size, a slider, reset and done. */
function AdjustBar({
  spec,
  print,
  option,
  onChange,
  onDone,
}: {
  spec: MockupSpec;
  print: StudioPrint;
  option: CustomPrintOption;
  onChange: (transform: PrintTransform | null) => void;
  onDone: () => void;
}) {
  const measured = printMeasurements(spec, print.side, option, print.transform);
  const percent = Math.round(measured.scale * 100);

  function resize(nextPercent: number) {
    // Resize around the print's centre, as it's drawn now.
    const current = printRect(spec, print.side, option, print.transform);
    const scale = nextPercent / 100 / measured.scale;
    const width = current.width * scale;
    const height = current.height * scale;
    onChange(
      transformFor(spec, print.side, option, {
        x: current.x + (current.width - width) / 2,
        y: current.y + (current.height - height) / 2,
        width,
        height,
      })
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-border bg-background p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold">
          {SIDE_NAMES[print.side]} · {option.name}{" "}
          <span className="font-normal text-muted-foreground">
            {measured.widthCm} × {measured.heightCm} cm
          </span>
        </p>
        <button
          type="button"
          onClick={onDone}
          className="h-9 flex-none rounded-full bg-foreground px-4 text-xs font-semibold uppercase tracking-wide text-background"
        >
          Done
        </button>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <label htmlFor="print-size" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Size
        </label>
        <input
          id="print-size"
          type="range"
          min={Math.round(MIN_PRINT_SCALE * 100)}
          max={100}
          value={percent}
          onChange={(e) => resize(Number(e.target.value))}
          className="flex-1 accent-foreground"
        />
        <span className="w-10 text-right text-sm font-semibold">{percent}%</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Drag the print to move it, or the corner dot to resize. It can go smaller than {option.name}, not bigger.</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={!print.transform}
          className="flex-none font-semibold text-foreground underline underline-offset-4 disabled:opacity-40"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function GarmentPicker({
  catalog,
  garments,
  selectedId,
  filter,
  onFilter,
  onSelect,
}: {
  catalog: CustomCatalog;
  garments: CustomGarment[];
  selectedId: string | undefined;
  filter: GenderFilter;
  onFilter: (filter: GenderFilter) => void;
  onSelect: (garment: CustomGarment) => void;
}) {
  // Filter chips only matter once the admin has men's or women's-only garments.
  const showFilter = garments.some((g) => g.gender !== "unisex");
  const visible = garments.filter((g) => filter === "all" || g.gender === filter || g.gender === "unisex");
  const filters: { value: GenderFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "men", label: "Men" },
    { value: "women", label: "Women" },
  ];

  return (
    <div>
      {showFilter && (
        <div className="mb-3 flex gap-2" role="group" aria-label="Filter garments">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => onFilter(f.value)}
              className={cn(
                "h-9 rounded-full border px-4 text-xs font-semibold uppercase tracking-wide transition-colors",
                filter === f.value ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visible.map((g) => {
          const options = optionsForGarment(catalog, g.id);
          const fromPrice = garmentFromPrice(options);
          const firstColor = options.colors[0];
          const selected = g.id === selectedId;
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(g)}
              className={cn(
                "overflow-hidden rounded-2xl border text-left transition-colors",
                selected ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground"
              )}
            >
              <span className="block bg-muted p-2">
                <GarmentMockup
                  spec={garmentSpec(g)}
                  colorPhotos={firstColor ? colorPhotosOf(firstColor) : null}
                  colorHex={firstColor?.hex ?? "#111111"}
                  view="front"
                  imageWidth={256}
                  className="mx-auto aspect-square w-full max-w-36"
                  title={g.name}
                />
              </span>
              <span className="block px-3 py-2.5">
                <span className="block truncate text-sm font-semibold">{g.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {g.gender !== "unisex" && <span className="capitalize">{g.gender} · </span>}
                  {fromPrice !== null ? `from ${formatPrice(fromPrice)}` : ""}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
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
  adjusted,
  lowResolution,
  suggestion,
  onBrowse,
  onUpload,
  onUseSuggestion,
  onRemove,
  onAdjust,
}: {
  label: string;
  design: StudioDesign | null;
  adjusted: boolean;
  lowResolution: boolean;
  /** Another print's design, offered as a one-tap choice for an empty slot. */
  suggestion: StudioDesign | null;
  onBrowse: () => void;
  onUpload: () => void;
  onUseSuggestion: () => void;
  onRemove: () => void;
  onAdjust: () => void;
}) {
  if (!design) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBrowse}
            className="h-10 rounded-full bg-foreground px-4 text-xs font-semibold uppercase tracking-wide text-background"
          >
            Browse designs
          </button>
          <button
            type="button"
            onClick={onUpload}
            className="h-10 rounded-full border border-foreground px-4 text-xs font-semibold uppercase tracking-wide hover:bg-foreground hover:text-background"
          >
            Upload your own
          </button>
        </div>
        {suggestion && (
          <button type="button" onClick={onUseSuggestion} className="mt-3 text-sm font-semibold underline underline-offset-4">
            Use “{suggestion.name}” here too
          </button>
        )}
      </div>
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
          {design.source === "upload" ? (
            <span className="font-medium normal-case tracking-normal"> · your upload</span>
          ) : (
            design.category && <span className="font-medium normal-case tracking-normal"> · {design.category}</span>
          )}
        </p>
        <p className="truncate font-semibold">{design.name}</p>
        {lowResolution && (
          <p className="text-xs font-semibold text-amber-700">Low resolution for this size — it may print blurry.</p>
        )}
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold uppercase tracking-wide">
          <button type="button" onClick={onBrowse} className="underline underline-offset-4">
            Change
          </button>
          <button type="button" onClick={onAdjust} className="underline underline-offset-4">
            {adjusted ? "Adjusted ✓" : "Move / resize"}
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

function CheckMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-md border",
        checked ? "border-foreground bg-foreground text-background" : "border-border"
      )}
      aria-hidden="true"
    >
      {checked && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
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

/** A small tee: a deep scoop neck for the front, a shallow one for the back. */
function SideGlyph({ side }: { side: PrintSide }) {
  const neck = side === "front" ? "a2.5 2.5 0 0 1-5 0" : "a2.5 0.9 0 0 1-5 0";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={`M7 3 4 5.5 5.5 8.5 7 8v12h10V8l1.5.5L20 5.5 17 3h-2.5${neck}H7Z`}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
