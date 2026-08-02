'use client'

import { useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import TeamInfoSection from './team-detail/TeamInfoSection'
import TabBar from './team-detail/TabBar'
import RefereeTabContent from './team-detail/RefereeTabContent'
import MatchesTabContent from './team-detail/MatchesTabContent'
import { useTeamDetail } from './team-detail/useTeamDetail'
import { TeamDetailClientProps } from './team-detail/types'

export default function TeamDetailClient({
  team,
  matches,
  refereeStats,
  topMatchesArbitre,
  topMatchesVar,
  topMatchesAssistant,
  criteresDefs,
  matchRatings = {},
}: TeamDetailClientProps) {
  const { t, locale } = useTranslations()
  const [activeTab, setActiveTab] = useState<'referee' | 'matches'>('referee')

  const {
    displayName,
    displayCity,
    displayStadium,
    bestReferees,
    worstReferees,
    matchesByJournee,
  } = useTeamDetail(team, matches, refereeStats, locale)

  return (
    <article className="max-w-6xl mx-auto" itemScope itemType="https://schema.org/SportsTeam">
      {/* Section Équipe Info */}
      <TeamInfoSection
        team={team}
        displayName={displayName}
        displayCity={displayCity}
        displayStadium={displayStadium}
        t={t}
      />

      {/* TabBar */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg border border-gray-200 dark:border-gray-700 mb-6">
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} t={t} />

        <div className="p-3 sm:p-6">
          {activeTab === 'referee' && (
            <RefereeTabContent
              bestReferees={bestReferees}
              worstReferees={worstReferees}
              topMatchesArbitre={topMatchesArbitre}
              topMatchesVar={topMatchesVar}
              topMatchesAssistant={topMatchesAssistant}
              t={t}
              locale={locale}
            />
          )}

          {activeTab === 'matches' && (
            <MatchesTabContent
              matchesByJournee={matchesByJournee}
              matchRatings={matchRatings}
              t={t}
              locale={locale}
            />
          )}
        </div>
      </section>
    </article>
  )
}
