import { DrawnChar } from '../types';

/**
 * Rendert Text mit gezeichneten Buchstaben
 * Saubere Implementierung mit korrekter Bildladung
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

  // Einfache Abstände
  const letterSpacing = fontSize * 0.05;
  const wordSpacing = fontSize * 0.4;
  const lineHeight = fontSize * 1.6;

  // === SCHRITT 1: Alle benötigten Bilder vorladen ===
  const imageCache = new Map<string, HTMLImageElement>();
  
  const uniqueChars = new Set(text.split(''));
  const loadPromises: Promise<void>[] = [];
  
  for (const char of uniqueChars) {
    if (char === ' ' || char === '\n') continue;
    
    const variants = chars[char];
    if (variants && variants.length > 0) {
      // Für jeden Buchstaben: Alle Varianten laden
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        const cacheKey = `${char}_${i}`;
        
        if (!imageCache.has(cacheKey)) {
          const promise = new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              imageCache.set(cacheKey, img);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = variant.imageData;
          });
          loadPromises.push(promise);
        }
      }
    }
  }
  
  // Warten bis alle Bilder geladen sind
  await Promise.all(loadPromises);

  // === SCHRITT 2: Layout berechnen ===
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentWidth = 0;

  for (const char of text) {
    if (char === '\n') {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
      continue;
    }

    let charWidth = 0;
    if (char === ' ') {
      charWidth = wordSpacing;
    } else {
      const variants = chars[char];
      if (variants && variants.length > 0) {
        const sample = variants[0];
        // Proportionale Skalierung basierend auf gespeicherter Höhe
        const relativeScale = sample.height / 120;
        const drawHeight = fontSize * relativeScale;
        const drawWidth = sample.width * (drawHeight / sample.height);
        charWidth = drawWidth + letterSpacing;
      } else {
        charWidth = fontSize * 0.5 + letterSpacing;
      }
    }

    if (currentWidth + charWidth > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
    }

    currentLine.push(char);
    currentWidth += charWidth;
  }
  if (currentLine.length > 0) lines.push(currentLine);

  // === SCHRITT 3: Canvas erstellen und rendern ===
  const padding = 24;
  const canvasWidth = maxWidth + padding * 2;
  const canvasHeight = lines.length * lineHeight + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;

  // Hintergrund
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Buchstaben rendern
  let y = padding + fontSize;

  for (const line of lines) {
    let x = padding;

    for (const char of line) {
      if (char === ' ') {
        x += wordSpacing;
        continue;
      }

      const variants = chars[char];

      if (variants && variants.length > 0) {
        // Zufällige Variante für Natürlichkeit
        const variantIdx = Math.floor(Math.random() * variants.length);
        const sample = variants[variantIdx];
        const cacheKey = `${char}_${variantIdx}`;
        
        const img = imageCache.get(cacheKey);
        
        if (img) {
          // Proportionale Skalierung basierend auf gespeicherter Höhe
          // Großbuchstaben (120px) werden größer als Kleinbuchstaben (60px)
          const relativeScale = sample.height / 120; // 120px ist die Max-Höhe
          const drawHeight = fontSize * relativeScale;
          const drawWidth = sample.width * (drawHeight / sample.height);

          // Buchstabe zeichnen - Bild ist bereits geladen!
          ctx.drawImage(img, x, y - drawHeight * 0.85, drawWidth, drawHeight);

          x += drawWidth + letterSpacing;
        } else {
          // Fallback wenn Bild nicht geladen werden konnte
          ctx.font = `${fontSize}px Georgia, serif`;
          ctx.fillStyle = penColor;
          ctx.fillText(char, x, y);
          x += fontSize * 0.5 + letterSpacing;
        }
      } else {
        // Fallback: Standard-Font
        ctx.font = `${fontSize}px Georgia, serif`;
        ctx.fillStyle = penColor;
        ctx.fillText(char, x, y);
        x += fontSize * 0.5 + letterSpacing;
      }
    }

    y += lineHeight;
  }

  return canvas.toDataURL('image/png');
}

/**
 * Berechnet die Alphabet-Abdeckung
 */
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
