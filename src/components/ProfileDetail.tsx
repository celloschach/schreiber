import { useState, useEffect } from 'react';
import { HandwritingProfile, DrawnChar } from '../types';
import DrawingCanvas from './DrawingCanvas';
import { renderText, getAlphabetCoverage } from '../utils/textRenderer';

interface Props {
  profile: HandwritingProfile;
  onBack: () => void;
  onUpdate: (p: HandwritingProfile) => void;
  onConvert: (text: string, image: string, profile: HandwritingProfile) => void;
}

type CharGroup = 'lower' | 'upper' | 'numbers' | 'punctuation';
type DrawMode = 'single' | 'batch';

export default function ProfileDetail({ profile, onBack, onUpdate, onConvert }: Props) {
  const [tab, setTab] = useState<'draw' | 'convert'>('draw');
  const [drawMode, setDrawMode] = useState<DrawMode>('single');
  const [currentChar, setCurrentChar] = useState('a');
  const [charGroup, setCharGroup] = useState<CharGroup>('lower');
  const [penSize, setPenSize] = useState(4);
  const [text, setText] = useState('');
  const [batchWord, setBatchWord] = useState('');
  const [batchCharIndex, setBatchCharIndex] = useState(0);
  const [renderedImage, setRenderedImage] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const coverage = getAlphabetCoverage(profile.chars);

  const charGroups: Record<CharGroup, string[]> = {
    lower: 'abcdefghijklmnopqrstuvwxyzäöüß'.split(''),
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ'.split(''),
    numbers: '0123456789'.split(''),
    punctuation: '.,!?- '.split(''),
  };

  const currentGroupChars = charGroups[charGroup];

  // Batch-Modus: Aktuellen Buchstaben im Wort bestimmen
  useEffect(() => {
    if (drawMode === 'batch' && batchWord.length > 0) {
      if (batchCharIndex >= batchWord.length) {
        setBatchCharIndex(0);
      }
    }
  }, [drawMode, batchWord, batchCharIndex]);

  const handleCharDrawn = (imageData: string, width: number, height: number) => {
    if (drawMode === 'single') {
      // Einzelner Buchstabe
      const newChar: DrawnChar = {
        id: Date.now().toString(),
        char: currentChar,
        imageData,
        width,
        height,
        createdAt: Date.now(),
      };

      const existing = profile.chars[currentChar] || [];
      const updatedChars = {
        ...profile.chars,
        [currentChar]: [...existing, newChar],
      };

      const updated: HandwritingProfile = {
        ...profile,
        chars: updatedChars,
        totalDrawn: profile.totalDrawn + 1,
      };

      onUpdate(updated);
      setSuccess(`"${currentChar}" gespeichert! (${existing.length + 1} Variante${existing.length > 0 ? 'n' : ''})`);
      setTimeout(() => setSuccess(null), 2000);
    } else {
      // Batch-Modus: Wort-buchstabe
      if (batchWord.length === 0) return;
      
      const char = batchWord[batchCharIndex];
      const newChar: DrawnChar = {
        id: Date.now().toString(),
        char: char,
        imageData,
        width,
        height,
        createdAt: Date.now(),
      };

      const existing = profile.chars[char] || [];
      const updatedChars = {
        ...profile.chars,
        [char]: [...existing, newChar],
      };

      const updated: HandwritingProfile = {
        ...profile,
        chars: updatedChars,
        totalDrawn: profile.totalDrawn + 1,
      };

      onUpdate(updated);
      
      // Zum nächsten Buchstaben
      const nextIndex = batchCharIndex + 1;
      if (nextIndex >= batchWord.length) {
        setSuccess(`Wort "${batchWord}" komplett gelernt! 🎉`);
        setBatchCharIndex(0);
      } else {
        setBatchCharIndex(nextIndex);
        setSuccess(`"${char}" gespeichert! Weiter zu "${batchWord[nextIndex]}"`);
      }
      setTimeout(() => setSuccess(null), 2000);
    }
  };

  const handleRender = async () => {
    if (!text.trim()) return;
    setIsRendering(true);
    try {
      const image = await renderText(text, profile.chars, {
        fontSize: 36,
        penColor: profile.color,
        backgroundColor: '#fffef5',
      });
      setRenderedImage(image);
    } finally {
      setIsRendering(false);
    }
  };

  const handleSave = () => {
    if (text.trim() && renderedImage) {
      onConvert(text, renderedImage, profile);
      setSuccess('Text gespeichert!');
      setTimeout(() => setSuccess(null), 2000);
    }
  };

  const getGroupLabel = (g: CharGroup) => {
    switch (g) {
      case 'lower': return 'Klein';
      case 'upper': return 'Groß';
      case 'numbers': return 'Zahlen';
      case 'punctuation': return 'Zeichen';
    }
  };

  const currentBatchChar = drawMode === 'batch' && batchWord.length > 0 ? batchWord[batchCharIndex] : '';

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
          >
            <i className="fas fa-arrow-left text-gray-600 text-sm"></i>
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">{profile.name}</h2>
            <p className="text-xs text-gray-500">{profile.totalDrawn} Buchstaben • {Math.round(coverage.coverage * 100)}% Abdeckung</p>
          </div>
        </div>

        {/* Fortschritt */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${coverage.coverage * 100}%`,
              background: coverage.coverage > 0.7
                ? 'linear-gradient(to right, #10b981, #059669)'
                : coverage.coverage > 0.3
                ? 'linear-gradient(to right, #f59e0b, #d97706)'
                : 'linear-gradient(to right, #ef4444, #dc2626)',
            }}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setTab('draw')}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'draw' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <i className="fas fa-pen mr-2"></i>Zeichnen
          </button>
          <button
            onClick={() => setTab('convert')}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'convert' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <i className="fas fa-file-alt mr-2"></i>Konvertieren
          </button>
        </div>
      </div>

      {/* Success */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
          <i className="fas fa-check-circle"></i>
          {success}
        </div>
      )}

      {tab === 'draw' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Zeichen-Bereich */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5">
            {/* Modus-Umschalter */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setDrawMode('single')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  drawMode === 'single' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <i className="fas fa-font mr-1"></i> Einzelner Buchstabe
              </button>
              <button
                onClick={() => setDrawMode('batch')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  drawMode === 'batch' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <i className="fas fa-spell-check mr-1"></i> Ganzes Wort
              </button>
            </div>

            {drawMode === 'single' ? (
              <>
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  Zeichne den Buchstaben:
                  <span className="text-4xl text-purple-600 font-serif">{currentChar}</span>
                </h3>
                
                <DrawingCanvas
                  onSave={handleCharDrawn}
                  currentChar={currentChar}
                  penColor={profile.color}
                  penSize={penSize}
                />
              </>
            ) : (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wort eingeben das du lernen willst:
                  </label>
                  <input
                    type="text"
                    value={batchWord}
                    onChange={(e) => {
                      setBatchWord(e.target.value);
                      setBatchCharIndex(0);
                    }}
                    placeholder="z.B. Hallo, Welt"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                {batchWord.length > 0 && (
                  <div className="mb-3 p-3 bg-purple-50 rounded-xl">
                    <p className="text-sm text-gray-600 mb-2">Schreibe das Wort Buchstabe für Buchstabe:</p>
                    <div className="flex flex-wrap gap-1">
                      {batchWord.split('').map((char, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-lg font-bold transition-all ${
                            idx === batchCharIndex
                              ? 'bg-purple-500 text-white scale-110 shadow-lg'
                              : idx < batchCharIndex
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {char === ' ' ? '⎵' : char}
                          {idx < batchCharIndex && <i className="fas fa-check text-xs ml-0.5"></i>}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Aktuell: <span className="font-bold text-purple-600">{currentBatchChar}</span>
                      {' '}({batchCharIndex + 1} von {batchWord.length})
                    </p>
                  </div>
                )}

                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  Zeichne:
                  <span className="text-4xl text-purple-600 font-serif">{currentBatchChar || '?'}</span>
                </h3>
                
                <DrawingCanvas
                  onSave={handleCharDrawn}
                  currentChar={currentBatchChar || 'a'}
                  penColor={profile.color}
                  penSize={penSize}
                  guideText={batchWord}
                />
              </>
            )}

            {/* Stift-Dicke */}
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm text-gray-600">Stift-Dicke:</span>
              <input
                type="range"
                min="2"
                max="10"
                value={penSize}
                onChange={(e) => setPenSize(Number(e.target.value))}
                className="flex-1 accent-purple-500"
              />
              <span className="text-sm text-gray-500 w-6">{penSize}</span>
            </div>
          </div>

          {/* Buchstaben-Auswahl (nur im Single-Modus) */}
          {drawMode === 'single' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-3">Buchstabe wählen</h3>
              
              {/* Gruppen-Tabs */}
              <div className="flex gap-1 mb-3 flex-wrap">
                {(Object.keys(charGroups) as CharGroup[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      setCharGroup(g);
                      setCurrentChar(charGroups[g][0]);
                    }}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                      charGroup === g ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {getGroupLabel(g)}
                  </button>
                ))}
              </div>

              {/* Zeichen-Grid */}
              <div className={`grid gap-1.5 ${
                charGroup === 'lower' || charGroup === 'upper' ? 'grid-cols-7' : 'grid-cols-5'
              }`}>
                {currentGroupChars.map((char) => {
                  const variants = profile.chars[char];
                  const count = variants ? variants.length : 0;
                  const isSelected = char === currentChar;
                  
                  return (
                    <button
                      key={char}
                      onClick={() => setCurrentChar(char)}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-bold transition-all relative ${
                        isSelected
                          ? 'bg-purple-500 text-white shadow-lg scale-105'
                          : count > 0
                          ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                          : 'bg-gray-50 text-gray-400 border border-gray-100 hover:bg-gray-100'
                      }`}
                    >
                      {char === ' ' ? '⎵' : char}
                      {count > 0 && !isSelected && (
                        <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-white text-[9px] rounded-full flex items-center justify-center font-bold ${
                          count >= 3 ? 'bg-green-500' : count >= 2 ? 'bg-yellow-500' : 'bg-gray-400'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Vorschau der gezeichneten Varianten */}
              {profile.chars[currentChar] && profile.chars[currentChar].length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">
                    Deine Varianten ({profile.chars[currentChar].length}):
                    <span className="text-xs text-gray-400 ml-2">(Hover = Löschen)</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.chars[currentChar].map((variant) => (
                      <div key={variant.id} className="relative group bg-gray-50 rounded-lg p-1 border border-gray-200">
                        <img
                          src={variant.imageData}
                          alt={variant.char}
                          className="h-10 w-auto"
                        />
                        <button
                          onClick={() => {
                            const updatedChars = {
                              ...profile.chars,
                              [currentChar]: profile.chars[currentChar].filter(v => v.id !== variant.id)
                            };
                            if (updatedChars[currentChar].length === 0) {
                              delete updatedChars[currentChar];
                            }
                            const updated: HandwritingProfile = {
                              ...profile,
                              chars: updatedChars,
                              totalDrawn: profile.totalDrawn - 1,
                            };
                            onUpdate(updated);
                            setSuccess(`Variante von "${currentChar}" gelöscht`);
                            setTimeout(() => setSuccess(null), 2000);
                          }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm"
                          title="Variante löschen"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  {profile.chars[currentChar].length >= 3 && (
                    <p className="text-xs text-green-600 mt-2">
                      <i className="fas fa-star mr-1"></i>
                      Super! Mehrere Varianten = natürlicheres Ergebnis
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Text-Eingabe */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3">Text eingeben</h3>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setRenderedImage(null); }}
              placeholder="Gib hier deinen Text ein...&#10;&#10;Tipp: Groß-/Kleinschreibung wird automatisch erkannt!"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none resize-none h-32"
            />
            <div className="flex gap-3 mt-3">
              <button
                onClick={handleRender}
                disabled={!text.trim() || profile.totalDrawn === 0 || isRendering}
                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold disabled:opacity-50 shadow-lg"
              >
                {isRendering ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Rendere...</>
                ) : (
                  <><i className="fas fa-magic mr-2"></i>In Handschrift umwandeln</>
                )}
              </button>
              {renderedImage && (
                <button
                  onClick={handleSave}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold shadow-lg"
                >
                  <i className="fas fa-save mr-2"></i>Speichern
                </button>
              )}
            </div>
            {profile.totalDrawn === 0 && (
              <p className="text-sm text-amber-600 mt-2">
                <i className="fas fa-exclamation-triangle mr-1"></i>
                Zeichne erst ein paar Buchstaben!
              </p>
            )}
          </div>

          {/* Ergebnis */}
          {renderedImage && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-3">Deine Handschrift</h3>
              <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100">
                <img src={renderedImage} alt="Handschrift" className="w-full rounded-lg" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
