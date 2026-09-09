import { useState } from 'react';
import { HandwritingProfile } from '../types';

interface HandwritingProfilesProps {
  profiles: HandwritingProfile[];
  onSelectProfile: (profile: HandwritingProfile) => void;
  onDeleteProfile: (id: string) => void;
  onCreateProfile: (name: string, font: string, color: string) => void;
}

const HANDWRITING_FONTS = [
  { name: 'Caveat', label: 'Caveat' },
  { name: 'Dancing Script', label: 'Dancing Script' },
  { name: 'Patrick Hand', label: 'Patrick Hand' },
  { name: 'Kalam', label: 'Kalam' },
  { name: 'Indie Flower', label: 'Indie Flower' },
  { name: 'Shadows Into Light', label: 'Shadows Into Light' },
  { name: 'Satisfy', label: 'Satisfy' },
  { name: 'Pacifico', label: 'Pacifico' },
];

const COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483',
  '#e94560', '#2d4059', '#ea5455', '#f07b3f',
  '#2b2d42', '#8d99ae', '#06090d', '#1b262c',
];

export default function HandwritingProfiles({ profiles, onSelectProfile, onDeleteProfile, onCreateProfile }: HandwritingProfilesProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFont, setNewFont] = useState(HANDWRITING_FONTS[0].name);
  const [newColor, setNewColor] = useState(COLORS[0]);

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateProfile(newName.trim(), newFont, newColor);
      setShowCreateModal(false);
      setNewName('');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
            <i className="fas fa-pen-fancy text-white text-sm"></i>
          </span>
          Handschrift-Profile
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
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
            <i className="fas fa-pen-nib text-3xl text-purple-500"></i>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Noch keine Profile</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Erstelle dein erstes Handschrift-Profil, indem du deine Handschrift scannst. 
            Danach kannst du jeden beliebigen Text in deinem Handschrift-Stil anzeigen lassen.
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 hover:shadow-xl transition-all hover:-translate-y-1 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{profile.name}</h3>
                  <p className="text-xs text-gray-400">
                    {profile.samples.length} Sample{profile.samples.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => onDeleteProfile(profile.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-1"
                >
                  <i className="fas fa-trash text-sm"></i>
                </button>
              </div>

              <div
                className="mb-3 p-3 bg-gray-50 rounded-lg min-h-[60px] flex items-center"
                style={{ fontFamily: `'${profile.selectedFont}', cursive`, color: profile.color }}
              >
                {profile.samples.length > 0 ? (
                  <p className="text-lg leading-relaxed">
                    {profile.samples[profile.samples.length - 1].recognizedText.slice(0, 40)}...
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Noch keine Samples</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <i className="fas fa-font"></i>
                  {profile.selectedFont}
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
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Neues Handschrift-Profil</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profil-Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="z.B. Meine Handschrift"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Handschrift-Stil</label>
                <div className="grid grid-cols-2 gap-2">
                  {HANDWRITING_FONTS.map((font) => (
                    <button
                      key={font.name}
                      onClick={() => setNewFont(font.name)}
                      className={`px-3 py-2 rounded-lg border-2 text-center transition-all ${
                        newFont === font.name
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{ fontFamily: `'${font.name}', cursive` }}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Textfarbe</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newColor === color ? 'border-purple-500 scale-125' : 'border-gray-200'
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

export { HANDWRITING_FONTS, COLORS };
