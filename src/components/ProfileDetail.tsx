import { useState } from 'react';
import { HandwritingProfile } from '../types';
import CameraScanner from './CameraScanner';

interface ProfileDetailProps {
  profile: HandwritingProfile;
  onBack: () => void;
  onAddSample: (profileId: string, text: string, imageData: string) => void;
  onConvertText: (text: string, profile: HandwritingProfile) => void;
}

export default function ProfileDetail({ profile, onBack, onAddSample, onConvertText }: ProfileDetailProps) {
  const [activeTab, setActiveTab] = useState<'samples' | 'convert'>('samples');
  const [manualText, setManualText] = useState('');

  const handleTextRecognized = (text: string, imageData: string) => {
    if (activeTab === 'samples') {
      onAddSample(profile.id, text, imageData);
    } else {
      onConvertText(text, profile);
    }
  };

  const handleManualConvert = () => {
    if (manualText.trim()) {
      onConvertText(manualText.trim(), profile);
      setManualText('');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <i className="fas fa-arrow-left text-gray-600"></i>
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800">{profile.name}</h2>
            <p className="text-sm text-gray-500">
              {profile.samples.length} Sample{profile.samples.length !== 1 ? 's' : ''} • 
              Stil: <span style={{ fontFamily: `'${profile.selectedFont}', cursive` }}>{profile.selectedFont}</span>
            </p>
          </div>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: profile.color + '20' }}
          >
            <i className="fas fa-pen-fancy text-lg" style={{ color: profile.color }}></i>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab('samples')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'samples'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="fas fa-plus-circle mr-2"></i>
            Samples hinzufügen
          </button>
          <button
            onClick={() => setActiveTab('convert')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'convert'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="fas fa-exchange-alt mr-2"></i>
            Text konvertieren
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'samples' ? (
          <>
            <CameraScanner
              onTextRecognized={handleTextRecognized}
              mode="handwriting"
              profileName={profile.name}
            />

            {/* Samples List */}
            {profile.samples.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <i className="fas fa-list text-purple-500"></i>
                  Gespeicherte Samples
                </h3>
                <div className="space-y-3">
                  {profile.samples.map((sample, index) => (
                    <div key={sample.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-lg leading-relaxed"
                          style={{ fontFamily: `'${profile.selectedFont}', cursive`, color: profile.color }}
                        >
                          {sample.recognizedText}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(sample.createdAt).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Manual Text Input */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <i className="fas fa-keyboard text-green-500"></i>
                Text manuell eingeben
              </h3>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Gib hier einen Text ein, der in Handschrift-Stil umgewandelt werden soll..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none h-32"
              />
              <button
                onClick={handleManualConvert}
                disabled={!manualText.trim()}
                className="mt-3 px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-magic mr-2"></i>
                In Handschrift umwandeln
              </button>
            </div>

            {/* Camera Scanner for Print Text */}
            <CameraScanner
              onTextRecognized={handleTextRecognized}
              mode="print"
            />

            {/* Preview */}
            {manualText && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <i className="fas fa-eye text-amber-500"></i>
                  Vorschau
                </h3>
                <div
                  className="p-4 bg-gradient-to-br from-amber-50/50 to-orange-50/50 rounded-xl leading-relaxed text-xl"
                  style={{ fontFamily: `'${profile.selectedFont}', cursive`, color: profile.color }}
                >
                  {manualText}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
