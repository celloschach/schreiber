// Ein gezeichneter Buchstabe als Canvas-Daten
export interface DrawnChar {
  id: string;
  char: string;
  // Normalisiertes Bild des Buchstabens (klein, als Data-URL)
  imageData: string;
  width: number;
  height: number;
  createdAt: number;
}

// Ein Handschrift-Profil
export interface HandwritingProfile {
  id: string;
  name: string;
  createdAt: number;
  // Map von Zeichen zu Array von gezeichneten Varianten
  chars: Record<string, DrawnChar[]>;
  totalDrawn: number;
  color: string;
}

// Ein konvertierter Text
export interface ConvertedText {
  id: string;
  originalText: string;
  renderedImage: string;
  profileId: string;
  profileName: string;
  createdAt: number;
}

export type AppView = 'profiles' | 'profile-detail' | 'converted';
