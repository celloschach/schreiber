import { DrawnChar } from '../types';

/**
 * Rendert einen Text als zusammenhängendes Canvas-Bild
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

  // Alle Buchstaben-Bilder vorladen
  const charImages = new Map<string, HTMLImageElement>();
  const charMetrics = new Map<string, { width: number; height: number; variants: number }>();
  
  const uniqueChars = new Set(text.split(''));
  
  const loadPromises: Promise<void>[] = [];
  for (const char of uniqueChars) {
    if (char === ' ' || char === '\n') continue;
    
    const variants = chars[char];
    if (variants && variants.length > 0) {
      const ref = variants[0];
      
      const promise = new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          charImages.set(char + '_ref', img);
          charMetrics.set(char, { 
            width: ref.width, 
            height: ref.height,
            variants: variants.length 
          });
          resolve();
        };
        img.onerror = () => resolve();
        img.src = ref.imageData;
      });
      loadPromises.push(promise);
      
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const p = new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            charImages.set(char + '_' + i, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = v.imageData;
        });
        loadPromises.push(p);
      }
    }
  }
  
  await Promise.all(loadPromises);
  
  const letterSpacing = -fontSize * 0.18;
  const wordSpacing = fontSize * 0.55;
  const lineHeight = fontSize * 1.5;
  
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
      const metrics = charMetrics.get(char);
      if (metrics) {
        // Relative Größe basierend auf gespeicherter Höhe
        const relativeSize = metrics.height / 120;
        const drawHeight = fontSize * relativeSize;
        const scale = drawHeight / metrics.height;
        charWidth = metrics.width * scale + letterSpacing;
      } else {
        charWidth = fontSize * 0.4 + letterSpacing;
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
  
  const padding = 24;
  const canvasWidth = maxWidth + padding * 2;
  const canvasHeight = lines.length * lineHeight + padding * 2;
  
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;
  
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
      
      const metrics = charMetrics.get(char);
      
      if (metrics) {
        // Relative Größe basierend auf gespeicherter Höhe
        // Großbuchstaben (120px) = fontSize
        // Kleinbuchstaben (60px) = fontSize * 0.5
        const relativeSize = metrics.height / 120; // Normalisiert auf 120px als Maximum
        const drawHeight = fontSize * relativeSize;
        const scale = drawHeight / metrics.height;
        const drawWidth = metrics.width * scale;
        
        const variantCount = metrics.variants;
        const variationFactor = Math.min(variantCount / 5, 1);
        
        const variantIdx = Math.floor(Math.random() * variantCount);
        const img = charImages.get(char + '_' + variantIdx);
        
        if (img) {
          const maxRotation = 0.025 * variationFactor;
          const maxOffset = 1.2 * variationFactor;
          const maxScaleVar = 0.025 * variationFactor;
          
          const rotation = (Math.random() - 0.5) * 2 * maxRotation;
          const yOffset = (Math.random() - 0.5) * 2 * maxOffset;
          const scaleVar = 1 + (Math.random() - 0.5) * 2 * maxScaleVar;
          
          // Y-Position anpassen: Kleinbuchstaben auf Basislinie
          const baselineOffset = drawHeight * 0.85;
          
          ctx.save();
          ctx.translate(x + drawWidth / 2, y + yOffset);
          ctx.rotate(rotation);
          ctx.scale(scaleVar, scaleVar);
          ctx.drawImage(img, -drawWidth / 2, -baselineOffset, drawWidth, drawHeight);
          ctx.restore();
        }
        
        x += drawWidth + letterSpacing;
      } else {
        ctx.save();
        ctx.font = `italic ${fontSize}px Georgia, serif`;
        ctx.fillStyle = penColor;
        ctx.globalAlpha = 0.5;
        ctx.fillText(char, x, y);
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
