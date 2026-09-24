"use client";

import { useId } from "react";
import type { CustomPrintOption } from "@/types";

type PrintArea = Pick<CustomPrintOption, "width_cm" | "height_cm" | "front_placement">;
export type TeeView = "front" | "back";

// Drawn to a size-L tee: 56 cm chest across 291 units, so print sizes render at true scale.
const UNITS_PER_CM = 5.2;
const FRONT_PRINT_TOP = 123; // ~7 cm below the front collar
const BACK_PRINT_TOP = 102; // ~10 cm below the back collar
const LEFT_CHEST_CENTER_X = 349; // wearer's left chest, ~9.5 cm off centre
const MAX_PRINT_W = 260;
const MAX_PRINT_H = 290;

const FRONT_NECK = "C 262 103, 338 103, 350 40";
const BACK_NECK = "C 262 57, 338 57, 350 40";
const BODY =
  "L 430 61 C 462 78, 500 100, 523 126 L 469 203 C 458 190, 450 181, 445.5 170 C 441 250, 444 340, 448 425 Q 300 438, 152 425 C 156 340, 159 250, 154.5 170 C 150 181, 142 190, 131 203 L 77 126 C 100 100, 138 78, 170 61 Z";
const SLEEVES =
  "M 430 61 C 462 78, 500 100, 523 126 L 469 203 C 458 190, 450 181, 445.5 170 C 444 140, 438 100, 430 61 Z M 170 61 C 138 78, 100 100, 77 126 L 131 203 C 142 190, 150 181, 154.5 170 C 156 140, 162 100, 170 61 Z";
const FRONT_RIB = "M 250 40 C 262 103, 338 103, 350 40 L 361 43 C 348 116, 252 116, 239 43 Z";
const BACK_RIB = "M 250 40 C 262 57, 338 57, 350 40 L 361 43 C 349 70, 251 70, 239 43 Z";
const INNER_BACK = "M 250 40 C 262 57, 338 57, 350 40 C 338 103, 262 103, 250 40 Z";

const FOLDS: { d: string; tone: "light" | "dark"; width: number; opacity: number }[] = [
  { d: "M 170 196 Q 204 240 200 312", tone: "light", width: 12, opacity: 0.05 },
  { d: "M 178 202 Q 214 248 210 322", tone: "dark", width: 10, opacity: 0.08 },
  { d: "M 430 196 Q 396 240 400 312", tone: "light", width: 12, opacity: 0.04 },
  { d: "M 422 202 Q 386 248 390 322", tone: "dark", width: 10, opacity: 0.08 },
  { d: "M 226 356 Q 246 384 240 418", tone: "dark", width: 16, opacity: 0.06 },
  { d: "M 370 350 Q 354 384 360 418", tone: "dark", width: 16, opacity: 0.05 },
  { d: "M 452 92 Q 478 118 488 158", tone: "dark", width: 8, opacity: 0.07 },
  { d: "M 148 92 Q 122 118 112 158", tone: "dark", width: 8, opacity: 0.07 },
];

export function printRect(area: PrintArea, view: TeeView) {
  const width = Math.min(area.width_cm * UNITS_PER_CM, MAX_PRINT_W);
  const height = Math.min(area.height_cm * UNITS_PER_CM, MAX_PRINT_H);
  const leftChest = view === "front" && area.front_placement === "left_chest";
  const centerX = leftChest ? LEFT_CHEST_CENTER_X : 300;
  return {
    x: centerX - width / 2,
    y: view === "front" ? FRONT_PRINT_TOP : BACK_PRINT_TOP,
    width,
    height,
  };
}

export function isLightColor(hex: string) {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

/** Next's image optimizer, so a 2000px design downloads as a ~640px WebP for the preview. */
export function optimizedImage(url: string, width = 640) {
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75`;
}

export function TeeMockup({
  colorHex,
  view,
  printArea,
  designUrl,
  showGuide = false,
  guideLabel,
  imageWidth = 640,
  className,
  title,
}: {
  colorHex: string;
  view: TeeView;
  printArea?: PrintArea | null;
  designUrl?: string | null;
  showGuide?: boolean;
  guideLabel?: string;
  imageWidth?: number;
  className?: string;
  title?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `${name}-${uid}`;
  const shirtPath = `M 250 40 ${view === "front" ? FRONT_NECK : BACK_NECK} ${BODY}`;
  const light = isLightColor(colorHex);
  const guideStroke = light ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.75)";
  const rect = printArea ? printRect(printArea, view) : null;

  return (
    <svg
      viewBox="62 24 476 422"
      className={className}
      role="img"
      aria-label={title ?? `${view === "front" ? "Front" : "Back"} of the tee`}
    >
      <defs>
        <clipPath id={id("shirt")}>
          <path d={shirtPath} />
        </clipPath>
        <linearGradient id={id("sides")} x1="77" x2="523" y1="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#000" stopOpacity="0.24" />
          <stop offset="0.18" stopColor="#000" stopOpacity="0.1" />
          <stop offset="0.36" stopColor="#000" stopOpacity="0" />
          <stop offset="0.64" stopColor="#000" stopOpacity="0" />
          <stop offset="0.82" stopColor="#000" stopOpacity="0.1" />
          <stop offset="1" stopColor="#000" stopOpacity="0.24" />
        </linearGradient>
        <linearGradient id={id("vertical")} x1="0" x2="0" y1="40" y2="438" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.22" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.82" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.14" />
        </linearGradient>
        <radialGradient id={id("sheen")} cx="290" cy="200" r="230" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity={light ? 0.05 : 0.09} />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id={id("blur")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id={id("shadow")} x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000" floodOpacity="0.2" />
        </filter>
      </defs>

      {title && <title>{title}</title>}

      <path d={shirtPath} fill={colorHex} filter={`url(#${id("shadow")})`} />

      {view === "front" && (
        <g>
          <path d={INNER_BACK} fill={colorHex} />
          <path d={INNER_BACK} fill="#000" fillOpacity="0.38" />
          <path d="M 252 44 C 264 58, 336 58, 348 44" fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="6" />
          <rect x="291" y="56" width="18" height="9" rx="1.5" fill="#fff" fillOpacity="0.85" />
        </g>
      )}

      {rect && designUrl && (
        <g clipPath={`url(#${id("shirt")})`}>
          <image
            href={optimizedImage(designUrl, imageWidth)}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            preserveAspectRatio="xMidYMin meet"
          />
        </g>
      )}

      <g clipPath={`url(#${id("shirt")})`} pointerEvents="none">
        <path d={SLEEVES} fill="#000" fillOpacity="0.05" />
        <rect x="62" y="24" width="476" height="422" fill={`url(#${id("sides")})`} />
        <rect x="62" y="24" width="476" height="422" fill={`url(#${id("vertical")})`} />
        <rect x="62" y="24" width="476" height="422" fill={`url(#${id("sheen")})`} />
        <g filter={`url(#${id("blur")})`}>
          {FOLDS.map((fold) => (
            <path
              key={fold.d}
              d={fold.d}
              fill="none"
              stroke={fold.tone === "light" ? "#fff" : "#000"}
              strokeOpacity={fold.opacity}
              strokeWidth={fold.width}
              strokeLinecap="round"
            />
          ))}
        </g>
      </g>

      <path d={view === "front" ? FRONT_RIB : BACK_RIB} fill={colorHex} />
      <path d={view === "front" ? FRONT_RIB : BACK_RIB} fill="#000" fillOpacity="0.1" />

      <g fill="none" strokeLinecap="round" pointerEvents="none">
        <path
          d={view === "front" ? "M 239 43 C 252 116, 348 116, 361 43" : "M 239 43 C 251 70, 349 70, 361 43"}
          stroke="#000"
          strokeOpacity="0.28"
          strokeWidth="1"
          strokeDasharray="3 2.5"
        />
        <path d="M 430 61 C 438 100, 444 140, 445.5 170" stroke="#000" strokeOpacity="0.2" strokeWidth="1.4" />
        <path d="M 170 61 C 162 100, 156 140, 154.5 170" stroke="#000" strokeOpacity="0.2" strokeWidth="1.4" />
        <path d="M 150 416 Q 300 429, 450 416" stroke="#000" strokeOpacity="0.24" strokeWidth="1" strokeDasharray="4 3" />
        <path d="M 516.4 121.4 L 462.4 198.4" stroke="#000" strokeOpacity="0.24" strokeWidth="1" strokeDasharray="4 3" />
        <path d="M 83.6 121.4 L 137.6 198.4" stroke="#000" strokeOpacity="0.24" strokeWidth="1" strokeDasharray="4 3" />
        <path d={shirtPath} stroke="#000" strokeOpacity={light ? 0.22 : 0.35} strokeWidth="1.3" />
      </g>

      {rect && showGuide && (
        <g pointerEvents="none">
          <rect
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            rx="3"
            fill="none"
            stroke={guideStroke}
            strokeWidth="1.2"
            strokeDasharray="6 5"
          />
          {!designUrl && (
            <text
              x={rect.x + rect.width / 2}
              y={rect.y + rect.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={guideStroke}
              fontSize={rect.width < 80 ? 7 : 11}
              fontWeight="600"
              letterSpacing="0.06em"
            >
              {rect.width < 80 ? "LOGO" : "YOUR DESIGN"}
            </text>
          )}
          {guideLabel && rect.width >= 80 && (
            <text
              x={rect.x + rect.width / 2}
              y={rect.y + rect.height + 14}
              textAnchor="middle"
              fill={guideStroke}
              fontSize="9.5"
              fontWeight="600"
              letterSpacing="0.04em"
            >
              {guideLabel}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}
