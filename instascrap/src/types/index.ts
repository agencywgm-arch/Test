export interface AccountProfile {
  username: string
  fullName: string
  followers: number
  following: number
  posts: number
  engagement: number
  bio: string
  verified: boolean
  isPrivate: boolean
  avatar: string
  email: string | null
  website: string | null
  category: string | null
  location: string | null
}

export interface UserSettings {
  id: string
  user_id: string
  ig_session: string
  rapidapi_key: string
  pb_key: string
  created_at: string
}

export interface Campaign {
  id: string
  user_id: string
  created_at: string
  name: string
  message_template: string
  daily_limit: number
  targets: AccountProfile[]
  pb_container_id: string | null
  status: string
}

export interface ScrapeResult {
  id: string
  user_id: string
  created_at: string
  query: string
  accounts: AccountProfile[]
}
