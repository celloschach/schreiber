import { useState, useRef, useCallback, useEffect } from 'react';
import { HandwritingProfile } from '../types';
import { recognizeHandwriting, quickRecognize } from '../utils/ocrEngine';
import { extractCharacters, addToCharacterMap, renderHandwriting, getMapQuality, CharacterSample } from '../utils/handwritingRenderer';

interface ProfileDetailProps {
  profile: HandwritingProfile;
  onBack: () => void;
  onUpdateProfile: (profile: HandwritingProfile) => void;
  onConvertText: (text: string, renderedImage: string, profile: HandwritingProfile) => void;
}

type Tab = 'learn' | 'convert';

export default function ProfileDetail({ profile, onBack, onUpdateProfile, onConvertText }: ProfileDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('learn');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [convertText, setConvertText] = useState('');
  const [renderedImage, setRenderedImage] = useState<string | null>(null);
  const [learningMode, setLearningMode] = useState<'auto' | 'manual'>('auto');
  const [manualChars, setManualChars] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const quality = getMapQuality(profile.characterMap);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch {
      setError('Kamera-Zugriff verweigert. Bitte erlaube den Zugriff.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  const captureAndProcess = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/png');
    
    stopCamera();
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setSuccess(null);

    try {
      if (activeTab === 'learn') {
        // Lern-Modus: Buchstaben extrahieren
        setProgressText('Buchstaben werden extrahiert...');
        setProgress(30);
        
        let charsToLearn = '';
        if (learningMode === 'manual' && manualChars.trim()) {
          charsToLearn = manualChars.trim();
        } else {
          // Auto-Modus: OCR verwenden um zu erkennen was geschrieben wurde
          setProgressText('Text wird erkannt...');
          const ocrResult = await recognizeHandwriting(imageData);
          setProgress(60);
          
          if (!ocrResult.text.trim()) {
            setError('Kein Text erkannt. Bitte schreibe deutlicher oder verwende den manuellen Modus.');
            setIsProcessing(false);
            return;
          }
          charsToLearn = ocrResult.text.replace(/\s/g, '');
          setProgressText(`Erkannt: "${charsToLearn}" — Buchstaben werden extrahiert...`);
        }
        
        if (charsToLearn.length === 0) {
          setError('Keine Buchstaben zum Lernen gefunden.');
          setIsProcessing(false);
          return;
        }
        
        setProgress(70);
        const samples = await extractCharacters(imageData, charsToLearn);
        setProgress(90);
        
        if (samples.length === 0) {
          setError('Keine Buchstaben konnten extrahiert werden. Versuche es mit klarerer Schrift.');
          setIsProcessing(false);
          return;
        }
        
        // CharacterMap aktualisieren
        const newMap = addToCharacterMap(profile.characterMap, samples);
        const updatedProfile: HandwritingProfile = {
          ...profile,
          characterMap: newMap,
          totalSamples: profile.totalSamples + samples.length,
        };
        onUpdateProfile(updatedProfile);
        
        setProgress(100);
        setSuccess(`${samples.length} Buchstaben gelernt! (${charsToLearn})`);
      } else {
        // Konvertier-Modus: OCR auf gedrucktem Text
        setProgressText('Text wird erkannt...');
        const ocrResult = await recognizeHandwriting(imageData);
        setProgress(80);
        
        if (!ocrResult.text.trim()) {
          setError('Kein Text erkannt.');
          setIsProcessing(false);
          return;
        }
        
        setProgressText('Text wird in Handschrift gerendert...');
        setConvertText(ocrResult.text);
        
        if (profile.totalSamples > 0) {
          const rendered = renderHandwriting(ocrResult.text, profile.characterMap, {
            fontSize: 36,
            lineHeight: 1.6,
            wordSpacing: 12,
            charSpacing: 1,
            backgroundColor: '#fffef5',
          });
          setRenderedImage(rendered);
        }
        
        setProgress(100);
        setSuccess(`Text erkannt: "${ocrResult.text.slice(0, 50)}${ocrResult.text.length > 50 ? '...' : ''}"`);
      }
    } catch (err) {
      setError('Fehler bei der Verarbeitung. Bitte versuche es erneut.');
      console.error(err);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProgressText('');
    }
  }, [activeTab, learningMode, manualChars, profile, onUpdateProfile, stopCamera]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      setSuccess(null);

      try {
        if (activeTab === 'learn') {
          setProgressText('Buchstaben werden extrahiert...');
          setProgress(30);
          
          let charsToLearn = '';
          if (learningMode === 'manual' && manualChars.trim()) {
            charsToLearn = manualChars.trim();
          } else {
            setProgressText('Text wird erkannt...');
            const ocrResult = await recognizeHandwriting(imageData);
            setProgress(60);
            
            if (!ocrResult.text.trim()) {
              setError('Kein Text erkannt.');
              setIsProcessing(false);
              return;
            }
            charsToLearn = ocrResult.text.replace(/\s/g, '');
          }
          
          if (charsToLearn.length === 0) {
            setError('Keine Buchstaben gefunden.');
            setIsProcessing(false);
            return;
          }
          
          setProgress(70);
          const samples = await extractCharacters(imageData, charsToLearn);
          setProgress(90);
          
          if (samples.length > 0) {
            const newMap = addToCharacterMap(profile.characterMap, samples);
            const updatedProfile: HandwritingProfile = {
              ...profile,
              characterMap: newMap,
              totalSamples: profile.totalSamples + samples.length,
            };
            onUpdateProfile(updatedProfile);
            setSuccess(`${samples.length} Buchstaben gelernt! (${charsToLearn})`);
          } else {
            setError('Keine Buchstaben konnten extrahiert werden.');
          }
        } else {
          setProgressText('Text wird erkannt...');
          const ocrResult = await recognizeHandwriting(imageData);
          setProgress(80);
          
          if (ocrResult.text.trim()) {
            setConvertText(ocrResult.text);
            if (profile.totalSamples > 0) {
              const rendered = renderHandwriting(ocrResult.text, profile.characterMap, {
                fontSize: 36, lineHeight: 1.6, wordSpacing: 12, charSpacing: 1,
                backgroundColor: '#fffef5',
              });
              setRenderedImage(rendered);
            }
            setSuccess(`Text erkannt!`);
          } else {
            setError('Kein Text erkannt.');
          }
        }
      } catch {
        setError('Fehler bei der Verarbeitung.');
      } finally {
        setIsProcessing(false);
        setProgress(0);
        setProgressText('');
      }
    };
    reader.readAsDataURL(file);
  }, [activeTab, learningMode, manualChars, profile, onUpdateProfile]);

  const handleRenderText = () => {
    if (!convertText.trim() || profile.totalSamples === 0) return;
    
    const rendered = renderHandwriting(convertText, profile.characterMap, {
      fontSize: 36,
      lineHeight: 1.6,
      wordSpacing: 12,
      charSpacing: 1,
      backgroundColor: '#fffef5',
    });
    setRenderedImage(rendered);
  };

  const handleSaveConverted = () => {
    if (convertText.trim() && renderedImage) {
      onConvertText(convertText, renderedImage, profile);
      setSuccess('Text gespeichert!');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <i className="fas fa-arrow-left text-gray-600"></i>
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800">{profile.name}</h2>
            <p className="text-sm text-gray-500">
              {profile.totalSamples} Buchstaben-Samples • {Math.round(quality.coverage * 100)}% Alphabet-Abdeckung
            </p>
          </div>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: profile.color + '20' }}
          >
            <i className="fas fa-pen-fancy text-lg" style={{ color: profile.color }}></i>
          </div>
        </div>

        {/* Fortschritt */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Lernfortschritt</span>
            <span className="font-bold">{Math.round(quality.coverage * 100)}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${quality.coverage * 100}%`,
                background: quality.coverage > 0.7
                  ? 'linear-gradient(to right, #10b981, #059669)'
                  : quality.coverage > 0.3
                  ? 'linear-gradient(to right, #f59e0b, #d97706)'
                  : 'linear-gradient(to right, #ef4444, #dc2626)',
              }}
            />
          </div>
          {quality.missingChars.length > 0 && quality.missingChars.length <= 20 && (
            <p className="text-xs text-gray-400 mt-1">
              Noch lernen: <span className="font-mono">{quality.missingChars.join(' ')}</span>
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab('learn'); setError(null); setSuccess(null); }}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'learn'
                ? 'bg-purple-100 text-purple-700 shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="fas fa-graduation-cap mr-2"></i>
            Buchstaben lernen
          </button>
          <button
            onClick={() => { setActiveTab('convert'); setError(null); setSuccess(null); setRenderedImage(null); }}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'convert'
                ? 'bg-green-100 text-green-700 shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="fas fa-magic mr-2"></i>
            Text konvertieren
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
          <i className="fas fa-exclamation-triangle text-red-500"></i>
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-3">
          <i className="fas fa-check-circle text-green-500"></i>
          <span className="text-sm">{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="mb-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-200" />
              <circle cx="40" cy="40" r="32" stroke="url(#grad)" strokeWidth="6" fill="none"
                strokeDasharray={`${progress * 2.01} 201`} strokeLinecap="round"
                className="transition-all duration-300" />
              <defs>
                <linearGradient id="grad">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700">
              {progress}%
            </span>
          </div>
          <p className="text-gray-600 font-medium">{progressText}</p>
        </div>
      )}

      {/* Content */}
      {!isProcessing && (
        <div className="space-y-4">
          {activeTab === 'learn' ? (
            <>
              {/* Lern-Anleitung */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                  <i className="fas fa-info-circle"></i>
                  So lernst du Buchstaben
                </h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>• Schreibe Buchstaben auf ein weißes Blatt Papier (z.B. <code className="bg-blue-100 px-1 rounded">abcde</code>)</p>
                  <p>• Lasse etwas Abstand zwischen den Buchstaben</p>
                  <p>• Schreibe deutlich und nicht zu klein</p>
                  <p>• Je mehr Samples pro Buchstabe, desto besser!</p>
                  <p>• Tipp: Schreibe jeden Buchstaben 3-5 Mal für beste Ergebnisse</p>
                </div>
              </div>

              {/* Lern-Modus Auswahl */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setLearningMode('auto')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      learningMode === 'auto' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <i className="fas fa-robot mr-1"></i> Auto-Erkennung
                  </button>
                  <button
                    onClick={() => setLearningMode('manual')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      learningMode === 'manual' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <i className="fas fa-keyboard mr-1"></i> Manuell
                  </button>
                </div>

                {learningMode === 'manual' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Welche Buchstaben hast du geschrieben?
                    </label>
                    <input
                      type="text"
                      value={manualChars}
                      onChange={(e) => setManualChars(e.target.value)}
                      placeholder="z.B. abcdef"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none font-mono text-lg"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Gib die Buchstaben in der Reihenfolge ein, wie du sie geschrieben hast (ohne Leerzeichen).
                    </p>
                  </div>
                )}

                {/* Kamera / Upload */}
                {!isCameraActive ? (
                  <div className="space-y-4">
                    <div className="w-full h-48 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                      <div className="text-center">
                        <i className="fas fa-pen text-3xl text-gray-400 mb-2"></i>
                        <p className="text-gray-500 text-sm">Kamera starten oder Bild hochladen</p>
                      </div>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={startCamera}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
                      >
                        <i className="fas fa-camera mr-2"></i>
                        Kamera starten
                      </button>
                      <label className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg cursor-pointer">
                        <i className="fas fa-upload mr-2"></i>
                        Bild hochladen
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative rounded-xl overflow-hidden shadow-lg">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-56 object-cover" />
                      <div className="absolute inset-0 border-4 border-white/30 rounded-xl pointer-events-none">
                        <div className="absolute top-3 left-3 w-6 h-6 border-t-3 border-l-3 border-white rounded-tl-lg"></div>
                        <div className="absolute top-3 right-3 w-6 h-6 border-t-3 border-r-3 border-white rounded-tr-lg"></div>
                        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-3 border-l-3 border-white rounded-bl-lg"></div>
                        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-3 border-r-3 border-white rounded-br-lg"></div>
                      </div>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={captureAndProcess}
                        className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg"
                      >
                        <i className="fas fa-circle mr-2"></i>
                        Aufnehmen & Lernen
                      </button>
                      <button onClick={stopCamera} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all">
                        <i className="fas fa-times mr-2"></i>
                        Abbrechen
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Gelernte Buchstaben Übersicht */}
              {profile.totalSamples > 0 && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <i className="fas fa-spell-check text-purple-500"></i>
                    Gelernte Buchstaben
                  </h3>
                  <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-13 gap-2">
                    {'abcdefghijklmnopqrstuvwxyzäöüß0123456789'.split('').map(char => {
                      const samples = profile.characterMap[char];
                      const count = samples ? samples.length : 0;
                      return (
                        <div
                          key={char}
                          className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                            count > 0
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-gray-50 text-gray-300 border border-gray-100'
                          }`}
                          title={count > 0 ? `${count} Sample(s)` : 'Noch nicht gelernt'}
                        >
                          {char}
                          {count > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[8px] rounded-full flex items-center justify-center">
                              {count}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Konvertier-Bereich */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <i className="fas fa-keyboard text-green-500"></i>
                  Text eingeben
                </h3>
                <textarea
                  value={convertText}
                  onChange={(e) => { setConvertText(e.target.value); setRenderedImage(null); }}
                  placeholder="Gib hier deinen Text ein, der in Handschrift umgewandelt werden soll..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none h-32"
                />
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={handleRenderText}
                    disabled={!convertText.trim() || profile.totalSamples === 0}
                    className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-magic mr-2"></i>
                    In Handschrift umwandeln
                  </button>
                  {renderedImage && (
                    <button
                      onClick={handleSaveConverted}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg"
                    >
                      <i className="fas fa-save mr-2"></i>
                      Speichern
                    </button>
                  )}
                </div>
                {profile.totalSamples === 0 && (
                  <p className="text-sm text-amber-600 mt-2 flex items-center gap-2">
                    <i className="fas fa-exclamation-triangle"></i>
                    Du musst erst Buchstaben lernen, bevor Texte konvertiert werden können.
                  </p>
                )}
              </div>

              {/* Scan-Bereich für gedruckten Text */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <i className="fas fa-camera text-blue-500"></i>
                  Gedruckten Text scannen
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  Scanne einen gedruckten Text (Buch, Bildschirm, etc.) und er wird automatisch erkannt.
                </p>
                {!isCameraActive ? (
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={startCamera}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
                    >
                      <i className="fas fa-camera mr-2"></i>
                      Kamera starten
                    </button>
                    <label className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg cursor-pointer">
                      <i className="fas fa-upload mr-2"></i>
                      Bild hochladen
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative rounded-xl overflow-hidden shadow-lg">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-56 object-cover" />
                    </div>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={captureAndProcess}
                        className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg"
                      >
                        <i className="fas fa-circle mr-2"></i>
                        Aufnehmen & Erkennen
                      </button>
                      <button onClick={stopCamera} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all">
                        Abbrechen
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Gerenderter Text */}
              {renderedImage && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <i className="fas fa-eye text-amber-500"></i>
                    Deine Handschrift
                  </h3>
                  <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100">
                    <img src={renderedImage} alt="Handschrift" className="w-full rounded-lg" />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    <i className="fas fa-info-circle mr-1"></i>
                    Das Bild wurde mit deinen gelernten Buchstaben gerendert. Je mehr Samples, desto natürlicher!
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
