import { DrawnChar } from '../types';

/**
 * Rendert Text mit gezeichneten Buchstaben
 * Einfache, saubere Implementierung ohne komplexe Normalisierung
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
  const letterSpacing = fontSize * 0.05; // 5% Abstand zwischen Buchstaben
  const wordSpacing = fontSize * 0.4; // 40% Abstand zwischen Wörtern
  const lineHeight = fontSize * 1.6;

  // Zeilen berechnen
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
        const scale = fontSize / sample.height;
        charWidth = sample.width * scale + letterSpacing;
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

  // Canvas erstellen
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
        const sample = variants[Math.floor(Math.random() * variants.length)];
        const scale = fontSize / sample.height;
        const drawWidth = sample.width * scale;
        const drawHeight = fontSize;

        // Bild laden
        const img = new Image();
        img.src = sample.imageData;
        
        // Warten bis Bild geladen ist
        await new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        });

        // Buchstabe zeichnen
        ctx.drawImage(img, x, y - drawHeight * 0.85, drawWidth, drawHeight);

        x += drawWidth + letterSpacing;
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
