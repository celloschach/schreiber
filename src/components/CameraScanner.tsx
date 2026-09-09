import { useState, useRef, useCallback, useEffect } from 'react';
import Tesseract from 'tesseract.js';

interface CameraScannerProps {
  onTextRecognized: (text: string, imageData: string) => void;
  mode: 'handwriting' | 'print';
  profileName?: string;
}

export default function CameraScanner({ onTextRecognized, mode, profileName }: CameraScannerProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      setError('Kamera-Zugriff verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.');
      console.error(err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/png');
        setCapturedImage(imageData);
        stopCamera();
        processImage(imageData);
      }
    }
  }, [stopCamera]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setCapturedImage(imageData);
        processImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    setProgress(0);
    try {
      const result = await Tesseract.recognize(imageData, 'deu+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        }
      });
      const text = result.data.text.trim();
      if (text) {
        onTextRecognized(text, imageData);
      } else {
        setError('Kein Text erkannt. Bitte versuche es mit einem klareren Bild.');
      }
    } catch (err) {
      setError('Fehler bei der Texterkennung. Bitte versuche es erneut.');
      console.error(err);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <i className="fas fa-camera text-white text-sm"></i>
          </span>
          {mode === 'handwriting' ? 'Handschrift scannen' : 'Text scannen'}
        </h2>

        {mode === 'handwriting' && profileName && (
          <p className="text-sm text-gray-500 mb-4 ml-13">
            Profil: <span className="font-semibold text-purple-600">{profileName}</span>
          </p>
        )}

        {/* Camera View */}
        {!capturedImage && !isProcessing && (
          <div className="space-y-4">
            {!isCameraActive ? (
              <div className="text-center space-y-4">
                <div className="w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <i className="fas fa-camera text-4xl text-gray-400 mb-3"></i>
                    <p className="text-gray-500">Kamera aktivieren oder Bild hochladen</p>
                  </div>
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={startCamera}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <i className="fas fa-video mr-2"></i>
                    Kamera starten
                  </button>
                  <label className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 cursor-pointer">
                    <i className="fas fa-upload mr-2"></i>
                    Bild hochladen
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden shadow-lg">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute inset-0 border-4 border-white/30 rounded-xl pointer-events-none">
                    <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                    <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                  </div>
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={captureImage}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <i className="fas fa-circle mr-2"></i>
                    Foto aufnehmen
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                  >
                    <i className="fas fa-times mr-2"></i>
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Processing */}
        {isProcessing && (
          <div className="text-center space-y-4 py-8">
            <div className="relative w-24 h-24 mx-auto">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${progress * 2.51} 251`}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
                <defs>
                  <linearGradient id="gradient">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-700">
                {progress}%
              </span>
            </div>
            <p className="text-gray-600 font-medium">Text wird erkannt...</p>
            {capturedImage && (
              <img src={capturedImage} alt="Erkanntes Bild" className="max-h-32 mx-auto rounded-lg opacity-50" />
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
            <i className="fas fa-exclamation-triangle text-red-500"></i>
            <span>{error}</span>
            <button onClick={reset} className="ml-auto text-red-500 hover:text-red-700">
              <i className="fas fa-redo"></i>
            </button>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
