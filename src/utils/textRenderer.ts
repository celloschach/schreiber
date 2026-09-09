import { DrawnChar } from '../types';

/**
 * Rendert einen Text als zusammenhängendes Canvas-Bild
 * - Einheitlicher cremefarbener Hintergrund
 * - Buchstaben in Wörtern sehr nah beieinander (überlappend)
 * - Große Abstände zwischen Wörtern
 * - Mehr Samples = natürlichere Variation
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

  // Alle benötigten Buchstaben-Bilder vorladen
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
      
      // Alle Varianten laden und Hintergrund entfernen
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const p = new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            // Hintergrund entfernen: Helles wird transparent
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tempCtx = tempCanvas.getContext('2d')!;
            tempCtx.drawImage(img, 0, 0);
            
            const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imgData.data;
            
            // Schwellenwert für Hintergrund
            const BG_THRESHOLD = 230;
            
            for (let j = 0; j < data.length; j += 4) {
              const r = data[j];
              const g = data[j + 1];
              const b = data[j + 2];
              
              // Wenn Pixel hell genug ist → transparent machen
              if (r > BG_THRESHOLD && g > BG_THRESHOLD && b > BG_THRESHOLD) {
                data[j + 3] = 0; // Alpha = 0 (transparent)
              }
            }
            
            tempCtx.putImageData(imgData, 0, 0);
            
            // Als PNG mit Transparenz speichern
            const cleanImg = new Image();
            cleanImg.onload = () => {
              charImages.set(char + '_' + i, cleanImg);
              resolve();
            };
            cleanImg.onerror = () => {
              charImages.set(char + '_' + i, img); // Fallback
              resolve();
            };
            cleanImg.src = tempCanvas.toDataURL('image/png');
          };
          img.onerror = () => resolve();
          img.src = v.imageData;
        });
        loadPromises.push(p);
      }
    }
  }
  
  await Promise.all(loadPromises);
  
  // ABSTÄNDE:
  // Buchstaben innerhalb eines Wortes: sehr nah, überlappend
  const letterSpacing = -fontSize * 0.18; // Stark negativ = Überlappung
  // Zwischen Wörtern: großer Abstand
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
        // Effektive Breite = Bildbreite + Letter-Spacing (negativ!)
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
  
  // Canvas-Größe
  const padding = 24;
  const canvasWidth = maxWidth + padding * 2;
  const canvasHeight = lines.length * lineHeight + padding * 2;
  
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;
  
  // Einheitlicher Hintergrund — KEINE Textur
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
        
        // Variation basierend auf Anzahl der Samples
        const variantCount = metrics.variants;
        const variationFactor = Math.min(variantCount / 5, 1);
        
        // Zufällige Variante auswählen
        const variantIdx = Math.floor(Math.random() * variantCount);
        const img = charImages.get(char + '_' + variantIdx);
        
        if (img) {
          // Natürliche Variationen — stärker bei mehr Samples
          const maxRotation = 0.025 * variationFactor;
          const maxOffset = 1.2 * variationFactor;
          const maxScaleVar = 0.025 * variationFactor;
          
          const rotation = (Math.random() - 0.5) * 2 * maxRotation;
          const yOffset = (Math.random() - 0.5) * 2 * maxOffset;
          const scaleVar = 1 + (Math.random() - 0.5) * 2 * maxScaleVar;
          
          ctx.save();
          ctx.translate(x + drawWidth / 2, y + yOffset);
          ctx.rotate(rotation);
          ctx.scale(scaleVar, scaleVar);
          
          // 'multiply' Modus: Weiße/helle Pixel werden transparent,
          // nur die dunklen Striche werden gezeichnet.
          // So wird ein eventuell grauer Hintergrund unsichtbar.
          ctx.globalCompositeOperation = 'multiply';
          ctx.drawImage(img, -drawWidth / 2, -drawHeight * 0.85, drawWidth, drawHeight);
          ctx.globalCompositeOperation = 'source-over';
          
          ctx.restore();
        }
        
        // Nächstes x: aktuelle Position + Bildbreite + negativer Spacing
        x += drawWidth + letterSpacing;
      } else {
        // Fallback für nicht gelernte Zeichen
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

/**
 * Berechnet die Alphabet-Abdeckung (Groß + Klein getrennt)
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
