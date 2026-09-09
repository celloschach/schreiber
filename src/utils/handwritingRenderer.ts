/**
 * Handschrift-Rendering-Engine
 * Rendert Text mit den gelernten Buchstaben-Bildern
 */

export interface CharacterSample {
  id: string;
  char: string;
  imageData: string;
  width: number;
  height: number;
}

export interface CharacterMap {
  [char: string]: CharacterSample[];
}

/**
 * Extrahiert einzelne Buchstaben aus einem Bild
 * Der Benutzer schreibt die Buchstaben in einer Zeile, getrennt durch kleine Lücken
 */
export async function extractCharacters(
  imageDataUrl: string,
  expectedChars: string
): Promise<CharacterSample[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Skalieren für bessere Erkennung
      const scale = 2;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const width = canvas.width;
      const height = canvas.height;
      
      // Vertikale Projektion: Summe der dunklen Pixel pro Spalte
      const projection: number[] = new Array(width).fill(0);
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const idx = (y * width + x) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          if (brightness < 128) {
            projection[x]++;
          }
        }
      }
      
      // Buchstaben-Bereiche finden (zusammenhängende Spalten mit dunklen Pixeln)
      const segments: { start: number; end: number }[] = [];
      let inSegment = false;
      let segStart = 0;
      const threshold = height * 0.05; // Mindestens 5% der Höhe muss dunkel sein
      
      for (let x = 0; x < width; x++) {
        if (projection[x] > threshold) {
          if (!inSegment) {
            segStart = x;
            inSegment = true;
          }
        } else {
          if (inSegment) {
            segments.push({ start: segStart, end: x });
            inSegment = false;
          }
        }
      }
      if (inSegment) {
        segments.push({ start: segStart, end: width });
      }
      
      // Zusammenhängende Segmente zusammenführen (für Buchstaben wie 'i' die Punkte)
      const mergedSegments: { start: number; end: number }[] = [];
      const gapThreshold = width * 0.02; // 2% der Breite als max Lücke
      
      for (const seg of segments) {
        if (mergedSegments.length > 0) {
          const last = mergedSegments[mergedSegments.length - 1];
          if (seg.start - last.end < gapThreshold) {
            last.end = seg.end;
            continue;
          }
        }
        mergedSegments.push({ ...seg });
      }
      
      // Buchstaben den erwarteten Zeichen zuordnen
      const samples: CharacterSample[] = [];
      const chars = expectedChars.replace(/\s/g, '');
      
      // Wenn die Anzahl der Segmente mit der Anzahl der Zeichen übereinstimmt
      if (mergedSegments.length >= chars.length) {
        // Nimm die ersten N Segmente (oder verteile gleichmäßig)
        const step = mergedSegments.length / chars.length;
        
        for (let i = 0; i < chars.length; i++) {
          const segIdx = Math.round(i * step);
          if (segIdx < mergedSegments.length) {
            const seg = mergedSegments[segIdx];
            const charCanvas = document.createElement('canvas');
            const padding = Math.max(4, (seg.end - seg.start) * 0.1);
            charCanvas.width = Math.ceil(seg.end - seg.start + padding * 2);
            charCanvas.height = height;
            
            const charCtx = charCanvas.getContext('2d')!;
            charCtx.fillStyle = 'white';
            charCtx.fillRect(0, 0, charCanvas.width, charCanvas.height);
            charCtx.drawImage(
              canvas,
              Math.max(0, seg.start - padding), 0,
              charCanvas.width, height,
              0, 0,
              charCanvas.width, height
            );
            
            samples.push({
              id: `${Date.now()}-${i}`,
              char: chars[i].toLowerCase(),
              imageData: charCanvas.toDataURL('image/png'),
              width: charCanvas.width,
              height: charCanvas.height,
            });
          }
        }
      } else {
        // Fallback: Gleichmäßig aufteilen
        const charWidth = width / chars.length;
        for (let i = 0; i < chars.length; i++) {
          const charCanvas = document.createElement('canvas');
          charCanvas.width = Math.ceil(charWidth);
          charCanvas.height = height;
          
          const charCtx = charCanvas.getContext('2d')!;
          charCtx.drawImage(
            canvas,
            i * charWidth, 0, charWidth, height,
            0, 0, charWidth, height
          );
          
          samples.push({
            id: `${Date.now()}-${i}`,
            char: chars[i].toLowerCase(),
            imageData: charCanvas.toDataURL('image/png'),
            width: charCanvas.width,
            height: charCanvas.height,
          });
        }
      }
      
      resolve(samples);
    };
    img.src = imageDataUrl;
  });
}

/**
 * Rendert einen Text mit den gelernten Buchstaben auf einem Canvas
 */
export function renderHandwriting(
  text: string,
  characterMap: CharacterMap,
  options: {
    fontSize?: number;
    lineHeight?: number;
    wordSpacing?: number;
    charSpacing?: number;
    backgroundColor?: string;
    randomize?: boolean;
  } = {}
): string {
  const {
    fontSize = 40,
    lineHeight = 1.5,
    wordSpacing = 15,
    charSpacing = 2,
    backgroundColor = '#fffef5',
    randomize = true,
  } = options;
  
  // Canvas erstellen
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // Canvas-Größe berechnen
  const chars = text.split('');
  let totalWidth = 0;
  let maxCharHeight = fontSize;
  
  for (const char of chars) {
    if (char === ' ') {
      totalWidth += wordSpacing;
    } else if (char === '\n') {
      totalWidth = 0;
    } else {
      const samples = characterMap[char.toLowerCase()];
      if (samples && samples.length > 0) {
        const sample = samples[0];
        const scaledWidth = (sample.width / sample.height) * fontSize;
        totalWidth += scaledWidth + charSpacing;
        maxCharHeight = Math.max(maxCharHeight, fontSize);
      } else {
        totalWidth += fontSize * 0.6 + charSpacing;
      }
    }
  }
  
  // Mehrzeilig berechnen
  const maxWidth = Math.min(totalWidth + 100, 800);
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentWidth = 0;
  
  for (const char of chars) {
    if (char === '\n') {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
      continue;
    }
    
    let charWidth = charSpacing;
    if (char === ' ') {
      charWidth = wordSpacing;
    } else {
      const samples = characterMap[char.toLowerCase()];
      if (samples && samples.length > 0) {
        charWidth = (samples[0].width / samples[0].height) * fontSize + charSpacing;
      } else {
        charWidth = fontSize * 0.6 + charSpacing;
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
  
  // Canvas final setzen
  const canvasWidth = maxWidth + 40;
  const canvasHeight = lines.length * maxCharHeight * lineHeight + 40;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // Hintergrund
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Leichte Papier-Textur
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 1000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#888';
    ctx.fillRect(
      Math.random() * canvasWidth,
      Math.random() * canvasHeight,
      1, 1
    );
  }
  ctx.globalAlpha = 1;
  
  // Buchstaben rendern
  let y = 20 + maxCharHeight;
  
  for (const line of lines) {
    let x = 20;
    
    for (const char of line) {
      if (char === ' ') {
        x += wordSpacing;
        continue;
      }
      
      const samples = characterMap[char.toLowerCase()];
      
      if (samples && samples.length > 0) {
        // Zufälliges Sample auswählen für Natürlichkeit
        const sampleIdx = randomize
          ? Math.floor(Math.random() * samples.length)
          : 0;
        const sample = samples[sampleIdx];
        
        const scaledHeight = fontSize;
        const scaledWidth = (sample.width / sample.height) * scaledHeight;
        
        // Leichte Variation für Natürlichkeit
        const rotation = randomize ? (Math.random() - 0.5) * 0.06 : 0;
        const yOffset = randomize ? (Math.random() - 0.5) * 3 : 0;
        const scaleVariation = randomize ? 0.95 + Math.random() * 0.1 : 1;
        
        ctx.save();
        ctx.translate(x + scaledWidth / 2, y + yOffset);
        ctx.rotate(rotation);
        ctx.scale(scaleVariation, scaleVariation);
        
        // Buchstaben-Bild laden und zeichnen
        const charImg = new Image();
        charImg.src = sample.imageData;
        
        // Synchron zeichnen (Bild ist bereits geladen als Data-URL)
        ctx.drawImage(charImg, -scaledWidth / 2, -scaledHeight * 0.8, scaledWidth, scaledHeight);
        ctx.restore();
        
        x += scaledWidth + charSpacing;
      } else {
        // Fallback: Zeichen mit Standard-Font rendern
        ctx.font = `italic ${fontSize}px serif`;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillText(char, x, y);
        x += fontSize * 0.6 + charSpacing;
      }
    }
    
    y += maxCharHeight * lineHeight;
  }
  
  return canvas.toDataURL('image/png');
}

/**
 * Erstellt eine CharacterMap aus einzelnen Buchstaben-Bildern
 */
export function addToCharacterMap(
  map: CharacterMap,
  samples: CharacterSample[]
): CharacterMap {
  const newMap = { ...map };
  
  for (const sample of samples) {
    const key = sample.char.toLowerCase();
    if (!newMap[key]) {
      newMap[key] = [];
    }
    newMap[key].push(sample);
  }
  
  return newMap;
}

/**
 * Berechnet die "Qualität" einer CharacterMap
 * Gibt an wie vollständig das Alphabet abgedeckt ist
 */
export function getMapQuality(map: CharacterMap): {
  coverage: number;
  totalSamples: number;
  averageSamplesPerChar: number;
  missingChars: string[];
} {
  const requiredChars = 'abcdefghijklmnopqrstuvwxyzäöüß0123456789'.split('');
  let coveredChars = 0;
  let totalSamples = 0;
  const missingChars: string[] = [];
  
  for (const char of requiredChars) {
    if (map[char] && map[char].length > 0) {
      coveredChars++;
      totalSamples += map[char].length;
    } else {
      missingChars.push(char);
    }
  }
  
  return {
    coverage: coveredChars / requiredChars.length,
    totalSamples,
    averageSamplesPerChar: totalSamples / Math.max(coveredChars, 1),
    missingChars,
  };
}
