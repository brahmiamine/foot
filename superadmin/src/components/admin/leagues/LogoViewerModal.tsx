'use client'

interface LogoViewerModalProps {
  viewingLogo: string
  onClose: () => void
}

export default function LogoViewerModal({ viewingLogo, onClose }: LogoViewerModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh] p-4">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75"
        >
          ✕
        </button>
        <img
          src={viewingLogo}
          alt="Logo"
          className="max-w-full max-h-[90vh] object-contain"
        />
      </div>
    </div>
  )
}
