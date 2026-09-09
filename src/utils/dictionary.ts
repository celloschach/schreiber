// Häufigste deutsche Wörter für OCR Post-Processing
export const GERMAN_DICTIONARY = new Set([
  // Sehr häufige Wörter
  'der', 'die', 'das', 'und', 'in', 'den', 'von', 'zu', 'mit', 'ist',
  'des', 'sich', 'als', 'auch', 'es', 'an', 'er', 'auf', 'so', 'eine',
  'wird', 'bei', 'einer', 'um', 'am', 'sind', 'noch', 'nach', 'über',
  'dieser', 'dem', 'nicht', 'aus', 'ich', 'man', 'für', 'im', 'dem',
  'alle', 'vor', 'sich', 'oder', 'aber', 'wie', 'wir', 'ihr', 'nun',
  'durch', 'sein', 'kann', 'diesem', 'schon', 'wenn', 'habe', 'sein',
  'nur', 'jahr', 'mehr', 'war', 'dieses', 'wieder', 'ohne', 'sei',
  'sehr', 'hier', 'ganz', 'wo', 'will', 'also', 'bis', 'muss', 'mag',
  'doch', 'etwas', 'andere', 'ob', 'diese', 'seinem', 'alle', 'seit',
  'hatte', 'können', 'gegen', 'vom', 'können', 'dann', 'wenn', 'soll',
  'ging', 'weil', 'wer', 'wurde', 'während', 'würde', 'dazu', 'liegt',
  'neuen', 'neue', 'zwischen', 'immer', 'meter', 'etwa', 'dort', 'teil',
  'kam', 'unser', 'unter', 'machen', 'letzte', 'leben', 'beiden',
  'seite', 'stehen', 'heute', 'freie', 'kommt', 'zeit', 'großen',
  'wegen', 'jeder', 'besonders', 'hätte', 'müssen', 'darauf', 'weit',
  'wurden', 'lassen', 'diesen', 'könnte', 'ihrem', 'damit', 'dafür',
  'einmal', 'waren', 'gehen', 'deutschen', 'gut', 'seine', 'durch',
  'kein', 'neue', 'hatten', 'deutsche', 'werde', 'keine', 'ihnen',
  'ganze', 'anderen', 'lange', 'zusammen', 'eigenen', 'oben', 'kleinen',
  'große', 'gab', 'hier', 'brachte', 'jedes', 'bringen', 'mich',
  'neben', 'sogar', 'beim', 'gewesen', 'beispiel', 'statt', 'ALLEDING',
  'allerdings', 'allein', 'anfang', 'arbeiten', 'augen', 'ausdruck',
  'bedeutet', 'befand', 'begann', 'begriff', 'befinden', 'beide',
  'bereits', 'besser', 'besteht', 'bevor', 'beziehung', 'bild', 'bin',
  'bisher', 'bleiben', 'brauchen', 'bringen', 'buch', 'da', 'dabei',
  'dafür', 'dagegen', 'daher', 'damals', 'danach', 'dank', 'dann',
  'darf', 'darstellen', 'dazu', 'dein', 'denken', 'denn', 'dennoch',
  'deshalb', 'dessen', 'deutlich', 'dich', 'dienen', 'ding', 'dir',
  'dürfen', 'draußen', 'drei', 'drin', 'dritte', 'droben', 'drücken',
  'dumm', 'dunkel', 'eben', 'egal', 'ehe', 'eher', 'eigen', 'eigentlich',
  'ein', 'einfach', 'einige', 'einmal', 'eins', 'einzelne', 'ende',
  'endlich', 'entlang', 'entweder', 'erfahren', 'erst', 'erste',
  'erzählen', 'etwas', 'face', 'fall', 'fand', 'fast', 'fehlen',
  'ferner', 'fertig', 'finden', 'folge', 'fordern', 'form', 'frage',
  'frau', 'frei', 'fremd', 'freuen', 'freund', 'früher', 'fünf',
  'für', 'gabe', 'gang', 'ganz', 'gar', 'geben', 'gefahr', 'gefühl',
  'gegen', 'gehen', 'geist', 'gelten', 'gemäß', 'genau', 'genug',
  'gerade', 'gern', 'geschehen', 'gestern', 'gewiss', 'gibt', 'ging',
  'glaube', 'gleich', 'glück', 'groß', 'grund', 'gut', 'haar',
  'halten', 'hand', 'hängen', 'hart', 'haus', 'heißt', 'helfen',
  'heraus', 'herren', 'herzen', 'heute', 'hier', 'hilfe', 'hin',
  'hinaus', 'hinter', 'hoch', 'holen', 'hören', 'hund', 'hundert',
  'ich', 'ihm', 'ihn', 'ihnen', 'ihr', 'immer', 'indem', 'inne',
  'innerhalb', 'ins', 'irgend', 'ist', 'ja', 'jahr', 'jede', 'jeden',
  'jedenfalls', 'jeder', 'jedes', 'jedoch', 'jemals', 'jene', 'jener',
  'jenes', 'jetzt', 'jung', 'just', 'kam', 'kann', 'kaum', 'kein',
  'keiner', 'kennen', 'kind', 'klar', 'klein', 'kommen', 'kopf',
  'kurz', 'können', 'körper', 'lächeln', 'lang', 'lange', 'längst',
  'lassen', 'laut', 'leben', 'legen', 'leicht', 'leise', 'lernen',
  'lesen', 'letzt', 'leute', 'licht', 'lieb', 'liegen', 'ließ',
  'links', 'mädchen', 'mal', 'man', 'mann', 'mensch', 'merken',
  'mich', 'mir', 'mit', 'mittel', 'mögen', 'möglich', 'morgen',
  'muss', 'mut', 'nach', 'nachdem', 'nacht', 'nah', 'name', 'nämlich',
  'natürlich', 'neben', 'nehmen', 'nein', 'nennen', 'neu', 'nicht',
  'nichts', 'noch', 'nun', 'nur', 'nutzen', 'ob', 'oben', 'oder',
  'offen', 'ohne', 'ordnung', 'ort', 'paar', 'platz', 'plötzlich',
  'recht', 'reden', 'reich', 'reihe', 'richtig', 'ringen', 'rund',
  'sache', 'sagen', 'sagt', 'sah', 'scheinen', 'schließen', 'schon',
  'schreiben', 'sehen', 'sehr', 'sein', 'seit', 'selbst', 'setzen',
  'sicher', 'sie', 'sieht', 'sind', 'sinn', 'so', 'sogar', 'solch',
  'soll', 'sollen', 'sondern', 'sonst', 'sprechen', 'springen',
  'spät', 'spielen', 'stand', 'stark', 'stehen', 'stellen', 'stimme',
  'suchen', 'tag', 'tat', 'tatsächlich', 'teil', 'tief', 'tot',
  'tragen', 'tun', 'über', 'überhaupt', 'übrigens', 'uhr', 'um',
  'und', 'uns', 'unser', 'unten', 'unter', 'vergangenen', 'viel',
  'vielleicht', 'vier', 'vom', 'von', 'vor', 'vorbei', 'wahr',
  'während', 'wann', 'war', 'warum', 'was', 'weg', 'wegen', 'weil',
  'weit', 'weiter', 'welche', 'welcher', 'wenig', 'wenigstens',
  'wenn', 'wer', 'werden', 'werfen', 'werk', 'wesentlich', 'wie',
  'wieder', 'will', 'wir', 'wird', 'wo', 'wollen', 'worden', 'wurde',
  'wusste', 'zählen', 'zeit', 'ziehen', 'ziel', 'ziemlich', 'zirka',
  'zogen', 'zudem', 'zuerst', 'zugleich', 'zuletzt', 'zum', 'zunächst',
  'zur', 'zurück', 'zusammen', 'zwar', 'zwei', 'zwischen', 'zwölf',
  // Häufige Sätze und Phrasen
  'guten tag', 'guten morgen', 'guten abend', 'auf wiedersehen',
  'bitte schön', 'danke schön', 'es tut mir leid', 'kein problem',
  'wie geht es', 'mir geht es gut', 'wohlfühlen', 'selbstverständlich',
  'wahrscheinlich', 'ungefähr', 'eigentlich', 'normalerweise',
  'hauptsächlich', 'außerdem', 'darüber', 'deshalb', 'trotzdem',
  'inzwischen', 'mittlerweile', 'beispielsweise', 'insbesondere',
  'schließlich', 'allerdings', 'vielmehr', 'beziehungsweise',
  // Zahlen
  'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht',
  'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn',
  'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'dreißig',
  'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig',
  'hundert', 'tausend', 'million', 'milliarde',
]);

// Deutsche Buchstaben-Häufigkeit für bessere Erkennung
export const GERMAN_CHAR_FREQUENCY: Record<string, number> = {
  'e': 16.4, 'n': 9.8, 'i': 7.6, 's': 7.3, 'r': 7.0, 'a': 6.5,
  't': 6.1, 'd': 5.1, 'h': 4.8, 'u': 4.4, 'c': 3.1, 'l': 3.4,
  'g': 3.0, 'm': 2.5, 'o': 2.5, 'b': 1.9, 'w': 1.9, 'f': 1.7,
  'k': 1.4, 'z': 1.1, 'p': 0.7, 'v': 0.7, 'j': 0.3, 'y': 0.03,
  'x': 0.03, 'q': 0.02, 'ä': 0.5, 'ö': 0.3, 'ü': 0.6, 'ß': 0.3,
};

// Levenshtein-Distanz für Wort-Korrektur
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Finde das ähnlichste Wort im Wörterbuch
export function findClosestWord(word: string, maxDistance: number = 2): string | null {
  const lower = word.toLowerCase();
  if (GERMAN_DICTIONARY.has(lower)) return lower;
  
  let bestMatch: string | null = null;
  let bestDistance = maxDistance + 1;
  
  for (const dictWord of GERMAN_DICTIONARY) {
    // Schnelle Längen-Prüfung
    if (Math.abs(dictWord.length - lower.length) > maxDistance) continue;
    
    const distance = levenshteinDistance(lower, dictWord);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = dictWord;
    }
  }
  
  return bestMatch;
}

// Korrigiere einen erkannten Text mit dem Wörterbuch
export function correctTextWithDictionary(text: string): string {
  const words = text.split(/(\s+)/);
  const corrected = words.map(token => {
    // Leerzeichen und Sonderzeichen beibehalten
    if (/^\s+$/.test(token) || token.length <= 1) return token;
    
    // Nur Buchstaben-Wörter korrigieren
    const wordPart = token.replace(/[^a-zA-ZäöüÄÖÜß]/g, '');
    if (wordPart.length < 2) return token;
    
    const closest = findClosestWord(wordPart, Math.min(2, Math.floor(wordPart.length / 3)));
    if (closest) {
      // Groß-/Kleinschreibung beibehalten
      if (token[0] === token[0].toUpperCase()) {
        return closest.charAt(0).toUpperCase() + closest.slice(1);
      }
      return closest;
    }
    return token;
  });
  
  return corrected.join('');
}

// Häufige OCR-Fehler bei deutscher Handschrift korrigieren
export function fixCommonHandwritingErrors(text: string): string {
  let result = text;
  
  // Häufige Verwechslungen bei Handschrift
  const commonErrors: [RegExp, string][] = [
    [/rn/g, 'm'],  // rn wird oft als m gelesen oder umgekehrt
    [/cl/g, 'd'],  // cl → d
    [/vv/g, 'w'],  // vv → w
    [/ii/g, 'ü'],  // ii → ü (manchmal)
    [/ae/g, 'ä'],  // ae → ä
    [/oe/g, 'ö'],  // oe → ö  
    [/ue/g, 'ü'],  // ue → ü
    [/ss/g, 'ß'],  // ss → ß (in manchen Kontexten)
  ];
  
  // Nur anwenden wenn es sinnvoll ist (nicht blind ersetzen)
  // Diese Ersetzungen werden nur als Vorschläge gemacht
  
  return result;
}

// Kontext-basierte Korrektur: Prüfe ob ein Wort im Satzkontext Sinn ergibt
export function contextCorrect(text: string): string {
  const words = text.split(/\s+/);
  const corrected: string[] = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word.length < 2) {
      corrected.push(word);
      continue;
    }
    
    // Prüfe ob das Wort im Wörterbuch ist
    if (GERMAN_DICTIONARY.has(word.toLowerCase())) {
      corrected.push(word);
      continue;
    }
    
    // Versuche Korrektur
    const closeWord = findClosestWord(word, 2);
    if (closeWord) {
      if (word[0] === word[0].toUpperCase()) {
        corrected.push(closeWord.charAt(0).toUpperCase() + closeWord.slice(1));
      } else {
        corrected.push(closeWord);
      }
    } else {
      corrected.push(word);
    }
  }
  
  return corrected.join(' ');
}
