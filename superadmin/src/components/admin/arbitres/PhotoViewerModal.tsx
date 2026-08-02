'use client'

interface PhotoViewerModalProps {
  photoUrl: string
  onClose: () => void
}

export default function PhotoViewerModal({ photoUrl, onClose }: PhotoViewerModalProps) {
  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" onClick={onClose}>
        <div
          className="modal-dialog modal-dialog-centered modal-lg"
          role="document"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content bg-transparent border-0">
            <div className="modal-header border-0">
              <button
                type="button"
                onClick={onClose}
                className="btn-close btn-close-white ms-auto"
                aria-label="Fermer"
              />
            </div>
            <div className="modal-body text-center p-0">
              <img
                src={photoUrl}
                alt="Photo en grand"
                className="img-fluid"
                style={{ maxHeight: '80vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  )
}
