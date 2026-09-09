import { DrawnChar } from '../types';

/**
 * Misst die durchschnittliche Linien-Dicke in einem Binärbild
 */
function measureLineThickness(binary: Uint8Array, width: number, height: number): number {
  const slices = 15;
  const thicknesses: number[] = [];
  
  for (let s = 0; s < slices; s++) {
    const y = Math.round((s + 0.5) * height / slices);
    if (y >= height) continue;
    
    let inLine = false;
    let lineWidth = 0;
    
    for (let x = 0; x < width; x++) {
      const isDark = binary[y * width + x] === 1;
      if (isDark && !inLine) {
        inLine = true;
        lineWidth = 1;
      } else if (isDark && inLine) {
        lineWidth++;
      } else if (!isDark && inLine) {
        inLine = false;
        if (lineWidth > 1) {
          thicknesses.push(lineWidth);
        }
      }
    }
    if (inLine && lineWidth > 1) {
      thicknesses.push(lineWidth);
    }
  }
  
  if (thicknesses.length === 0) return 1;
  
  thicknesses.sort((a, b) => a - b);
  return thicknesses[Math.floor(thicknesses.length / 2)];
}

/**
 * Dilate: Vergrößert dunkle Bereiche
 */
function dilate(binary: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const result = new Uint8Array(binary);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (binary[y * width + x] === 1) {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy <= radius * radius) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                result[ny * width + nx] = 1;
              }
            }
          }
        }
      }
    }
  }
  
  return result;
}

/**
 * Erode: Verkleinert dunkle Bereiche
 */
function erode(binary: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const result = new Uint8Array(binary.length);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (binary[y * width + x] === 1) {
        let allDark = true;
        for (let dy = -radius; dy <= radius && allDark; dy++) {
          for (let dx = -radius; dx <= radius && allDark; dx++) {
            if (dx * dx + dy * dy <= radius * radius) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || nx >= width || ny < 0 || ny >= height || binary[ny * width + nx] === 0) {
                allDark = false;
              }
            }
          }
        }
        if (allDark) {
          result[y * width + x] = 1;
        }
      }
    }
  }
  
  return result;
}

/**
 * Normalisiert die Linien-Dicke auf einen Zielwert
 */
function normalizeLineThickness(
  binary: Uint8Array,
  width: number,
  height: number,
  targetThickness: number
): Uint8Array {
  const currentThickness = measureLineThickness(binary, width, height);
  
  if (currentThickness <= 0) return binary;
  
  const diff = targetThickness - currentThickness;
  
  if (Math.abs(diff) < 0.8) return binary;
  
  if (diff > 0) {
    const radius = Math.max(1, Math.round(Math.abs(diff) / 2));
    return dilate(binary, width, height, radius);
  } else {
    const radius = Math.max(1, Math.round(Math.abs(diff) / 2));
    return erode(binary, width, height, radius);
  }
}

/**
 * Rendert einen Text als zusammenhängendes Canvas-Bild
 * Mit Linien-Dicke-Normalisierung BEIM RENDERN
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

  // Ziel-Linien-Dicke relativ zur Schriftgröße
  const targetLineThickness = fontSize * 0.18; // 18% der Schriftgröße

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
        const scale = fontSize / metrics.height;
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
        const scale = fontSize / metrics.height;
        const drawWidth = metrics.width * scale;
        const drawHeight = fontSize;
        
        const variantCount = metrics.variants;
        const variationFactor = Math.min(variantCount / 5, 1);
        
        const variantIdx = Math.floor(Math.random() * variantCount);
        const img = charImages.get(char + '_' + variantIdx);
        
        if (img) {
          // Buchstaben auf temporäres Canvas zeichnen
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = Math.ceil(drawWidth) + 4;
          tempCanvas.height = Math.ceil(drawHeight) + 4;
          const tempCtx = tempCanvas.getContext('2d')!;
          
          const maxRotation = 0.025 * variationFactor;
          const maxOffset = 1.2 * variationFactor;
          const maxScaleVar = 0.025 * variationFactor;
          
          const rotation = (Math.random() - 0.5) * 2 * maxRotation;
          const yOffset = (Math.random() - 0.5) * 2 * maxOffset;
          const scaleVar = 1 + (Math.random() - 0.5) * 2 * maxScaleVar;
          
          tempCtx.save();
          tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2 + yOffset);
          tempCtx.rotate(rotation);
          tempCtx.scale(scaleVar, scaleVar);
          tempCtx.drawImage(img, -drawWidth / 2, -drawHeight * 0.85, drawWidth, drawHeight);
          tempCtx.restore();
          
          // === LINIEN-DICKE NORMALISIEREN ===
          const tempData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          const binary = new Uint8Array(tempCanvas.width * tempCanvas.height);
          
          for (let i = 0; i < binary.length; i++) {
            const r = tempData.data[i * 4];
            const g = tempData.data[i * 4 + 1];
            const b = tempData.data[i * 4 + 2];
            binary[i] = (r < 200 || g < 200 || b < 200) ? 1 : 0;
          }
          
          const normalizedBinary = normalizeLineThickness(binary, tempCanvas.width, tempCanvas.height, targetLineThickness);
          
          // Ergebnis auf tempCanvas schreiben
          const resultData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          
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
          
          for (let i = 0; i < normalizedBinary.length; i++) {
            if (normalizedBinary[i] === 1) {
              resultData.data[i * 4] = pr;
              resultData.data[i * 4 + 1] = pg;
              resultData.data[i * 4 + 2] = pb;
              resultData.data[i * 4 + 3] = 255;
            } else {
              resultData.data[i * 4 + 3] = 0; // Transparent
            }
          }
          
          tempCtx.putImageData(resultData, 0, 0);
          
          // Auf Hauptcanvas zeichnen
          ctx.drawImage(tempCanvas, x - 2, y - drawHeight * 0.85 - 2);
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
