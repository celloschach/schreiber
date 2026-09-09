import { ConvertedText } from '../types';

interface ConvertedTextsProps {
  convertedTexts: ConvertedText[];
  onDelete: (id: string) => void;
}

export default function ConvertedTexts({ convertedTexts, onDelete }: ConvertedTextsProps) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
          <i className="fas fa-file-alt text-white text-sm"></i>
        </span>
        Konvertierte Texte
      </h2>

      {convertedTexts.length === 0 ? (
        <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
            <i className="fas fa-pen text-3xl text-green-500"></i>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Noch keine konvertierten Texte</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Gehe zu einem Profil und konvertiere einen Text in deine Handschrift.
            Der Text wird dann hier als Bild gespeichert.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {convertedTexts.map((item) => (
            <div
              key={item.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden group hover:shadow-xl transition-all"
            >
              {/* Header */}
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                    {item.profileName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={item.renderedImage}
                    download={`handschrift-${item.id}.png`}
                    className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 transition-opacity p-1"
                    title="Bild herunterladen"
                  >
                    <i className="fas fa-download text-sm"></i>
                  </a>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-1"
                  >
                    <i className="fas fa-trash text-sm"></i>
                  </button>
                </div>
              </div>

              {/* Original Text */}
              <div className="px-5 py-3 border-b border-gray-50">
                <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Original-Text</p>
                <p className="text-sm text-gray-600 leading-relaxed">{item.originalText}</p>
              </div>

              {/* Rendered Image */}
              <div className="px-5 py-4 bg-gradient-to-br from-amber-50/50 to-orange-50/50">
                <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Deine Handschrift</p>
                <img
                  src={item.renderedImage}
                  alt="Handschrift"
                  className="w-full rounded-lg border border-amber-100"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
