import { useState } from 'react';
import { HandwritingProfile } from '../types';
import { getMapQuality } from '../utils/handwritingRenderer';

interface HandwritingProfilesProps {
  profiles: HandwritingProfile[];
  onSelectProfile: (profile: HandwritingProfile) => void;
  onDeleteProfile: (id: string) => void;
  onCreateProfile: (name: string, color: string) => void;
}

const COLORS = [
  '#1a1a2e', '#2d3436', '#0f3460', '#533483',
  '#e94560', '#2b2d42', '#1b262c', '#3d5a80',
];

export default function HandwritingProfiles({ profiles, onSelectProfile, onDeleteProfile, onCreateProfile }: HandwritingProfilesProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateProfile(newName.trim(), newColor);
      setShowCreateModal(false);
      setNewName('');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Erklärung */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0">
            <i className="fas fa-lightbulb text-purple-600 text-lg"></i>
          </div>
          <div>
            <h3 className="font-bold text-gray-800 mb-1">So funktioniert's</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>1. Profil erstellen:</strong> Gib deinem Handschrift-Profil einen Namen.</p>
              <p><strong>2. Buchstaben lernen:</strong> Schreibe Buchstaben auf Papier, scanne sie ein. Das System lernt deine Handschrift.</p>
              <p><strong>3. Text konvertieren:</strong> Gib einen Text ein oder scanne einen gedruckten Text — er wird in DEINER Handschrift dargestellt!</p>
              <p className="text-purple-600 font-medium"><i className="fas fa-chart-line mr-1"></i> Je mehr Buchstaben-Samples du hinzufügst, desto besser wird das Ergebnis.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
            <i className="fas fa-pen-fancy text-white text-sm"></i>
          </span>
          Meine Profile
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <i className="fas fa-plus mr-2"></i>
          Neues Profil
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
            <i className="fas fa-hand-sparkles text-4xl text-purple-500"></i>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Lerne deine Handschrift kennen</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Erstelle dein erstes Profil und fülle es mit Buchstaben-Samples. 
            Danach kannst du jeden Text in deiner persönlichen Handschrift darstellen!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
          >
            <i className="fas fa-plus mr-2"></i>
            Erstes Profil erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map((profile) => {
            const quality = getMapQuality(profile.characterMap);
            return (
              <div
                key={profile.id}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 hover:shadow-xl transition-all hover:-translate-y-1 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{profile.name}</h3>
                    <p className="text-xs text-gray-400">
                      {profile.totalSamples} Buchstaben-Samples
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteProfile(profile.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-1"
                  >
                    <i className="fas fa-trash text-sm"></i>
                  </button>
                </div>

                {/* Fortschrittsbalken */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Alphabet-Abdeckung</span>
                    <span className="font-bold">{Math.round(quality.coverage * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
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
                  {quality.missingChars.length > 0 && quality.missingChars.length <= 10 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Fehlend: {quality.missingChars.join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <i className="fas fa-font"></i>
                    Ø {quality.averageSamplesPerChar.toFixed(1)} Samples/Buchstabe
                  </span>
                  <button
                    onClick={() => onSelectProfile(profile)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
                  >
                    <i className="fas fa-arrow-right mr-1"></i>
                    Öffnen
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-fade-in">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Neues Handschrift-Profil</h3>
            <p className="text-sm text-gray-500 mb-4">
              Erstelle ein Profil und lerne deine Handschrift durch das Scannen von Buchstaben.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profil-Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="z.B. Meine Handschrift"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Textfarbe</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      className={`w-10 h-10 rounded-full border-3 transition-all ${
                        newColor === color ? 'border-purple-500 scale-125 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
