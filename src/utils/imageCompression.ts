/**
 * Bild-Komprimierung für effiziente Speicherung
 * Reduziert die Größe von Buchstaben-Bildern erheblich
 */

/**
 * Komprimiert ein Bild (Data-URL) auf eine maximale Größe
 * @param imageDataUrl - Das Original-Bild als Data-URL
 * @param maxWidth - Maximale Breite in Pixeln (Standard: 80)
 * @param maxHeight - Maximale Höhe in Pixeln (Standard: 100)
 * @param quality - JPEG-Qualität 0-1 (Standard: 0.7)
 * @returns Komprimiertes Bild als JPEG Data-URL
 */
export async function compressImage(
  imageDataUrl: string,
  maxWidth: number = 80,
  maxHeight: number = 100,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // Berechne neue Größe unter Beibehaltung des Seitenverhältnisses
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d')!;
      
      // Weißer Hintergrund (wichtig für JPEG)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      
      // Hochwertige Skalierung
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      // Als JPEG exportieren (viel kleiner als PNG)
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = reject;
    img.src = imageDataUrl;
  });
}

/**
 * Komprimiert alle Character-Samples in einer CharacterMap
 */
export async function compressCharacterMap(
  characterMap: Record<string, any[]>
): Promise<Record<string, any[]>> {
  const compressed: Record<string, any[]> = {};
  
  for (const [char, samples] of Object.entries(characterMap)) {
    compressed[char] = [];
    
    for (const sample of samples) {
      try {
        // Nur komprimieren wenn es eine Data-URL ist und noch nicht komprimiert
        if (sample.imageData && sample.imageData.startsWith('data:image/png')) {
          const compressedImage = await compressImage(sample.imageData, 80, 100, 0.7);
          compressed[char].push({
            ...sample,
            imageData: compressedImage,
          });
        } else {
          compressed[char].push(sample);
        }
      } catch (e) {
        // Wenn Komprimierung fehlschlägt, Original behalten
        compressed[char].push(sample);
      }
    }
  }
  
  return compressed;
}

/**
 * Schätzt die Größe einer CharacterMap in Bytes
 */
export function estimateMapSize(characterMap: Record<string, any[]>): number {
  let totalSize = 0;
  
  for (const samples of Object.values(characterMap)) {
    for (const sample of samples) {
      if (sample.imageData) {
        // Base64 ist ~4/3 der Originalgröße
        totalSize += (sample.imageData.length * 3) / 4;
      }
    }
  }
  
  return totalSize;
}

/**
 * Formatiert Bytes in eine lesbare Größe
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
