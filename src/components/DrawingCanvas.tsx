import { useRef, useState, useEffect, useCallback } from 'react';

interface DrawingCanvasProps {
  onSave: (imageData: string, width: number, height: number) => void;
  currentChar: string;
  penColor: string;
  penSize: number;
}

// Intelligente Buchstaben-Höhen für natürliches Aussehen
// Alle Kleinbuchstaben haben die gleiche x-height (60px)
// Buchstaben mit Oberlänge ragen nach oben
// Buchstaben mit Unterlänge ragen nach unten (Keller)
const getNormalizedHeight = (char: string): number => {
  const lower = char.toLowerCase();
  
  // Großbuchstaben: volle Höhe (120px)
  if (char !== lower) return 120;
  
  // Kleinbuchstaben mit Oberlänge (ragen nach oben)
  // b, d, f, h, k, l, t → x-height + Oberlänge
  if ('bdfhklt'.includes(lower)) return 110;
  
  // Kleinbuchstaben mit Unterlänge (ragen nach unten in den Keller)
  // g, j, p, q, y → x-height + Keller
  // x-height = 60px, Keller = 35px → gesamt 95px
  if ('gjpqy'.includes(lower)) return 95;
  
  // Kleinbuchstaben ohne Ober-/Unterlänge (reine x-height)
  // a, c, e, m, n, o, r, s, u, v, w, x, z
  if ('acemnorsuvwxz'.includes(lower)) return 60;
  
  // 'i' mit Punkt (x-height + Punkt)
  if (lower === 'i') return 75;
  
  // 'ß' (x-height)
  if (lower === 'ß') return 60;
  
  // Zahlen (x-height + klein wenig)
  if (/[0-9]/.test(char)) return 80;
  
  // Satzzeichen
  if ('.,!?-'.includes(char)) return 30;
  
  // Default
  return 60;
};

export default function DrawingCanvas({ onSave, currentChar, penColor, penSize }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const CANVAS_WIDTH = 200;
  const CANVAS_HEIGHT = 240;

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

  const save = useCallback(() => {
    if (!hasDrawn) return;
    
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const data = imgData.data;
    
    const BG_THRESHOLD = 220;
    
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
    
    const targetHeight = getNormalizedHeight(currentChar);
    const scale = targetHeight / cropHeight;
    const normalizedWidth = Math.round(cropWidth * scale);
    const normalizedHeight = targetHeight;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;
    const tempCtx = tempCanvas.getContext('2d')!;
    
    // Transparenter Hintergrund - nur Striche werden gespeichert
    tempCtx.clearRect(0, 0, cropWidth, cropHeight);
    
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
    
    const normCanvas = document.createElement('canvas');
    normCanvas.width = normalizedWidth;
    normCanvas.height = normalizedHeight;
    const normCtx = normCanvas.getContext('2d')!;
    
    // TRANSPARENTER Hintergrund statt weiß!
    // So können sich Buchstaben überlappen ohne sich zu verdecken
    normCtx.clearRect(0, 0, normalizedWidth, normalizedHeight);
    
    normCtx.imageSmoothingEnabled = true;
    normCtx.imageSmoothingQuality = 'high';
    normCtx.drawImage(tempCanvas, 0, 0, normalizedWidth, normalizedHeight);
    
    // PNG statt JPEG (PNG unterstützt Transparenz)
    const imageData = normCanvas.toDataURL('image/png');
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
