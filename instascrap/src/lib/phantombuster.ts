import { AccountProfile } from '@/types'

const PB_AGENT_ID = '2498171544132422'

export async function launchAgent(params: {
  igSession: string
  targets: AccountProfile[]
  messageTemplate: string
  dailyLimit: number
}) {
  const res = await fetch('https://api.phantombuster.com/api/v2/agents/launch', {
    method: 'POST',
    headers: {
      'X-Phantombuster-Key': process.env.PHANTOMBUSTER_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: PB_AGENT_ID,
      argument: JSON.stringify({
        sessionCookie: params.igSession,
        usernames: params.targets.map(t => `https://www.instagram.com/${t.username}/`),
        message: params.messageTemplate,
        numberOfAddsPerLaunch: params.dailyLimit,
        delay: 30,
      }),
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Phantombuster launch error ${res.status}: ${text}`)
  }

  return res.json() as Promise<{ containerId: string }>
}

export async function getAgentStatus(containerId: string) {
  const res = await fetch(
    `https://api.phantombuster.com/api/v2/containers/fetch-output?id=${containerId}`,
    {
      headers: {
        'X-Phantombuster-Key': process.env.PHANTOMBUSTER_KEY!,
      },
    }
  )

  if (!res.ok) throw new Error(`Phantombuster status error: ${res.status}`)

  return res.json()
}
