'use client'

interface PhotoViewerModalProps {
  photoUrl: string
  onClose: () => void
}

export default function PhotoViewerModal({ photoUrl, onClose }: PhotoViewerModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl font-bold"
      >
        ✕
      </button>
      <img
        src={photoUrl}
        alt="Photo en grand"
        className="max-w-[90vw] max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
