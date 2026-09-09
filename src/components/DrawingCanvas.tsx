import { useRef, useState, useEffect, useCallback } from 'react';

interface DrawingCanvasProps {
  onSave: (imageData: string, width: number, height: number) => void;
  currentChar: string;
  penColor: string;
  penSize: number;
  guideText?: string; // Für Batch-Modus: ganzes Wort als Guide
}

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  size: number;
}

const NORMALIZED_HEIGHT = 120;
const TARGET_LINE_THICKNESS = 5; // Ziel-Linien-Dicke in Pixeln bei NORMALIZED_HEIGHT

export default function DrawingCanvas({ onSave, currentChar, penColor, penSize, guideText }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentStroke = useRef<{ x: number; y: number }[]>([]);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const CANVAS_WIDTH = 200;
  const CANVAS_HEIGHT = 240;

  const drawGuide = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Hilfslinien
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
    
    // Guide-Zeichen oder Wort
    const displayText = guideText || (currentChar === ' ' ? '' : currentChar);
    const isUpperCase = currentChar !== currentChar.toLowerCase() && currentChar.toLowerCase() !== currentChar.toUpperCase();
    
    ctx.fillStyle = '#f5f5f5';
    let fontSize;
    if (guideText) {
      fontSize = CANVAS_HEIGHT * 0.5; // Kleiner für ganzes Wort
    } else {
      fontSize = isUpperCase ? CANVAS_HEIGHT * 0.7 : CANVAS_HEIGHT * 0.65;
    }
    ctx.font = `bold ${fontSize}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.45);
  }, [currentChar, guideText]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    
    drawGuide(ctx);
    
    // Alle Striche neu zeichnen
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [strokes, drawGuide]);

  useEffect(() => {
    drawGuide(canvasRef.current?.getContext('2d')!);
    setStrokes([]);
    setHasDrawn(false);
    lastPos.current = null;
  }, [currentChar, guideText, drawGuide]);

  useEffect(() => {
    redrawCanvas();
  }, [strokes, redrawCanvas]);

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
    currentStroke.current = [pos];
    lastPos.current = pos;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !lastPos.current) return;
    
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);
    
    currentStroke.current.push(pos);
    
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
    if (currentStroke.current.length > 0) {
      setStrokes(prev => [...prev, {
        points: [...currentStroke.current],
        color: penColor,
        size: penSize
      }]);
    }
    setIsDrawing(false);
    currentStroke.current = [];
    lastPos.current = null;
  };

  const undo = () => {
    if (strokes.length === 0) return;
    setStrokes(prev => prev.slice(0, -1));
    if (strokes.length === 1) {
      setHasDrawn(false);
      drawGuide(canvasRef.current?.getContext('2d')!);
    }
  };

  // Keyboard-Shortcut: Ctrl+Z für Undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [strokes]);

  const clear = () => {
    setStrokes([]);
    setHasDrawn(false);
    drawGuide(canvasRef.current?.getContext('2d')!);
  };

  /**
   * Misst die durchschnittliche Linien-Dicke
   */
  const measureLineThickness = (binary: Uint8Array, width: number, height: number): number => {
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
          if (lineWidth > 2) {
            thicknesses.push(lineWidth);
          }
        }
      }
      if (inLine && lineWidth > 2) {
        thicknesses.push(lineWidth);
      }
    }
    
    if (thicknesses.length === 0) return TARGET_LINE_THICKNESS;
    
    thicknesses.sort((a, b) => a - b);
    return thicknesses[Math.floor(thicknesses.length / 2)];
  };

  /**
   * Sanfte Linien-Dicke-Normalisierung
   */
  const normalizeLineThickness = (
    imageData: ImageData,
    width: number,
    height: number,
    targetThickness: number
  ): ImageData => {
    const binary = new Uint8Array(width * height);
    const data = imageData.data;
    
    // Binärbild erstellen
    for (let i = 0; i < binary.length; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      binary[i] = (r < 200 || g < 200 || b < 200) ? 1 : 0;
    }
    
    const currentThickness = measureLineThickness(binary, width, height);
    const diff = targetThickness - currentThickness;
    
    // Nur anpassen wenn Unterschied > 2px
    if (Math.abs(diff) <= 2) return imageData;
    
    // Sanfte Anpassung: nur 1 Pixel
    const adjustment = diff > 0 ? 1 : -1;
    
    const result = new ImageData(width, height);
    const resultData = result.data;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const pixelIdx = idx * 4;
        
        if (binary[idx] === 1) {
          // Dunkles Pixel
          if (adjustment > 0) {
            // Dilate: auch Nachbarn dunkel machen
            resultData[pixelIdx] = data[pixelIdx];
            resultData[pixelIdx + 1] = data[pixelIdx + 1];
            resultData[pixelIdx + 2] = data[pixelIdx + 2];
            resultData[pixelIdx + 3] = 255;
            
            // Nachbarn prüfen
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const nIdx = (ny * width + nx) * 4;
                  if (binary[ny * width + nx] === 0) {
                    // Heller Nachbar → leicht dunkler machen
                    resultData[nIdx] = Math.max(0, data[nIdx] - 30);
                    resultData[nIdx + 1] = Math.max(0, data[nIdx + 1] - 30);
                    resultData[nIdx + 2] = Math.max(0, data[nIdx + 2] - 30);
                    resultData[nIdx + 3] = 255;
                  }
                }
              }
            }
          } else {
            // Erode: nur setzen wenn alle Nachbarn auch dunkel sind
            let allDark = true;
            for (let dy = -1; dy <= 1 && allDark; dy++) {
              for (let dx = -1; dx <= 1 && allDark; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  if (binary[ny * width + nx] === 0) {
                    allDark = false;
                  }
                } else {
                  allDark = false;
                }
              }
            }
            
            if (allDark) {
              resultData[pixelIdx] = data[pixelIdx];
              resultData[pixelIdx + 1] = data[pixelIdx + 1];
              resultData[pixelIdx + 2] = data[pixelIdx + 2];
              resultData[pixelIdx + 3] = 255;
            } else {
              // Rand-Pixel → heller machen
              resultData[pixelIdx] = Math.min(255, data[pixelIdx] + 50);
              resultData[pixelIdx + 1] = Math.min(255, data[pixelIdx + 1] + 50);
              resultData[pixelIdx + 2] = Math.min(255, data[pixelIdx + 2] + 50);
              resultData[pixelIdx + 3] = 255;
            }
          }
        } else {
          // Helles Pixel
          resultData[pixelIdx] = data[pixelIdx];
          resultData[pixelIdx + 1] = data[pixelIdx + 1];
          resultData[pixelIdx + 2] = data[pixelIdx + 2];
          resultData[pixelIdx + 3] = data[pixelIdx + 3];
        }
      }
    }
    
    return result;
  };

  const save = useCallback(() => {
    if (!hasDrawn) return;
    
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const data = imgData.data;
    
    const BG_THRESHOLD = 220;
    
    // Bounding Box finden
    let minX = CANVAS_WIDTH, minY = CANVAS_HEIGHT, maxX = 0, maxY = 0;
    let found = false;
    
    for (let y = 0; y < CANVAS_HEIGHT; y++) {
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        const idx = (y * CANVAS_WIDTH + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        if (r < BG_THRESHOLD || g < BG_THRESHOLD || b < BG_THRESHOLD) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          found = true;
        }
      }
    }
    
    if (!found) return;
    
    const padding = 4;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(CANVAS_WIDTH - 1, maxX + padding);
    maxY = Math.min(CANVAS_HEIGHT - 1, maxY + padding);
    
    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    
    // Auf normalisierte Höhe skalieren
    const scale = NORMALIZED_HEIGHT / cropHeight;
    const normalizedWidth = Math.round(cropWidth * scale);
    const normalizedHeight = NORMALIZED_HEIGHT;
    
    // Ausschneiden
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;
    const tempCtx = tempCanvas.getContext('2d')!;
    
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, cropWidth, cropHeight);
    
    const tempImgData = tempCtx.getImageData(0, 0, cropWidth, cropHeight);
    const tempData = tempImgData.data;
    
    for (let y = 0; y < cropHeight; y++) {
      for (let x = 0; x < cropWidth; x++) {
        const srcIdx = ((y + minY) * CANVAS_WIDTH + (x + minX)) * 4;
        const dstIdx = (y * cropWidth + x) * 4;
        
        const r = data[srcIdx];
        const g = data[srcIdx + 1];
        const b = data[srcIdx + 2];
        
        if (r < BG_THRESHOLD || g < BG_THRESHOLD || b < BG_THRESHOLD) {
          tempData[dstIdx] = r;
          tempData[dstIdx + 1] = g;
          tempData[dstIdx + 2] = b;
          tempData[dstIdx + 3] = 255;
        }
      }
    }
    
    tempCtx.putImageData(tempImgData, 0, 0);
    
    // Skalieren
    const normCanvas = document.createElement('canvas');
    normCanvas.width = normalizedWidth;
    normCanvas.height = normalizedHeight;
    const normCtx = normCanvas.getContext('2d')!;
    
    normCtx.fillStyle = '#ffffff';
    normCtx.fillRect(0, 0, normalizedWidth, normalizedHeight);
    
    normCtx.imageSmoothingEnabled = true;
    normCtx.imageSmoothingQuality = 'high';
    normCtx.drawImage(tempCanvas, 0, 0, normalizedWidth, normalizedHeight);
    
    // === SANFTE LINIEN-DICKE-NORMALISIERUNG ===
    const normImgData = normCtx.getImageData(0, 0, normalizedWidth, normalizedHeight);
    const normalizedImgData = normalizeLineThickness(normImgData, normalizedWidth, normalizedHeight, TARGET_LINE_THICKNESS);
    normCtx.putImageData(normalizedImgData, 0, 0);
    
    const imageData = normCanvas.toDataURL('image/jpeg', 0.85);
    onSave(imageData, normalizedWidth, normalizedHeight);
  }, [hasDrawn, onSave]);

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
          onClick={undo}
          disabled={strokes.length === 0}
          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="Letzten Strich rückgängig (Ctrl+Z)"
        >
          <i className="fas fa-undo mr-1"></i>
          Undo
        </button>
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
