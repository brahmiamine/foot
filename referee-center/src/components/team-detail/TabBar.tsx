import { TFunction } from './types'

interface TabBarProps {
  activeTab: 'referee' | 'matches'
  onTabChange: (tab: 'referee' | 'matches') => void
  t: TFunction
}

export default function TabBar({ activeTab, onTabChange, t }: TabBarProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="flex -mb-px">
        <button
          onClick={() => onTabChange('referee')}
          className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors flex-1 sm:flex-none ${
            activeTab === 'referee'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          {t('team.tabs.referee')}
        </button>
        <button
          onClick={() => onTabChange('matches')}
          className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors flex-1 sm:flex-none ${
            activeTab === 'matches'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          {t('team.tabs.matches')}
        </button>
      </nav>
    </div>
  )
}
