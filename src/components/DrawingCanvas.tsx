import { useRef, useState, useEffect, useCallback } from 'react';

interface DrawingCanvasProps {
  onSave: (imageData: string, width: number, height: number) => void;
  currentChar: string;
  penColor: string;
  penSize: number;
}

// Einfache Buchstaben-Höhen
const getNormalizedHeight = (char: string): number => {
  const lower = char.toLowerCase();
  
  // Großbuchstaben: 120px
  if (char !== lower) return 120;
  
  // Klein mit Oberlänge (b, d, f, h, k, l, t): 110px
  if ('bdfhklt'.includes(lower)) return 110;
  
  // Klein mit Keller (g, j, p, q, y): 80px
  if ('gjpqy'.includes(lower)) return 80;
  
  // Klein normal (a, c, e, m, n, o, r, s, u, v, w, x, z): 60px
  if ('acemnorsuvwxz'.includes(lower)) return 60;
  
  // i: 75px
  if (lower === 'i') return 75;
  
  // ß: 60px
  if (lower === 'ß') return 60;
  
  // Zahlen: 100px
  if (/[0-9]/.test(char)) return 100;
  
  // ? !: 120px
  if ('?!'.includes(char)) return 120;
  
  // . ,: 40px
  if ('.,'.includes(char)) return 40;
  
  // -: 20px
  if (char === '-') return 20;
  
  // Default: 60px
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
    // Weißer Hintergrund
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Hilfslinien (sehr hell)
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
    
    // Guide-Zeichen (sehr blass)
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
    
    // Bounding Box finden - nur sehr dunkle Pixel (die gezeichneten Striche)
    let minX = CANVAS_WIDTH, minY = CANVAS_HEIGHT, maxX = 0, maxY = 0;
    let found = false;
    
    for (let y = 0; y < CANVAS_HEIGHT; y++) {
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        const idx = (y * CANVAS_WIDTH + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // Nur sehr dunkle Pixel (die gezeichneten Striche)
        if (r < 100 && g < 100 && b < 100) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          found = true;
        }
      }
    }
    
    if (!found) return;
    
    // Padding
    const padding = 4;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(CANVAS_WIDTH - 1, maxX + padding);
    maxY = Math.min(CANVAS_HEIGHT - 1, maxY + padding);
    
    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    
    // Auf Ziel-Höhe skalieren
    const targetHeight = getNormalizedHeight(currentChar);
    const scale = targetHeight / cropHeight;
    const normalizedWidth = Math.round(cropWidth * scale);
    const normalizedHeight = targetHeight;
    
    // Neues Canvas mit transparentem Hintergrund
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = normalizedWidth;
    resultCanvas.height = normalizedHeight;
    const resultCtx = resultCanvas.getContext('2d')!;
    
    // Transparenter Hintergrund
    resultCtx.clearRect(0, 0, normalizedWidth, normalizedHeight);
    
    // Gezeichneten Bereich ausschneiden und skalieren
    resultCtx.imageSmoothingEnabled = true;
    resultCtx.imageSmoothingQuality = 'high';
    resultCtx.drawImage(
      canvas,
      minX, minY, cropWidth, cropHeight,
      0, 0, normalizedWidth, normalizedHeight
    );
    
    // Als PNG speichern (unterstützt Transparenz)
    const imageData = resultCanvas.toDataURL('image/png');
    onSave(imageData, normalizedWidth, normalizedHeight);
  }, [hasDrawn, onSave, currentChar]);

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
