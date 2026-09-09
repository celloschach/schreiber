import { DrawnChar } from '../types';

/**
 * Rendert einen Text als zusammenhängendes Canvas-Bild
 * Die Buchstaben werden natürlich aneinander gereiht mit leichten Variationen
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
    fontSize = 32,
    penColor = '#1a1a2e',
    backgroundColor = '#fffef5',
    maxWidth = 700,
  } = options;

  // Zuerst alle benötigten Buchstaben-Bilder laden
  const charImages = new Map<string, HTMLImageElement>();
  const charMetrics = new Map<string, { width: number; height: number }>();
  
  // Einzigartige Zeichen im Text sammeln
  const uniqueChars = new Set(text.toLowerCase().split(''));
  
  // Bilder vorladen
  const loadPromises: Promise<void>[] = [];
  for (const char of uniqueChars) {
    if (char === ' ' || char === '\n') continue;
    
    const variants = chars[char];
    if (variants && variants.length > 0) {
      // Zufällige Variante wählen
      const variant = variants[Math.floor(Math.random() * variants.length)];
      
      const promise = new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          charImages.set(char, img);
          charMetrics.set(char, { width: variant.width, height: variant.height });
          resolve();
        };
        img.onerror = () => resolve();
        img.src = variant.imageData;
      });
      loadPromises.push(promise);
    }
  }
  
  await Promise.all(loadPromises);
  
  // Zeilen berechnen
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentWidth = 0;
  const lineHeight = fontSize * 1.4;
  const charSpacing = fontSize * 0.05;
  const wordSpacing = fontSize * 0.35;
  
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
      const metrics = charMetrics.get(char.toLowerCase());
      if (metrics) {
        // Breite proportional zur Schriftgröße skalieren
        const scale = fontSize / metrics.height;
        charWidth = metrics.width * scale + charSpacing;
      } else {
        charWidth = fontSize * 0.5 + charSpacing;
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
  
  // Canvas-Größe berechnen
  const padding = 20;
  const canvasWidth = maxWidth + padding * 2;
  const canvasHeight = lines.length * lineHeight + padding * 2;
  
  // Canvas erstellen
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;
  
  // Hintergrund
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Leichte Papier-Textur
  ctx.globalAlpha = 0.015;
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = `hsl(${30 + Math.random() * 20}, 20%, ${50 + Math.random() * 30}%)`;
    ctx.fillRect(
      Math.random() * canvasWidth,
      Math.random() * canvasHeight,
      Math.random() * 2 + 0.5,
      Math.random() * 2 + 0.5
    );
  }
  ctx.globalAlpha = 1;
  
  // Buchstaben rendern
  let y = padding + fontSize;
  
  for (const line of lines) {
    let x = padding;
    
    for (const char of line) {
      if (char === ' ') {
        x += wordSpacing;
        continue;
      }
      
      const img = charImages.get(char.toLowerCase());
      const metrics = charMetrics.get(char.toLowerCase());
      
      if (img && metrics) {
        const scale = fontSize / metrics.height;
        const drawWidth = metrics.width * scale;
        const drawHeight = fontSize;
        
        // Natürliche Variationen
        const rotation = (Math.random() - 0.5) * 0.04; // Leichte Drehung
        const yOffset = (Math.random() - 0.5) * 2; // Leichte Höhen-Variation
        const scaleVar = 0.97 + Math.random() * 0.06; // Leichte Größen-Variation
        
        ctx.save();
        ctx.translate(x + drawWidth / 2, y + yOffset);
        ctx.rotate(rotation);
        ctx.scale(scaleVar, scaleVar);
        
        // Buchstaben zeichnen
        ctx.drawImage(img, -drawWidth / 2, -drawHeight * 0.85, drawWidth, drawHeight);
        ctx.restore();
        
        x += drawWidth + charSpacing;
      } else {
        // Fallback: Zeichen mit Canvas-Font
        ctx.save();
        ctx.font = `italic ${fontSize}px Georgia, serif`;
        ctx.fillStyle = penColor;
        ctx.globalAlpha = 0.7;
        
        const rotation = (Math.random() - 0.5) * 0.03;
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.fillText(char, 0, 0);
        ctx.restore();
        ctx.globalAlpha = 1;
        
        x += fontSize * 0.5 + charSpacing;
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
  const required = 'abcdefghijklmnopqrstuvwxyzäöüß0123456789,.!?-'.split('');
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
