export interface HandwritingProfile {
  id: string;
  name: string;
  createdAt: Date;
  samples: HandwritingSample[];
  selectedFont: string;
  color: string;
}

export interface HandwritingSample {
  id: string;
  imageData: string;
  recognizedText: string;
  createdAt: Date;
}

export interface ConvertedText {
  id: string;
  originalText: string;
  profileId: string;
  profileName: string;
  font: string;
  color: string;
  createdAt: Date;
}

export type AppView = 'scanner' | 'profiles' | 'converted' | 'profile-detail';
