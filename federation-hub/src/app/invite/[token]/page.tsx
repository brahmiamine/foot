import AcceptInvitationForm from '@/components/AcceptInvitationForm'
import { getInvitationPreview, ROLE_LABELS } from '@/lib/staffInvitations'

export const dynamic = 'force-dynamic'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const preview = await getInvitationPreview(token)

  return (
    <div className="auth-full-page-content min-vh-100 d-flex align-items-center justify-content-center py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6 col-xl-5">
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                {!preview ? (
                  <div className="alert alert-danger mb-0">
                    Ce lien d&apos;invitation est invalide ou a expiré. Contactez la personne qui vous l&apos;a envoyé
                    pour en obtenir un nouveau.
                  </div>
                ) : (
                  <>
                    <h1 className="h4 mb-1">Rejoindre {preview.scopeName}</h1>
                    <p className="text-muted mb-4">
                      {preview.name} · {preview.email} · rôle {ROLE_LABELS[preview.role] ?? preview.role}
                    </p>
                    <AcceptInvitationForm token={token} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
