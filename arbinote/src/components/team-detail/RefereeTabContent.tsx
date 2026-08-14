import { Locale } from '@/lib/i18n'
import { RefereeStat, TopMatch, TFunction } from './types'
import RefereeRankingList from './RefereeRankingList'
import TopMatchesSection from './TopMatchesSection'

interface RefereeTabContentProps {
  bestReferees: RefereeStat[]
  worstReferees: RefereeStat[]
  topMatchesArbitre: TopMatch[]
  topMatchesVar: TopMatch[]
  topMatchesAssistant: TopMatch[]
  t: TFunction
  locale: Locale
}

export default function RefereeTabContent({
  bestReferees,
  worstReferees,
  topMatchesArbitre,
  topMatchesVar,
  topMatchesAssistant,
  t,
  locale,
}: RefereeTabContentProps) {
  return (
    <div className="space-y-8">
      {/* Section Meilleur arbitre */}
      <RefereeRankingList
        referees={bestReferees}
        titleKey="team.referee.best"
        noteColorClass="text-blue-600 dark:text-blue-400"
        t={t}
        locale={locale}
      />

      {/* Section Mauvais arbitre */}
      <RefereeRankingList
        referees={worstReferees}
        titleKey="team.referee.worst"
        noteColorClass="text-red-600 dark:text-red-400"
        t={t}
        locale={locale}
      />

      {/* Section Top 5 matchs */}
      <TopMatchesSection
        topMatchesArbitre={topMatchesArbitre}
        topMatchesVar={topMatchesVar}
        topMatchesAssistant={topMatchesAssistant}
        t={t}
        locale={locale}
      />
    </div>
  )
}
