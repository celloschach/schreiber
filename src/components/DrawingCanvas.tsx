import { useRef, useState, useEffect, useCallback } from 'react';

interface DrawingCanvasProps {
  onSave: (imageData: string, width: number, height: number) => void;
  currentChar: string;
  penColor: string;
  penSize: number;
}

// Ziel-Höhe für alle Buchstaben
const TARGET_HEIGHT = 120;
// Ziel-Linien-Dicke bei TARGET_HEIGHT (in Pixeln)
const TARGET_LINE_THICKNESS = 7;

export default function DrawingCanvas({ onSave, currentChar, penColor, penSize }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const CANVAS_WIDTH = 200;
  const CANVAS_HEIGHT = 240;
  const BG_THRESHOLD = 220;

  const drawGuide = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT / 2);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT * 0.75);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT * 0.75);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    const isUpperCase = currentChar !== currentChar.toLowerCase() && currentChar.toLowerCase() !== currentChar.toUpperCase();
    const displayChar = currentChar === ' ' ? '' : currentChar;
    
    ctx.fillStyle = '#f5f5f5';
    const fontSize = isUpperCase ? CANVAS_HEIGHT * 0.7 : CANVAS_HEIGHT * 0.65;
    ctx.font = `bold ${fontSize}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayChar, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.45);
  }, [currentChar]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    drawGuide(ctx);
    setHasDrawn(false);
    lastPos.current = null;
  }, [currentChar, drawGuide]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    setHasDrawn(true);
    const pos = getPos(e);
    lastPos.current = pos;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !lastPos.current) return;
    
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);
    
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    lastPos.current = pos;
  };

  const stopDraw = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    drawGuide(ctx);
    setHasDrawn(false);
  };

  /**
   * Misst die durchschnittliche Linien-Dicke in einem Binärbild
   * (Array von 0/1 Werten, 1 = dunkel/Linie)
   */
  const measureLineThickness = (binary: Uint8Array, width: number, height: number): number => {
    // Mehrere horizontale Schnitte durch das Bild
    const slices = 10;
    const thicknesses: number[] = [];
    
    for (let s = 0; s < slices; s++) {
      const y = Math.round((s + 0.5) * height / slices);
      if (y >= height) continue;
      
      // Zusammenhängende dunkle Bereiche in dieser Zeile finden
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
          if (lineWidth > 1) { // Nur relevante Linien (keine einzelnen Pixel)
            thicknesses.push(lineWidth);
          }
        }
      }
      if (inLine && lineWidth > 1) {
        thicknesses.push(lineWidth);
      }
    }
    
    if (thicknesses.length === 0) return 1;
    
    // Median berechnen (robuster gegen Ausreißer)
    thicknesses.sort((a, b) => a - b);
    return thicknesses[Math.floor(thicknesses.length / 2)];
  };

  /**
   * Dilate: Vergrößert dunkle Bereiche (macht Linien dicker)
   */
  const dilate = (binary: Uint8Array, width: number, height: number, radius: number): Uint8Array => {
    const result = new Uint8Array(binary);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (binary[y * width + x] === 1) {
          // Alle Pixel im Radius auf 1 setzen
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
  };

  /**
   * Erode: Verkleinert dunkle Bereiche (macht Linien dünner)
   */
  const erode = (binary: Uint8Array, width: number, height: number, radius: number): Uint8Array => {
    const result = new Uint8Array(binary.length);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (binary[y * width + x] === 1) {
          // Prüfe ob alle Pixel im Radius auch 1 sind
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
  };

  /**
   * Normalisiert die Linien-Dicke auf einen festen Wert
   */
  const normalizeLineThickness = (
    binary: Uint8Array, 
    width: number, 
    height: number, 
    targetThickness: number
  ): Uint8Array => {
    const currentThickness = measureLineThickness(binary, width, height);
    
    if (currentThickness <= 0) return binary;
    
    const diff = targetThickness - currentThickness;
    
    // Toleranz: Wenn die Dicke schon nah am Ziel ist, nichts tun
    if (Math.abs(diff) < 1.2) return binary;
    
    if (diff > 0) {
      // Linien zu dünn → dilate (dicker machen)
      const radius = Math.round(Math.abs(diff) / 2);
      return dilate(binary, width, height, Math.max(1, radius));
    } else {
      // Linien zu dick → erode (dünner machen)
      const radius = Math.round(Math.abs(diff) / 2);
      return erode(binary, width, height, Math.max(1, radius));
    }
  };

  const save = useCallback(() => {
    if (!hasDrawn) return;
    
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const data = imgData.data;
    
    // 1. Bounding Box finden
    let minX = CANVAS_WIDTH, minY = CANVAS_HEIGHT, maxX = 0, maxY = 0;
    let found = false;
    
    for (let y = 0; y < CANVAS_HEIGHT; y++) {
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        const idx = (y * CANVAS_WIDTH + x) * 4;
        if (data[idx] < BG_THRESHOLD || data[idx + 1] < BG_THRESHOLD || data[idx + 2] < BG_THRESHOLD) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          found = true;
        }
      }
    }
    
    if (!found) return;
    
    const padding = 3;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(CANVAS_WIDTH - 1, maxX + padding);
    maxY = Math.min(CANVAS_HEIGHT - 1, maxY + padding);
    
    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    
    // 2. Auf Ziel-Höhe skalieren (proportional)
    const scale = TARGET_HEIGHT / cropHeight;
    const scaledWidth = Math.round(cropWidth * scale);
    const scaledHeight = TARGET_HEIGHT;
    
    // Scaled Canvas erstellen
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = scaledWidth;
    scaledCanvas.height = scaledHeight;
    const scaledCtx = scaledCanvas.getContext('2d')!;
    scaledCtx.imageSmoothingEnabled = true;
    scaledCtx.imageSmoothingQuality = 'high';
    scaledCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, scaledWidth, scaledHeight);
    
    // 3. Binärbild extrahieren (dunkle Pixel = 1)
    const scaledData = scaledCtx.getImageData(0, 0, scaledWidth, scaledHeight).data;
    const binary = new Uint8Array(scaledWidth * scaledHeight);
    
    for (let i = 0; i < binary.length; i++) {
      const r = scaledData[i * 4];
      const g = scaledData[i * 4 + 1];
      const b = scaledData[i * 4 + 2];
      binary[i] = (r < BG_THRESHOLD || g < BG_THRESHOLD || b < BG_THRESHOLD) ? 1 : 0;
    }
    
    // 4. Linien-Dicke normalisieren!
    const normalizedBinary = normalizeLineThickness(binary, scaledWidth, scaledHeight, TARGET_LINE_THICKNESS);
    
    // 5. Ergebnis-Canvas mit weißem Hintergrund
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = scaledWidth;
    resultCanvas.height = scaledHeight;
    const resultCtx = resultCanvas.getContext('2d')!;
    
    // Weißer Hintergrund
    resultCtx.fillStyle = '#ffffff';
    resultCtx.fillRect(0, 0, scaledWidth, scaledHeight);
    
    // Normalisierte Linien zeichnen
    const resultImgData = resultCtx.getImageData(0, 0, scaledWidth, scaledHeight);
    const resultData = resultImgData.data;
    
    // Farbe aus penColor extrahieren
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
        resultData[i * 4] = pr;
        resultData[i * 4 + 1] = pg;
        resultData[i * 4 + 2] = pb;
        resultData[i * 4 + 3] = 255;
      }
    }
    
    resultCtx.putImageData(resultImgData, 0, 0);
    
    // 6. Als JPEG speichern
    const imageData = resultCanvas.toDataURL('image/jpeg', 0.85);
    onSave(imageData, scaledWidth, scaledHeight);
  }, [hasDrawn, onSave, penColor]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative rounded-2xl overflow-hidden shadow-lg border-2 border-gray-200 bg-white">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="touch-none cursor-crosshair"
          style={{ width: '200px', height: '240px' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
      
      <div className="flex gap-2 mt-3">
        <button
          onClick={clear}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all"
        >
          <i className="fas fa-eraser mr-1"></i>
          Löschen
        </button>
        <button
          onClick={save}
          disabled={!hasDrawn}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-semibold hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
        >
          <i className="fas fa-check mr-1"></i>
          Speichern
        </button>
      </div>
    </div>
  );
}
