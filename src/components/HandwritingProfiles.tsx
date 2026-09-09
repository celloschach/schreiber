import { useState } from 'react';
import { HandwritingProfile } from '../types';
import { getAlphabetCoverage } from '../utils/textRenderer';

interface Props {
  profiles: HandwritingProfile[];
  onSelect: (p: HandwritingProfile) => void;
  onDelete: (id: string) => void;
  onCreate: (name: string, color: string) => void;
}

const COLORS = ['#1a1a2e', '#2d3436', '#0f3460', '#6c5ce7', '#e17055', '#00b894', '#d63031', '#0984e3'];

export default function HandwritingProfiles({ profiles, onSelect, onDelete, onCreate }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim(), color);
      setShowModal(false);
      setName('');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Info-Box */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100 p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <i className="fas fa-hand-pointer text-purple-600"></i>
          </div>
          <div className="text-sm text-gray-700">
            <h3 className="font-bold text-gray-800 mb-1">So funktioniert's</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li><strong>Profil erstellen</strong> — gib deiner Handschrift einen Namen</li>
              <li><strong>Buchstaben zeichnen</strong> — male jeden Buchstaben direkt auf dem Bildschirm</li>
              <li><strong>Text eingeben</strong> — dein Text wird in deiner Handschrift gerendert</li>
            </ol>
            <p className="text-purple-600 font-medium mt-2">
              <i className="fas fa-lightbulb mr-1"></i>
              Je öfter du einen Buchstaben zeichnest, desto natürlicher wird das Ergebnis!
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-800">Meine Profile</h2>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
        >
          <i className="fas fa-plus mr-2"></i>Neues Profil
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className="text-center py-16 bg-white/80 rounded-2xl shadow-lg border border-gray-100">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
            <i className="fas fa-pen-fancy text-3xl text-purple-500"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Noch keine Profile</h3>
          <p className="text-gray-500 mb-4 max-w-sm mx-auto">
            Erstelle dein erstes Profil und zeichne deine Buchstaben!
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg"
          >
            <i className="fas fa-plus mr-2"></i>Los geht's
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map((profile) => {
            const coverage = getAlphabetCoverage(profile.chars);
            return (
              <div
                key={profile.id}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 hover:shadow-xl transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{profile.name}</h3>
                    <p className="text-xs text-gray-400">{profile.totalDrawn} Buchstaben gezeichnet</p>
                  </div>
                  <button
                    onClick={() => onDelete(profile.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-1"
                  >
                    <i className="fas fa-trash text-sm"></i>
                  </button>
                </div>

                {/* Fortschritt */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Alphabet-Abdeckung</span>
                    <span className="font-bold">{Math.round(coverage.coverage * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {coverage.coveredChars.length} / {coverage.coveredChars.length + coverage.missingChars.length} Zeichen
                  </span>
                  <button
                    onClick={() => onSelect(profile)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
                  >
                    Öffnen <i className="fas fa-arrow-right ml-1"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Neues Profil</h3>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name für dein Profil"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Stift-Farbe</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-9 h-9 rounded-full border-2 transition-all ${
                      color === c ? 'border-purple-500 scale-110' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold disabled:opacity-50"
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
