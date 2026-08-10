'use client'

import { useEffect } from 'react'

/**
 * Anciennement un formulaire login/mot de passe local. L'authentification se
 * fait maintenant exclusivement sur l'app `sso` (compte SUPERADMIN, table
 * `User` partagée) : ce composant se contente de rediriger vers son écran de
 * connexion, en conservant la page d'où l'on vient pour y revenir ensuite.
 * Props/nom inchangés pour que les ~8 pages qui l'utilisent n'aient rien à
 * modifier.
 */
export default function AdminLogin({ redirectTo }: { redirectTo?: string } = {}) {
  useEffect(() => {
    const ssoUrl = process.env.NEXT_PUBLIC_SSO_URL
    if (!ssoUrl) {
      console.error('NEXT_PUBLIC_SSO_URL is not set')
      return
    }

    const target = redirectTo ? new URL(redirectTo, window.location.origin).toString() : window.location.href
    const loginUrl = new URL('/login', ssoUrl)
    loginUrl.searchParams.set('redirect', target)
    window.location.href = loginUrl.toString()
  }, [redirectTo])

  return (
    <div className="max-w-md mx-auto text-center py-12">
      <p className="text-sm text-gray-500">Redirection vers la connexion…</p>
    </div>
  )
}
