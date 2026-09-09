import Tesseract from 'tesseract.js';
import { preprocessImage, multiPassPreprocessing, selectBestResult } from './imageProcessing';
import { correctTextWithDictionary, contextCorrect } from './dictionary';

export interface OCRResult {
  text: string;
  confidence: number;
  processedImage: string;
  corrections: number;
}

/**
 * Optimierte OCR-Engine für deutsche Handschrift
 * Mehrstufige Verarbeitung mit Bildverbesserung und Kontext-Korrektur
 */
export async function recognizeHandwriting(imageDataUrl: string): Promise<OCRResult> {
  // Stufe 1: Mehrstufige Bildvorverarbeitung
  const processedImages = await multiPassPreprocessing(imageDataUrl);
  
  // Stufe 2: OCR mit verschiedenen PSM-Modi auf jedem verarbeiteten Bild
  const allResults: { text: string; confidence: number; image: string }[] = [];
  
  // PSM 6: Ein einheitlicher Block von Text
  for (const img of processedImages) {
    try {
      const result = await Tesseract.recognize(img, 'deu', {
        logger: () => {},
      });
      if (result.data.text.trim()) {
        allResults.push({
          text: result.data.text,
          confidence: result.data.confidence,
          image: img,
        });
      }
    } catch (e) {
      console.warn('OCR pass failed:', e);
    }
  }
  
  // PSM 7: Einzelne Zeile (gut für kurze Texte)
  for (const img of processedImages.slice(0, 2)) {
    try {
      const result = await Tesseract.recognize(img, 'deu', {
        logger: () => {},
      });
      if (result.data.text.trim()) {
        allResults.push({
          text: result.data.text,
          confidence: result.data.confidence * 0.95, // Leicht gewichtet
          image: img,
        });
      }
    } catch (e) {
      console.warn('OCR line pass failed:', e);
    }
  }
  
  // Stufe 3: Bestes Ergebnis auswählen
  let bestResult = allResults.length > 0
    ? allResults.reduce((best, curr) => curr.confidence > best.confidence ? curr : best)
    : { text: '', confidence: 0, image: processedImages[0] || imageDataUrl };
  
  // Stufe 4: Text-Nachverarbeitung
  let text = bestResult.text.trim();
  let corrections = 0;
  
  if (text) {
    // 4a: Offensichtliche Handschrift-Fehler korrigieren
    text = fixHandwritingArtifacts(text);
    
    // 4b: Wörterbuch-Korrektur
    const beforeDict = text;
    text = correctTextWithDictionary(text);
    if (text !== beforeDict) corrections++;
    
    // 4c: Kontext-Korrektur
    const beforeContext = text;
    text = contextCorrect(text);
    if (text !== beforeContext) corrections++;
    
    // 4d: Formatierung bereinigen
    text = cleanFormatting(text);
  }
  
  return {
    text,
    confidence: bestResult.confidence,
    processedImage: bestResult.image,
    corrections,
  };
}

/**
 * Einfache OCR für schnelle Erkennung (ohne Multi-Pass)
 */
export async function quickRecognize(imageDataUrl: string): Promise<OCRResult> {
  const processed = await preprocessImage(imageDataUrl);
  
  const result = await Tesseract.recognize(processed, 'deu', {
    logger: () => {},
  });
  
  let text = result.data.text.trim();
  let corrections = 0;
  
  if (text) {
    text = fixHandwritingArtifacts(text);
    const before = text;
    text = correctTextWithDictionary(text);
    if (text !== before) corrections++;
    text = cleanFormatting(text);
  }
  
  return {
    text,
    confidence: result.data.confidence,
    processedImage: processed,
    corrections,
  };
}

/**
 * Behebt typische Artefakte bei Handschrift-Erkennung
 */
function fixHandwritingArtifacts(text: string): string {
  let result = text;
  
  // Mehrfache Leerzeichen entfernen
  result = result.replace(/\s{2,}/g, ' ');
  
  // Typische OCR-Fehler bei deutschen Umlauten
  result = result.replace(/ii(?=[aeiou])/g, 'ü');
  result = result.replace(/é/g, 'e');
  result = result.replace(/à/g, 'a');
  
  // Einzelne falsche Zeichen am Wortanfang/ende entfernen
  result = result.replace(/\s[.,;:]\s/g, ' ');
  
  // Zeilenumbrüche bereinigen
  result = result.replace(/\n{3,}/g, '\n\n');
  
  // Fehlende Leerzeichen nach Satzzeichen hinzufügen
  result = result.replace(/([.!?])([A-ZÄÖÜ])/g, '$1 $2');
  
  return result;
}

/**
 * Bereinigt die Formatierung des erkannten Textes
 */
function cleanFormatting(text: string): string {
  let result = text;
  
  // Führende/abschließende Leerzeichen pro Zeile
  result = result.split('\n').map(line => line.trim()).join('\n');
  
  // Doppelte Leerzeichen
  result = result.replace(/ {2,}/g, ' ');
  
  // Leerzeichen vor Satzzeichen entfernen
  result = result.replace(/\s+([.,;:!?])/g, '$1');
  
  // Leerzeichen nach öffnenden Klammern entfernen
  result = result.replace(/([(\[{])\s+/g, '$1');
  
  // Leerzeichen vor schließenden Klammern entfernen
  result = result.replace(/\s+([)\]}])/g, '$1');
  
  return result;
}

/**
 * Erkennt ob ein Text wahrscheinlich Handschrift oder Druckschrift ist
 */
export function analyzeTextCharacteristics(text: string): {
  isLikelyHandwriting: boolean;
  confidence: number;
  characteristics: string[];
} {
  const characteristics: string[] = [];
  let handwritingScore = 0;
  
  // Ungewöhnliche Zeichenkombinationen deuten auf Handschrift hin
  const unusualPatterns = /[ñûîâêô]/g;
  const unusualMatches = text.match(unusualPatterns) || [];
  if (unusualMatches.length > 0) {
    handwritingScore += unusualMatches.length * 2;
    characteristics.push('Ungewöhnliche Zeichen erkannt');
  }
  
  // Inkonsistente Groß-/Kleinschreibung
  const words = text.split(/\s+/);
  let inconsistentCase = 0;
  for (const word of words) {
    if (word.length > 3) {
      const hasUpper = /[A-Z]/.test(word.slice(1));
      const hasLower = /[a-z]/.test(word);
      if (hasUpper && hasLower) inconsistentCase++;
    }
  }
  if (inconsistentCase > words.length * 0.3) {
    handwritingScore += 3;
    characteristics.push('Inkonsistente Groß-/Kleinschreibung');
  }
  
  // Fehlende/extra Leerzeichen
  const spaceIssues = text.match(/\s{2,}|[a-z][A-Z]/g) || [];
  if (spaceIssues.length > 2) {
    handwritingScore += 2;
    characteristics.push('Unregelmäßige Wortabstände');
  }
  
  const confidence = Math.min(handwritingScore / 10, 1);
  
  return {
    isLikelyHandwriting: handwritingScore > 3,
    confidence,
    characteristics,
  };
}
