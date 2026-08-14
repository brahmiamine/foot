'use client'

interface LogoViewerModalProps {
  logoUrl: string
  onClose: () => void
}

export default function LogoViewerModal({ logoUrl, onClose }: LogoViewerModalProps) {
  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" onClick={onClose}>
        <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
          <div className="modal-content bg-transparent border-0">
            <div className="modal-header border-0 pb-0">
              <button type="button" onClick={onClose} className="btn-close btn-close-white ms-auto" aria-label="Fermer" />
            </div>
            <div className="modal-body text-center pt-0">
              <img
                src={logoUrl}
                alt="Logo"
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
