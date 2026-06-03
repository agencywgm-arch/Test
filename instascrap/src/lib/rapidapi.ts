import { AccountProfile } from '@/types'

const RAPIDAPI_HOST = 'instagram-scraper-api2.p.rapidapi.com'

export async function scrapeHashtag(hashtag: string): Promise<string[]> {
  const res = await fetch(
    `https://${RAPIDAPI_HOST}/v1/hashtag?hashtag=${encodeURIComponent(hashtag)}`,
    {
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY!,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
    }
  )

  if (!res.ok) throw new Error(`RapidAPI hashtag error: ${res.status}`)

  const data = await res.json()
  const items: unknown[] = data?.data?.items ?? data?.items ?? []
  const usernames = new Set<string>()

  for (const item of items) {
    const record = item as Record<string, unknown>
    const user = (record?.user ?? record?.owner) as Record<string, unknown> | undefined
    const username = user?.username as string | undefined
    if (username) usernames.add(username)
  }

  return Array.from(usernames)
}

export async function scrapeUser(username: string): Promise<AccountProfile | null> {
  const res = await fetch(
    `https://${RAPIDAPI_HOST}/v1/info?username_or_id_or_url=${encodeURIComponent(username)}`,
    {
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY!,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
    }
  )

  if (!res.ok) return null

  const raw = await res.json()
  return normalizeProfile(raw)
}

export function normalizeProfile(raw: unknown): AccountProfile {
  const data = (raw as Record<string, unknown>)?.data ?? raw
  const u = data as Record<string, unknown>

  const bio = (u?.biography ?? u?.bio ?? '') as string
  const emailMatch = bio.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)

  const followers = (u?.follower_count ?? u?.followers ?? 0) as number
  const mediaCount = (u?.media_count ?? u?.posts ?? 0) as number
  const totalInteractions = (u?.total_interactions ?? 0) as number
  const engagement =
    followers > 0 && totalInteractions > 0
      ? parseFloat(((totalInteractions / followers) * 100).toFixed(2))
      : 0

  return {
    username: (u?.username ?? '') as string,
    fullName: (u?.full_name ?? u?.fullName ?? '') as string,
    followers,
    following: (u?.following_count ?? u?.following ?? 0) as number,
    posts: mediaCount,
    engagement,
    bio,
    verified: (u?.is_verified ?? u?.verified ?? false) as boolean,
    isPrivate: (u?.is_private ?? u?.private ?? false) as boolean,
    avatar: (u?.profile_pic_url ?? u?.avatar ?? '') as string,
    email: emailMatch ? emailMatch[0] : null,
    website: (u?.external_url ?? u?.website ?? null) as string | null,
    category: (u?.category ?? null) as string | null,
    location: null,
  }
}
