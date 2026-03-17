
const USER_AGENT = '402-indexer/1.0 (+https://402.pub)'

export interface RegistryService {
  url: string
  name?: string
  source: 'satring' | 'awesome-l402' | 'x402-ecosystem'
}

/** Hosts to ignore when extracting service URLs from markdown/HTML */
const IGNORED_HOSTS = new Set([
  'github.com', 'www.github.com', 'npmjs.com', 'www.npmjs.com',
  'docs.lightning.engineering', 'lightning.engineering',
  'twitter.com', 'x.com', 'youtube.com', 'medium.com',
  'en.wikipedia.org', 'developer.mozilla.org',
])

/** Fetch L402 services from Satring's open API */
export async function fetchSatringServices(): Promise<RegistryService[]> {
  const services: RegistryService[] = []
  let page = 1
  const pageSize = 20

  while (true) {
    const response = await fetch(
      `https://satring.com/api/v1/services?page=${page}&page_size=${pageSize}`,
      { headers: { 'User-Agent': USER_AGENT } },
    )
    if (!response.ok) break

    const data = await response.json() as {
      services?: { url?: string; name?: string }[]
      total?: number
    }
    if (!data.services?.length) break

    for (const svc of data.services) {
      if (svc.url) {
        services.push({ url: svc.url, name: svc.name, source: 'satring' })
      }
    }

    if (services.length >= (data.total ?? 0) || data.services.length < pageSize) break
    page++
  }

  return services
}

/** Parse awesome-L402 README for service URLs */
export async function fetchAwesomeL402(): Promise<RegistryService[]> {
  const response = await fetch(
    'https://raw.githubusercontent.com/Fewsats/awesome-L402/main/README.md',
    { headers: { 'User-Agent': USER_AGENT } },
  )
  if (!response.ok) return []

  const content = await response.text()
  return extractServiceUrls(content, 'awesome-l402')
}

/** Fetch x402.org ecosystem page and extract service URLs */
export async function fetchX402Ecosystem(): Promise<RegistryService[]> {
  const response = await fetch(
    'https://www.x402.org/ecosystem',
    { headers: { 'User-Agent': USER_AGENT } },
  )
  if (!response.ok) return []

  const html = await response.text()
  return extractServiceUrls(html, 'x402-ecosystem')
}

/** Extract URLs from text content, filtering out non-service hosts */
export function extractServiceUrls(
  content: string,
  source: RegistryService['source'],
): RegistryService[] {
  const urlRegex = /https?:\/\/[^\s"'<>\])(,]+/g
  const matches = content.match(urlRegex) ?? []

  return matches
    .filter(url => {
      try {
        const hostname = new URL(url).hostname
        return !IGNORED_HOSTS.has(hostname) && !hostname.startsWith('docs.')
      } catch {
        return false
      }
    })
    .map(url => ({ url, source }))
}

/** Run all registry scans and return deduplicated URLs */
export async function runRegistryScan(): Promise<string[]> {
  const allUrls = new Set<string>()

  console.log('[registry-scanner] fetching from Satring...')
  try {
    const satring = await fetchSatringServices()
    for (const svc of satring) allUrls.add(svc.url)
    console.log(`[registry-scanner] Satring: ${satring.length} services`)
  } catch (err) {
    console.error('[registry-scanner] Satring failed:', err)
  }

  console.log('[registry-scanner] fetching awesome-L402...')
  try {
    const awesome = await fetchAwesomeL402()
    for (const svc of awesome) allUrls.add(svc.url)
    console.log(`[registry-scanner] awesome-L402: ${awesome.length} URLs`)
  } catch (err) {
    console.error('[registry-scanner] awesome-L402 failed:', err)
  }

  console.log('[registry-scanner] fetching x402.org ecosystem...')
  try {
    const x402 = await fetchX402Ecosystem()
    for (const svc of x402) allUrls.add(svc.url)
    console.log(`[registry-scanner] x402-ecosystem: ${x402.length} URLs`)
  } catch (err) {
    console.error('[registry-scanner] x402-ecosystem failed:', err)
  }

  console.log(`[registry-scanner] total unique URLs: ${allUrls.size}`)
  return [...allUrls]
}
