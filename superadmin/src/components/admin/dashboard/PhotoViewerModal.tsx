'use client'

interface PhotoViewerModalProps {
  viewingPhoto: string
  onClose: () => void
}

export default function PhotoViewerModal({ viewingPhoto, onClose }: PhotoViewerModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
        <img
          src={viewingPhoto}
          alt="Photo arbitre"
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 bg-white text-gray-800 rounded-full p-2 hover:bg-gray-100 transition-colors shadow-lg"
          aria-label="Fermer"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
