// Code 128 barcodes, the kind courier scanners read, drawn without a library.
// Each symbol is 3 bars and 3 spaces, written as their widths in modules (they add up to 11;
// the stop symbol has a final bar, so 13).
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const CODE_B = 100;
const START_B = 104;
const START_C = 105;
const STOP = 106;
/** Blank space either side, so the scanner can find where the barcode starts. */
const QUIET_ZONE = 10;

/** The symbols for some text: digits two to a symbol (code set C), anything else one each (B). */
function symbolsFor(text: string): number[] | null {
  if (!text || !/^[\x20-\x7e]+$/.test(text)) return null;
  const symbols: number[] = [];

  if (/^\d{2,}$/.test(text)) {
    symbols.push(START_C);
    const pairs = text.length - (text.length % 2);
    for (let i = 0; i < pairs; i += 2) symbols.push(Number(text.slice(i, i + 2)));
    if (pairs < text.length) symbols.push(CODE_B, text.charCodeAt(pairs) - 32);
  } else {
    symbols.push(START_B);
    for (let i = 0; i < text.length; i++) symbols.push(text.charCodeAt(i) - 32);
  }

  // checksum: the start symbol, plus each later symbol times its position
  const checksum = symbols.reduce((sum, value, i) => sum + value * Math.max(i, 1), 0) % 103;
  symbols.push(checksum, STOP);
  return symbols;
}

/** A barcode's bars as x and width in modules, and its total width including the quiet zones. */
export function code128(text: string): { bars: { x: number; w: number }[]; width: number } | null {
  const symbols = symbolsFor(text);
  if (!symbols) return null;

  const bars: { x: number; w: number }[] = [];
  let x = QUIET_ZONE;
  for (const symbol of symbols) {
    const widths = PATTERNS[symbol];
    for (let i = 0; i < widths.length; i++) {
      const w = Number(widths[i]);
      if (i % 2 === 0) bars.push({ x, w });
      x += w;
    }
  }
  return { bars, width: x + QUIET_ZONE };
}
