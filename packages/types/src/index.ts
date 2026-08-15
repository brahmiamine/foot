export interface ClubBranding {
  name: string
  shortName: string | null
  logoUrl: string | null
  faviconUrl: string | null
  icon192Url: string | null
  icon512Url: string | null
  primaryColor: string
  secondaryColor: string
  accentColor: string
  font: string | null
}

export interface PaginatedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface SelectOption<T extends string = string> {
  value: T
  label: string
}
