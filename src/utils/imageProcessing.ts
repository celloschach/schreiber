/**
 * Bildvorverarbeitung für optimierte Handschrift-Erkennung
 * Verbessert die Bildqualität bevor es an Tesseract übergeben wird
 */

export interface PreprocessingOptions {
  contrast: number;      // 0-200, Standard: 130
  brightness: number;    // -100 bis 100, Standard: 0
  sharpen: boolean;      // Schärfen aktivieren
  binarize: boolean;     // Binarisierung (Schwarz/Weiß)
  binarizeThreshold: number; // 0-255, Standard: 128
  deskew: boolean;       // Schräglage korrigieren
  denoise: boolean;      // Rauschen reduzieren
  scale: number;         // Skalierungsfaktor (für bessere Erkennung bei kleinen Schriften)
}

const DEFAULT_OPTIONS: PreprocessingOptions = {
  contrast: 140,
  brightness: 10,
  sharpen: true,
  binarize: true,
  binarizeThreshold: 130,
  deskew: true,
  denoise: true,
  scale: 2,
};

/**
 * Lädt ein Bild von einer Data-URL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Hauptfunktion: Verarbeitet ein Bild für optimale OCR-Erkennung
 */
export async function preprocessImage(
  imageDataUrl: string,
  options: Partial<PreprocessingOptions> = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const img = await loadImage(imageDataUrl);
  
  // Canvas erstellen mit Skalierung
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const scale = opts.scale;
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  
  // Bild zeichnen (skaliert)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  // Bilddaten holen
  let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // 1. Rauschen reduzieren (Median-Filter für kleine Bereiche)
  if (opts.denoise) {
    imgData = applyDenoise(imgData, canvas.width, canvas.height);
  }
  
  // 2. Kontrast und Helligkeit anpassen
  imgData = adjustContrastBrightness(imgData, opts.contrast, opts.brightness);
  
  // 3. Schärfen
  if (opts.sharpen) {
    imgData = applySharpen(imgData, canvas.width, canvas.height);
  }
  
  // 4. Binarisierung (Adaptiver Threshold)
  if (opts.binarize) {
    imgData = applyAdaptiveBinarization(imgData, canvas.width, canvas.height, opts.binarizeThreshold);
  }
  
  // Ergebnis zurück auf Canvas
  ctx.putImageData(imgData, 0, 0);
  
  return canvas.toDataURL('image/png');
}

/**
 * Kontrast und Helligkeit anpassen
 */
function adjustContrastBrightness(
  imageData: ImageData,
  contrast: number,
  brightness: number
): ImageData {
  const data = imageData.data;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  
  for (let i = 0; i < data.length; i += 4) {
    // Grau berechnen
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    
    // Kontrast und Helligkeit anwenden
    let newValue = factor * (gray - 128) + 128 + brightness;
    newValue = Math.max(0, Math.min(255, newValue));
    
    data[i] = newValue;
    data[i + 1] = newValue;
    data[i + 2] = newValue;
  }
  
  return imageData;
}

/**
 * Schärfen mit Unsharp-Mask
 */
function applySharpen(imageData: ImageData, width: number, height: number): ImageData {
  const data = imageData.data;
  const copy = new Uint8ClampedArray(data);
  
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const kIdx = (ky + 1) * 3 + (kx + 1);
          sum += copy[idx] * kernel[kIdx];
        }
      }
      const idx = (y * width + x) * 4;
      const val = Math.max(0, Math.min(255, sum));
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
    }
  }
  
  return imageData;
}

/**
 * Adaptive Binarisierung (Otsu-ähnlich)
 */
function applyAdaptiveBinarization(
  imageData: ImageData,
  width: number,
  height: number,
  threshold: number
): ImageData {
  const data = imageData.data;
  const blockSize = 15;
  const C = 5;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Lokalen Durchschnitt berechnen
      let sum = 0;
      let count = 0;
      for (let dy = -blockSize; dy <= blockSize; dy++) {
        for (let dx = -blockSize; dx <= blockSize; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            const nIdx = (ny * width + nx) * 4;
            sum += data[nIdx];
            count++;
          }
        }
      }
      
      const localThreshold = sum / count - C;
      const pixel = data[idx];
      
      const newVal = pixel < localThreshold ? 0 : 255;
      data[idx] = newVal;
      data[idx + 1] = newVal;
      data[idx + 2] = newVal;
    }
  }
  
  return imageData;
}

/**
 * Rauschen reduzieren (3x3 Median-Filter)
 */
function applyDenoise(imageData: ImageData, width: number, height: number): ImageData {
  const data = imageData.data;
  const copy = new Uint8ClampedArray(data);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const values: number[] = [];
      
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          values.push(copy[idx]);
        }
      }
      
      values.sort((a, b) => a - b);
      const median = values[4]; // Median von 9 Werten
      
      const idx = (y * width + x) * 4;
      data[idx] = median;
      data[idx + 1] = median;
      data[idx + 2] = median;
    }
  }
  
  return imageData;
}

/**
 * Mehrstufige Verarbeitung: Erst normal, dann mit verschiedenen Einstellungen
 * Gibt das beste Ergebnis zurück
 */
export async function multiPassPreprocessing(imageDataUrl: string): Promise<string[]> {
  const results: string[] = [];
  
  // Pass 1: Standard-Verarbeitung
  results.push(await preprocessImage(imageDataUrl, {
    contrast: 140,
    brightness: 10,
    sharpen: true,
    binarize: true,
    scale: 2,
  }));
  
  // Pass 2: Hoher Kontrast für blasses Schreiben
  results.push(await preprocessImage(imageDataUrl, {
    contrast: 180,
    brightness: 20,
    sharpen: true,
    binarize: true,
    binarizeThreshold: 140,
    scale: 2,
  }));
  
  // Pass 3: Ohne Binarisierung für Tesseract-eigene Verarbeitung
  results.push(await preprocessImage(imageDataUrl, {
    contrast: 130,
    brightness: 0,
    sharpen: false,
    binarize: false,
    scale: 3,
  }));
  
  return results;
}

/**
 * Wählt das beste OCR-Ergebnis aus mehreren Durchgängen
 * Bewertet nach: Länge, Wortanteil, bekannte Wörter
 */
export function selectBestResult(results: string[]): string {
  if (results.length === 0) return '';
  if (results.length === 1) return results[0];
  
  let bestResult = results[0];
  let bestScore = scoreResult(results[0]);
  
  for (let i = 1; i < results.length; i++) {
    const score = scoreResult(results[i]);
    if (score > bestScore) {
      bestScore = score;
      bestResult = results[i];
    }
  }
  
  return bestResult;
}

function scoreResult(text: string): number {
  if (!text.trim()) return -Infinity;
  
  const words = text.trim().split(/\s+/);
  let score = 0;
  
  // Bonus für angemessene Länge
  score += Math.min(text.length / 10, 20);
  
  // Bonus für Wortanzahl
  score += words.length * 2;
  
  // Bonus für bekannte Wörter
  for (const word of words) {
    const clean = word.toLowerCase().replace(/[^a-zäöüß]/g, '');
    if (clean.length > 2) {
      // Einfache Heuristik: enthält das Wort typische deutsche Buchstaben-Kombinationen?
      if (/(ei|ie|en|er|ch|sch|ein|ung|heit|keit|lich|tion)/.test(clean)) {
        score += 5;
      }
    }
  }
  
  // Strafe für zu viele Sonderzeichen
  const specialChars = (text.match(/[^a-zA-ZäöüÄÖÜß\s.,!?;:\-'"()]/g) || []).length;
  score -= specialChars * 3;
  
  // Bonus für korrekte Groß-/Kleinschreibung
  const sentenceStarts = text.match(/[.!?]\s+[A-Z]/g) || [];
  score += sentenceStarts.length * 2;
  
  return score;
}
