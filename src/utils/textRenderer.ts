import { DrawnChar } from '../types';

/**
 * Findet die beste verfügbare Variante für ein Zeichen
 * Mit Fallback-Logik: Groß → Klein, Klein → Groß
 */
function findBestCharVariant(
  char: string,
  chars: Record<string, DrawnChar[]>
): { variant: DrawnChar; isFallback: boolean } | null {
  // 1. Direkt matching
  if (chars[char] && chars[char].length > 0) {
    return { variant: chars[char][Math.floor(Math.random() * chars[char].length)], isFallback: false };
  }
  
  // 2. Fallback: Groß ↔ Klein
  const lower = char.toLowerCase();
  const upper = char.toUpperCase();
  
  if (char === upper && chars[lower] && chars[lower].length > 0) {
    // Großbuchstabe gesucht, nur Klein vorhanden → Klein hochskalieren
    return { variant: chars[lower][Math.floor(Math.random() * chars[lower].length)], isFallback: true };
  }
  
  if (char === lower && chars[upper] && chars[upper].length > 0) {
    // Kleinbuchstabe gesucht, nur Groß vorhanden
    return { variant: chars[upper][Math.floor(Math.random() * chars[upper].length)], isFallback: true };
  }
  
  // 3. Spezielle Fallbacks für deutsche Zeichen
  const specialFallbacks: Record<string, string> = {
    'ä': 'a', 'ö': 'o', 'ü': 'u',
    'Ä': 'A', 'Ö': 'O', 'Ü': 'U',
    'ß': 'ss',
  };
  
  if (specialFallbacks[char]) {
    const fallback = specialFallbacks[char];
    if (chars[fallback] && chars[fallback].length > 0) {
      return { variant: chars[fallback][Math.floor(Math.random() * chars[fallback].length)], isFallback: true };
    }
  }
  
  return null;
}

/**
 * Berechnet den Positions-Faktor für kontext-basierte Variation
 * - Am Wortanfang: etwas größer/betonter
 * - In der Mitte: normal
 * - Am Wortende: etwas kleiner
 */
function getPositionFactor(charIndex: number, wordLength: number): {
  scaleMultiplier: number;
  rotationBias: number;
} {
  if (wordLength <= 1) {
    return { scaleMultiplier: 1, rotationBias: 0 };
  }
  
  const position = charIndex / (wordLength - 1); // 0 bis 1
  
  if (position === 0) {
    // Wortanfang: etwas größer
    return { scaleMultiplier: 1.05, rotationBias: -0.01 };
  } else if (position === 1) {
    // Wortende: etwas kleiner
    return { scaleMultiplier: 0.95, rotationBias: 0.01 };
  } else {
    // Mitte: normal
    return { scaleMultiplier: 1, rotationBias: 0 };
  }
}

/**
 * Rendert einen Text als zusammenhängendes Canvas-Bild
 * Mit Auto Groß/Klein und kontext-basierter Variation
 */
export async function renderText(
  text: string,
  chars: Record<string, DrawnChar[]>,
  options: {
    fontSize?: number;
    penColor?: string;
    backgroundColor?: string;
    maxWidth?: number;
  } = {}
): Promise<string> {
  const {
    fontSize = 36,
    penColor = '#1a1a2e',
    backgroundColor = '#fffef5',
    maxWidth = 750,
  } = options;

  // Wörter aufteilen für kontext-basierte Variation
  const words = text.split(/(\s+)/); // Behält Leerzeichen
  
  // Alle Buchstaben-Bilder vorladen
  const charImageCache = new Map<string, HTMLImageElement>();
  
  async function loadImageForChar(char: string): Promise<{ img: HTMLImageElement; metrics: { width: number; height: number; variants: number }; isFallback: boolean } | null> {
    const result = findBestCharVariant(char, chars);
    if (!result) return null;
    
    const { variant, isFallback } = result;
    const cacheKey = variant.id;
    
    if (charImageCache.has(cacheKey)) {
      return {
        img: charImageCache.get(cacheKey)!,
        metrics: { width: variant.width, height: variant.height, variants: chars[char]?.length || 1 },
        isFallback
      };
    }
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        charImageCache.set(cacheKey, img);
        resolve({
          img,
          metrics: { width: variant.width, height: variant.height, variants: chars[char]?.length || 1 },
          isFallback
        });
      };
      img.onerror = () => resolve(null);
      img.src = variant.imageData;
    });
  }

  // Layout berechnen
  const letterSpacing = -fontSize * 0.18;
  const wordSpacing = fontSize * 0.55;
  const lineHeight = fontSize * 1.5;
  
  // Zeilen berechnen
  interface LayoutChar {
    char: string;
    width: number;
    imageData: HTMLImageElement | null;
    metrics: { width: number; height: number; variants: number } | null;
    isFallback: boolean;
    wordIndex: number;
    charInWordIndex: number;
    wordLength: number;
  }
  
  const lines: LayoutChar[][] = [];
  let currentLine: LayoutChar[] = [];
  let currentWidth = 0;
  
  let wordIdx = 0;
  let charInWordIdx = 0;
  
  for (const word of words) {
    if (word.trim() === '') {
      // Leerzeichen
      const layoutChar: LayoutChar = {
        char: ' ',
        width: wordSpacing,
        imageData: null,
        metrics: null,
        isFallback: false,
        wordIndex: wordIdx,
        charInWordIndex: charInWordIdx,
        wordLength: 0,
      };
      
      if (currentWidth + wordSpacing > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [];
        currentWidth = 0;
      }
      
      currentLine.push(layoutChar);
      currentWidth += wordSpacing;
      wordIdx++;
      charInWordIdx = 0;
      continue;
    }
    
    // Wort-Buchstaben verarbeiten
    const wordLength = word.length;
    
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const loaded = await loadImageForChar(char);
      
      let charWidth = 0;
      if (loaded) {
        const scale = fontSize / loaded.metrics.height;
        charWidth = loaded.metrics.width * scale + letterSpacing;
      } else {
        charWidth = fontSize * 0.4 + letterSpacing;
      }
      
      if (currentWidth + charWidth > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [];
        currentWidth = 0;
      }
      
      currentLine.push({
        char,
        width: charWidth,
        imageData: loaded?.img || null,
        metrics: loaded?.metrics || null,
        isFallback: loaded?.isFallback || false,
        wordIndex: wordIdx,
        charInWordIndex: i,
        wordLength,
      });
      
      currentWidth += charWidth;
      charInWordIdx++;
    }
    
    wordIdx++;
    charInWordIdx = 0;
  }
  
  if (currentLine.length > 0) lines.push(currentLine);
  
  // Canvas erstellen
  const padding = 24;
  const canvasWidth = maxWidth + padding * 2;
  const canvasHeight = lines.length * lineHeight + padding * 2;
  
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Farbe extrahieren
  const tempEl = document.createElement('div');
  tempEl.style.color = penColor;
  document.body.appendChild(tempEl);
  const computedColor = getComputedStyle(tempEl).color;
  document.body.removeChild(tempEl);
  const colorMatch = computedColor.match(/\d+/g);
  const pr = colorMatch ? parseInt(colorMatch[0]) : 26;
  const pg = colorMatch ? parseInt(colorMatch[1]) : 26;
  const pb = colorMatch ? parseInt(colorMatch[2]) : 46;
  
  // Buchstaben rendern
  let y = padding + fontSize;
  
  for (const line of lines) {
    let x = padding;
    
    for (const layoutChar of line) {
      if (layoutChar.char === ' ') {
        x += wordSpacing;
        continue;
      }
      
      if (layoutChar.imageData && layoutChar.metrics) {
        const scale = fontSize / layoutChar.metrics.height;
        const drawWidth = layoutChar.metrics.width * scale;
        const drawHeight = fontSize;
        
        // Kontext-basierte Variation
        const posFactor = getPositionFactor(layoutChar.charInWordIndex, layoutChar.wordLength);
        const variantCount = layoutChar.metrics.variants;
        const variationFactor = Math.min(variantCount / 5, 1);
        
        // Variationen berechnen
        const maxRotation = 0.025 * variationFactor;
        const maxOffset = 1.2 * variationFactor;
        const maxScaleVar = 0.025 * variationFactor;
        
        const rotation = (Math.random() - 0.5) * 2 * maxRotation + posFactor.rotationBias;
        const yOffset = (Math.random() - 0.5) * 2 * maxOffset;
        const scaleVar = (1 + (Math.random() - 0.5) * 2 * maxScaleVar) * posFactor.scaleMultiplier;
        
        // Fallback-Buchstaben: Falls Groß/Klein nicht vorhanden, leicht transparent
        const alpha = layoutChar.isFallback ? 0.85 : 1;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x + drawWidth / 2, y + yOffset);
        ctx.rotate(rotation);
        ctx.scale(scaleVar, scaleVar);
        ctx.drawImage(layoutChar.imageData, -drawWidth / 2, -drawHeight * 0.85, drawWidth, drawHeight);
        ctx.restore();
        ctx.globalAlpha = 1;
        
        x += drawWidth + letterSpacing;
      } else {
        // Fallback: Standard-Font
        ctx.save();
        ctx.font = `italic ${fontSize}px Georgia, serif`;
        ctx.fillStyle = `rgb(${pr}, ${pg}, ${pb})`;
        ctx.globalAlpha = 0.4;
        ctx.fillText(layoutChar.char, x, y);
        ctx.restore();
        ctx.globalAlpha = 1;
        
        x += fontSize * 0.4 + letterSpacing;
      }
    }
    
    y += lineHeight;
  }
  
  return canvas.toDataURL('image/png');
}

export function getAlphabetCoverage(chars: Record<string, DrawnChar[]>): {
  coverage: number;
  totalChars: number;
  coveredChars: string[];
  missingChars: string[];
} {
  const required = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?-'.split('');
  const covered: string[] = [];
  const missing: string[] = [];
  
  for (const char of required) {
    if (chars[char] && chars[char].length > 0) {
      covered.push(char);
    } else {
      missing.push(char);
    }
  }
  
  return {
    coverage: covered.length / required.length,
    totalChars: Object.values(chars).reduce((sum, arr) => sum + arr.length, 0),
    coveredChars: covered,
    missingChars: missing,
  };
}
