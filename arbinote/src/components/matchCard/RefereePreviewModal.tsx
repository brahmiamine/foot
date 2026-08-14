import Image from "next/image";
import { Match } from "@/types";

interface RefereePreviewModalProps {
  arbitre: NonNullable<Match["arbitre"]> & { photo_url: string };
  refereeName: string | null;
  onClose: () => void;
}

export function RefereePreviewModal({ arbitre, refereeName, onClose }: RefereePreviewModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close preview"
          className="absolute -top-3 -right-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
        >
          <span className="text-lg leading-none">&times;</span>
        </button>
        <div className="relative w-full h-[60vh] max-h-[80vh] rounded-xl overflow-hidden bg-black/20">
          <Image src={arbitre.photo_url} alt={refereeName ?? arbitre.nom} fill sizes="100vw" className="object-contain bg-black" />
        </div>
        <p className="mt-3 text-center text-sm text-gray-600 dark:text-gray-300">{refereeName ?? arbitre.nom}</p>
      </div>
    </div>
  );
}
