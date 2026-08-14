import { MetadataRoute } from 'next'
import { getDataSource } from '@/lib/db'
import { Arbitre, Match, Journee, Saison, Team } from '@/lib/entities'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dataSource = await getDataSource()
  
  // Pages statiques principales
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
      alternates: {
        languages: {
          fr: `${baseUrl}/fr`,
          en: `${baseUrl}/en`,
          ar: `${baseUrl}/ar`,
        },
      },
    },
    {
      url: `${baseUrl}/classement`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: {
        languages: {
          fr: `${baseUrl}/fr/classement`,
          en: `${baseUrl}/en/classement`,
          ar: `${baseUrl}/ar/classement`,
        },
      },
    },
    {
      url: `${baseUrl}/statistic`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
      alternates: {
        languages: {
          fr: `${baseUrl}/fr/statistic`,
          en: `${baseUrl}/en/statistic`,
          ar: `${baseUrl}/ar/statistic`,
        },
      },
    },
    {
      url: `${baseUrl}/transparence`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: {
        languages: {
          fr: `${baseUrl}/fr/transparence`,
          en: `${baseUrl}/en/transparence`,
          ar: `${baseUrl}/ar/transparence`,
        },
      },
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
      alternates: {
        languages: {
          fr: `${baseUrl}/fr/contact`,
          en: `${baseUrl}/en/contact`,
          ar: `${baseUrl}/ar/contact`,
        },
      },
    },
  ]

  try {
    // Récupérer les arbitres
    const arbitreRepo = dataSource.getRepository<Arbitre>('arbitres')
    const arbitres = await arbitreRepo.find({
      select: ['id'],
      take: 1000, // Limiter pour éviter les sitemaps trop volumineux
    })

    const arbitrePages: MetadataRoute.Sitemap = arbitres.map((arbitre) => ({
      url: `${baseUrl}/arbitres/${arbitre.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
      alternates: {
        languages: {
          fr: `${baseUrl}/fr/arbitres/${arbitre.id}`,
          en: `${baseUrl}/en/arbitres/${arbitre.id}`,
          ar: `${baseUrl}/ar/arbitres/${arbitre.id}`,
        },
      },
    }))

    // Récupérer les matchs récents (derniers 6 mois)
    const matchRepo = dataSource.getRepository<Match>('matches')
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const matches = await matchRepo
      .createQueryBuilder('match')
      .select(['match.id'])
      .where('match.date >= :sixMonthsAgo', { sixMonthsAgo })
      .orWhere('match.date IS NULL')
      .take(1000)
      .getMany()

    const matchPages: MetadataRoute.Sitemap = matches.map((match) => ({
      url: `${baseUrl}/matches/${match.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
      alternates: {
        languages: {
          fr: `${baseUrl}/fr/matches/${match.id}`,
          en: `${baseUrl}/en/matches/${match.id}`,
          ar: `${baseUrl}/ar/matches/${match.id}`,
        },
      },
    }))

    // Récupérer les journées
    const journeeRepo = dataSource.getRepository<Journee>('journees')
    const journees = await journeeRepo.find({
      select: ['id'],
      take: 500,
    })

    const journeePages: MetadataRoute.Sitemap = journees.map((journee) => ({
      url: `${baseUrl}/journees/${journee.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
      alternates: {
        languages: {
          fr: `${baseUrl}/fr/journees/${journee.id}`,
          en: `${baseUrl}/en/journees/${journee.id}`,
          ar: `${baseUrl}/ar/journees/${journee.id}`,
        },
      },
    }))

    // Récupérer les équipes
    const teamRepo = dataSource.getRepository<Team>('teams')
    const teams = await teamRepo.find({
      select: ['id'],
      take: 1000, // Limiter pour éviter les sitemaps trop volumineux
    })

    const teamPages: MetadataRoute.Sitemap = teams.map((team) => ({
      url: `${baseUrl}/teams/${team.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
      alternates: {
        languages: {
          fr: `${baseUrl}/fr/teams/${team.id}`,
          en: `${baseUrl}/en/teams/${team.id}`,
          ar: `${baseUrl}/ar/teams/${team.id}`,
        },
      },
    }))

    return [...staticPages, ...arbitrePages, ...matchPages, ...journeePages, ...teamPages]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    // En cas d'erreur, retourner au moins les pages statiques
    return staticPages
  }
}

