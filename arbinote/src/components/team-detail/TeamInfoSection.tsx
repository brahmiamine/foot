import Image from 'next/image'
import { Team } from '@/types'
import { TFunction } from './types'

interface TeamInfoSectionProps {
  team: Team
  displayName: string
  displayCity: string | null
  displayStadium: string | null
  t: TFunction
}

export default function TeamInfoSection({ team, displayName, displayCity, displayStadium, t }: TeamInfoSectionProps) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200 dark:border-gray-700" itemScope itemType="https://schema.org/Organization">
      <div className="flex flex-col md:flex-row md:items-start gap-4 sm:gap-6">
        <div className="flex-shrink-0 mx-auto md:mx-0">
          {team.logo_url ? (
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border-4 border-gray-200 dark:border-gray-700 shadow-lg">
              <Image
                src={team.logo_url}
                alt={`Logo ${displayName}`}
                fill
                sizes="(max-width: 640px) 96px, 128px"
                className="object-contain"
              />
            </div>
          ) : (
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center text-3xl sm:text-4xl font-semibold border-4 border-blue-200 dark:border-blue-800 shadow-lg">
              {displayName
                .split(' ')
                .map((part: string) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 text-gray-900 dark:text-white" itemProp="name">{displayName}</h1>
          <div className="space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {displayCity && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">{t('team.city')}:</span>
                <span className="text-gray-700 dark:text-gray-300">{displayCity}</span>
              </div>
            )}
            {displayStadium && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="font-medium">{t('team.stadium')}:</span>
                <span className="text-gray-700 dark:text-gray-300">{displayStadium}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-medium">{t('team.type')}:</span>
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-md text-sm font-medium">
                {team.team_type === 'national' ? t('team.national') : t('team.club')}
              </span>
            </div>
            {team.sport && (
              <div className="flex items-center gap-2">
                <span className="font-medium">{t('team.sport')}:</span>
                <span className="text-gray-700 dark:text-gray-300">{t(`team.sport.${team.sport}`)}</span>
              </div>
            )}
            {team.age_category && (
              <div className="flex items-center gap-2">
                <span className="font-medium">{t('team.ageCategory')}:</span>
                <span className="text-gray-700 dark:text-gray-300">{t(`team.ageCategory.${team.age_category}`)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
