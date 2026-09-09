import { ConvertedText } from '../types';

interface Props {
  texts: ConvertedText[];
  onDelete: (id: string) => void;
}

export default function ConvertedTexts({ texts, onDelete }: Props) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-5">Konvertierte Texte</h2>

      {texts.length === 0 ? (
        <div className="text-center py-16 bg-white/80 rounded-2xl shadow-lg border border-gray-100">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
            <i className="fas fa-file-alt text-3xl text-green-500"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Noch keine Texte</h3>
          <p className="text-gray-500">Gehe zu einem Profil und wandle einen Text in Handschrift um.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {texts.map((item) => (
            <div
              key={item.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden group hover:shadow-xl transition-all"
            >
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                    {item.profileName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString('de-DE')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={item.renderedImage}
                    download={`handschrift-${item.id}.png`}
                    className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 transition-opacity p-1"
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

              <div className="px-5 py-3 border-b border-gray-50">
                <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Original</p>
                <p className="text-sm text-gray-600">{item.originalText}</p>
              </div>

              <div className="px-5 py-4 bg-amber-50/30">
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Handschrift</p>
                <img src={item.renderedImage} alt="Handschrift" className="w-full rounded-lg border border-amber-100" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
