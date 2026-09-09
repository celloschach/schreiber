import { CharacterMap } from './utils/handwritingRenderer';

export interface HandwritingProfile {
  id: string;
  name: string;
  createdAt: Date;
  characterMap: CharacterMap;
  totalSamples: number;
  color: string;
}

export interface ConvertedText {
  id: string;
  originalText: string;
  renderedImage: string;
  profileId: string;
  profileName: string;
  createdAt: Date;
}

export type AppView = 'profiles' | 'profile-detail' | 'converted';
