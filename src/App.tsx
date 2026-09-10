import { useState, useEffect } from 'react';
import { HandwritingProfile, ConvertedText, AppView } from './types';
import * as storage from './utils/storage';
import HandwritingProfiles from './components/HandwritingProfiles';
import ProfileDetail from './components/ProfileDetail';
import ConvertedTexts from './components/ConvertedTexts';

// Build-Timestamp wird von Vite beim Kompilieren eingefügt
declare const __BUILD_TIME__: string;

export default function App() {
  // Datum und Uhrzeit des letzten Builds
  const lastUpdate = new Date(__BUILD_TIME__).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const [view, setView] = useState<AppView>('profiles');
  const [profiles, setProfiles] = useState<HandwritingProfile[]>([]);
  const [converted, setConverted] = useState<ConvertedText[]>([]);
  const [selected, setSelected] = useState<HandwritingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, c] = await Promise.all([
          storage.getAllProfiles(),
          storage.getAllConvertedTexts(),
        ]);
        setProfiles(p);
        setConverted(c);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleCreate = async (name: string, color: string) => {
    const p: HandwritingProfile = {
      id: Date.now().toString(),
      name,
      createdAt: Date.now(),
      chars: {},
      totalDrawn: 0,
      color,
    };
    setProfiles(prev => [...prev, p]);
    await storage.saveProfile(p);
    notify(`"${name}" erstellt! Zeichne jetzt deine Buchstaben.`);
  };

  const handleDelete = async (id: string) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
    await storage.deleteProfile(id);
    notify('Profil gelöscht');
  };

  const handleUpdate = async (updated: HandwritingProfile) => {
    setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelected(updated);
    await storage.saveProfile(updated);
  };

  const handleConvert = async (text: string, image: string, profile: HandwritingProfile) => {
    const c: ConvertedText = {
      id: Date.now().toString(),
      originalText: text,
      renderedImage: image,
      profileId: profile.id,
      profileName: profile.name,
      createdAt: Date.now(),
    };
    setConverted(prev => [c, ...prev]);
    await storage.saveConvertedText(c);
    notify('Text gespeichert!');
  };

  const handleDeleteConverted = async (id: string) => {
    setConverted(prev => prev.filter(c => c.id !== id));
    await storage.deleteConvertedText(id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center animate-pulse">
            <i className="fas fa-pen-nib text-white text-2xl"></i>
          </div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white font-medium animate-slide-in ${
          toast.type === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-pink-500'
        }`}>
          <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-times-circle'} mr-2`}></i>
          {toast.msg}
        </div>
      )}

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-lg border-b border-gray-200/50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
              <i className="fas fa-pen-nib text-white"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                HandScan
              </h1>
              <p className="text-xs text-gray-500 -mt-0.5">Zeichne • Lerne • Konvertiere</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setView('profiles')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                view === 'profiles' || view === 'profile-detail'
                  ? 'bg-white shadow text-purple-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <i className="fas fa-pen-fancy mr-1.5"></i>
              <span className="hidden sm:inline">Profile</span>
            </button>
            <button
              onClick={() => setView('converted')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                view === 'converted' ? 'bg-white shadow text-green-700' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <i className="fas fa-file-alt mr-1.5"></i>
              <span className="hidden sm:inline">Texte</span>
              {converted.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                  {converted.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {view === 'profiles' && (
          <HandwritingProfiles
            profiles={profiles}
            onSelect={(p) => { setSelected(p); setView('profile-detail'); }}
            onDelete={handleDelete}
            onCreate={handleCreate}
          />
        )}
        {view === 'profile-detail' && selected && (
          <ProfileDetail
            profile={selected}
            onBack={() => setView('profiles')}
            onUpdate={handleUpdate}
            onConvert={handleConvert}
          />
        )}
        {view === 'converted' && (
          <ConvertedTexts texts={converted} onDelete={handleDeleteConverted} />
        )}
      </main>

      <footer className="text-center py-6 text-sm text-gray-400">
        <p>HandScan — Deine Handschrift, gezeichnet und digitalisiert ✨</p>
        <p className="mt-2 text-xs">
          <i className="fas fa-clock mr-1"></i>
          Zuletzt aktualisiert: {lastUpdate} Uhr
        </p>
      </footer>
    </div>
  );
}
