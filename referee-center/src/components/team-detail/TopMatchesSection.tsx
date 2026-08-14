import { Locale } from '@/lib/i18n'
import { TopMatch, TFunction } from './types'
import TopMatchArbitreList from './TopMatchArbitreList'
import TopMatchSimpleList from './TopMatchSimpleList'

interface TopMatchesSectionProps {
  topMatchesArbitre: TopMatch[]
  topMatchesVar: TopMatch[]
  topMatchesAssistant: TopMatch[]
  t: TFunction
  locale: Locale
}

export default function TopMatchesSection({
  topMatchesArbitre,
  topMatchesVar,
  topMatchesAssistant,
  t,
  locale,
}: TopMatchesSectionProps) {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-900 dark:text-white">
        {t('team.topMatches.title')}
      </h2>

      {/* Top 5 par note arbitre */}
      <TopMatchArbitreList items={topMatchesArbitre} t={t} locale={locale} />

      {/* Top 5 par VAR */}
      <TopMatchSimpleList
        items={topMatchesVar}
        titleKey="team.topMatches.var"
        noteColorClass="text-green-600 dark:text-green-400"
        containerClassName="mb-4 sm:mb-6"
        t={t}
        locale={locale}
      />

      {/* Top 5 par assistants */}
      <TopMatchSimpleList
        items={topMatchesAssistant}
        titleKey="team.topMatches.assistant"
        noteColorClass="text-purple-600 dark:text-purple-400"
        t={t}
        locale={locale}
      />

      {topMatchesArbitre.length === 0 && topMatchesVar.length === 0 && topMatchesAssistant.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">{t('team.topMatches.empty')}</p>
      )}
    </div>
  )
}
