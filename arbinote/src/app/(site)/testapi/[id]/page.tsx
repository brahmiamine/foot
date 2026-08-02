import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTunisiaFixtureDetail } from '@/lib/apiFootball'
import FixtureDetailClient from '@/components/FixtureDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const detail = await getTunisiaFixtureDetail(id)
  if (!detail) return { title: 'Match introuvable | ARBINOTE' }

  const { home, away } = detail.fixture.teams
  return { title: `${home.name} - ${away.name} | Ligue 1 Tunisie | ARBINOTE` }
}

export default async function FixtureDetailPage({ params }: PageProps) {
  const { id } = await params
  const detail = await getTunisiaFixtureDetail(id)

  if (!detail) notFound()

  return (
    <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 py-4 sm:py-10 space-y-6">
      <Link href="/testapi" className="text-sm text-blue-600 hover:underline">
        ← Retour au suivi Ligue 1 Tunisie
      </Link>

      <FixtureDetailClient fixture={detail.fixture} events={detail.events} lineups={detail.lineups} />
    </div>
  )
}
