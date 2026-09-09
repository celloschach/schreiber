import { useRef, useState, useEffect, useCallback } from 'react';

interface DrawingCanvasProps {
  onSave: (imageData: string, width: number, height: number) => void;
  currentChar: string;
  penColor: string;
  penSize: number;
}

export default function DrawingCanvas({ onSave, currentChar, penColor, penSize }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const CANVAS_WIDTH = 200;
  const CANVAS_HEIGHT = 240;

  // Canvas initialisieren
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    
    // Weißen Hintergrund
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Hilfslinien
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    
    // Mittellinie
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT / 2);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
    ctx.stroke();
    
    // Grundlinie
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT * 0.75);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT * 0.75);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Zeichen im Hintergrund (blass)
    ctx.fillStyle = '#f3f4f6';
    ctx.font = `bold ${CANVAS_HEIGHT * 0.65}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentChar, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.45);
    
    setHasDrawn(false);
    lastPos.current = null;
  }, [currentChar]);

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
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Hilfslinien
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT / 2);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT * 0.75);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT * 0.75);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Zeichen
    ctx.fillStyle = '#f3f4f6';
    ctx.font = `bold ${CANVAS_HEIGHT * 0.65}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentChar, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.45);
    
    setHasDrawn(false);
  };

  const save = useCallback(() => {
    if (!hasDrawn) return;
    
    const canvas = canvasRef.current!;
    
    // Bounding Box finden (nur den gezeichneten Bereich ausschneiden)
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    let minX = CANVAS_WIDTH, minY = CANVAS_HEIGHT, maxX = 0, maxY = 0;
    let found = false;
    
    for (let y = 0; y < CANVAS_HEIGHT; y++) {
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        const idx = (y * CANVAS_WIDTH + x) * 4;
        const r = imgData.data[idx];
        const g = imgData.data[idx + 1];
        const b = imgData.data[idx + 2];
        // Prüfe ob Pixel dunkler als Hintergrund (nicht weiß/grau)
        if (r < 200 || g < 200 || b < 200) {
          // Prüfe ob es die gezeichnete Farbe ist (nicht die Hilfslinien/Hintergrund-Zeichen)
          const brightness = (r + g + b) / 3;
          if (brightness < 180) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            found = true;
          }
        }
      }
    }
    
    if (!found) return;
    
    // Padding hinzufügen
    const padding = 8;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(CANVAS_WIDTH - 1, maxX + padding);
    maxY = Math.min(CANVAS_HEIGHT - 1, maxY + padding);
    
    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    
    // Neues Canvas mit dem ausgeschnittenen Bereich
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropWidth;
    cropCanvas.height = cropHeight;
    const cropCtx = cropCanvas.getContext('2d')!;
    
    cropCtx.fillStyle = '#ffffff';
    cropCtx.fillRect(0, 0, cropWidth, cropHeight);
    cropCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    
    // Als kleines JPEG speichern
    const imageData = cropCanvas.toDataURL('image/jpeg', 0.75);
    onSave(imageData, cropWidth, cropHeight);
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
