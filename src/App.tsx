import { useState, useEffect } from 'react';
import { HandwritingProfile, ConvertedText, AppView } from './types';
import { CharacterMap } from './utils/handwritingRenderer';
import { compressCharacterMap } from './utils/imageCompression';
import * as storage from './utils/storage';
import HandwritingProfiles from './components/HandwritingProfiles';
import ProfileDetail from './components/ProfileDetail';
import ConvertedTexts from './components/ConvertedTexts';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('profiles');
  const [profiles, setProfiles] = useState<HandwritingProfile[]>([]);
  const [convertedTexts, setConvertedTexts] = useState<ConvertedText[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<HandwritingProfile | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Migration von localStorage zu IndexedDB (einmalig)
        await storage.migrateFromLocalStorage();
        
        // Daten aus IndexedDB laden
        const [loadedProfiles, loadedConverted] = await Promise.all([
          storage.getAllProfiles(),
          storage.getAllConvertedTexts(),
        ]);
        
        setProfiles(loadedProfiles.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
        })));
        
        setConvertedTexts(loadedConverted.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
        })));
      } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Fehler beim Laden der Daten', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateProfile = (name: string, color: string) => {
    const newProfile: HandwritingProfile = {
      id: Date.now().toString(),
      name,
      createdAt: new Date(),
      characterMap: {} as CharacterMap,
      totalSamples: 0,
      color,
    };
    
    setProfiles(prev => [...prev, newProfile]);
    storage.saveProfile(newProfile).catch(err => {
      console.error('Error saving profile:', err);
      showNotification('Fehler beim Speichern', 'error');
    });
    
    showNotification(`Profil "${name}" erstellt! Scanne jetzt deine Buchstaben.`);
  };

  const handleSelectProfile = (profile: HandwritingProfile) => {
    setSelectedProfile(profile);
    setCurrentView('profile-detail');
  };

  const handleDeleteProfile = async (id: string) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
    
    try {
      await storage.deleteProfile(id);
      showNotification('Profil gelöscht');
    } catch (error) {
      console.error('Error deleting profile:', error);
      showNotification('Fehler beim Löschen', 'error');
    }
  };

  const handleUpdateProfile = async (updatedProfile: HandwritingProfile) => {
    // Bilder komprimieren vor dem Speichern
    try {
      const compressedMap = await compressCharacterMap(updatedProfile.characterMap);
      const profileToSave = {
        ...updatedProfile,
        characterMap: compressedMap,
      };
      
      setProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
      setSelectedProfile(updatedProfile);
      
      await storage.saveProfile(profileToSave);
      showNotification('Buchstaben erfolgreich gelernt!');
    } catch (error) {
      console.error('Error saving profile:', error);
      showNotification('Fehler beim Speichern der Buchstaben', 'error');
    }
  };

  const handleConvertText = async (text: string, renderedImage: string, profile: HandwritingProfile) => {
    const converted: ConvertedText = {
      id: Date.now().toString(),
      originalText: text,
      renderedImage,
      profileId: profile.id,
      profileName: profile.name,
      createdAt: new Date(),
    };
    
    setConvertedTexts(prev => [converted, ...prev]);
    
    try {
      await storage.saveConvertedText(converted);
      showNotification('Text in Handschrift konvertiert und gespeichert!');
    } catch (error) {
      console.error('Error saving converted text:', error);
      showNotification('Fehler beim Speichern', 'error');
    }
  };

  const handleDeleteConverted = async (id: string) => {
    setConvertedTexts(prev => prev.filter(t => t.id !== id));
    
    try {
      await storage.deleteConvertedText(id);
    } catch (error) {
      console.error('Error deleting converted text:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center animate-pulse">
            <i className="fas fa-pen-nib text-white text-2xl"></i>
          </div>
          <p className="text-gray-600 font-medium">HandScan wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white font-medium animate-slide-in ${
          notification.type === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-pink-500'
        }`}>
          <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2`}></i>
          {notification.message}
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-lg border-b border-gray-200/50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                <i className="fas fa-pen-nib text-white"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  HandScan
                </h1>
                <p className="text-xs text-gray-500 -mt-0.5">Deine Handschrift, digitalisiert</p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setCurrentView('profiles')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  currentView === 'profiles' || currentView === 'profile-detail'
                    ? 'bg-white shadow text-purple-700'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <i className="fas fa-pen-fancy mr-1.5"></i>
                <span className="hidden sm:inline">Profile</span>
              </button>
              <button
                onClick={() => setCurrentView('converted')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  currentView === 'converted'
                    ? 'bg-white shadow text-green-700'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <i className="fas fa-file-alt mr-1.5"></i>
                <span className="hidden sm:inline">Texte</span>
                {convertedTexts.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                    {convertedTexts.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {currentView === 'profiles' && (
          <HandwritingProfiles
            profiles={profiles}
            onSelectProfile={handleSelectProfile}
            onDeleteProfile={handleDeleteProfile}
            onCreateProfile={handleCreateProfile}
          />
        )}
        {currentView === 'profile-detail' && selectedProfile && (
          <ProfileDetail
            profile={selectedProfile}
            onBack={() => setCurrentView('profiles')}
            onUpdateProfile={handleUpdateProfile}
            onConvertText={handleConvertText}
          />
        )}
        {currentView === 'converted' && (
          <ConvertedTexts
            convertedTexts={convertedTexts}
            onDelete={handleDeleteConverted}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-gray-400">
        <p>HandScan — Lerne deine Handschrift, konvertiere jeden Text ✨</p>
      </footer>
    </div>
  );
}
