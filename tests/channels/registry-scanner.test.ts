import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchSatringServices,
  fetchAwesomeL402,
  fetchX402Ecosystem,
  extractServiceUrls,
  runRegistryScan,
} from '../../src/channels/registry-scanner.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('extractServiceUrls', () => {
  it('extracts https URLs from content', () => {
    const content = `
Check out https://api.example.com/v1 for the API.
Also https://service.io/pay is available.
    `
    const results = extractServiceUrls(content, 'awesome-l402')
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ url: 'https://api.example.com/v1', source: 'awesome-l402' })
    expect(results[1]).toEqual({ url: 'https://service.io/pay', source: 'awesome-l402' })
  })

  it('filters out GitHub, npm, and documentation hosts', () => {
    const content = `
- https://github.com/user/repo
- https://www.npmjs.com/package/foo
- https://docs.lightning.engineering/guide
- https://docs.example.com/api
- https://twitter.com/user
- https://api.real-service.com/v1
    `
    const results = extractServiceUrls(content, 'awesome-l402')
    expect(results).toHaveLength(1)
    expect(results[0].url).toBe('https://api.real-service.com/v1')
  })

  it('filters out hosts starting with docs.', () => {
    const content = 'See https://docs.myapp.io/reference for docs'
    const results = extractServiceUrls(content, 'x402-ecosystem')
    expect(results).toHaveLength(0)
  })

  it('returns empty array for content with no URLs', () => {
    expect(extractServiceUrls('No links here', 'awesome-l402')).toEqual([])
  })

  it('handles malformed URLs gracefully', () => {
    const content = 'Visit https://valid.com and https://[invalid for more'
    const results = extractServiceUrls(content, 'awesome-l402')
    expect(results).toHaveLength(1)
    expect(results[0].url).toBe('https://valid.com')
  })
})

describe('fetchSatringServices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches a single page of services', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        services: [
          { url: 'https://api.one.com', name: 'Service One' },
          { url: 'https://api.two.com', name: 'Service Two' },
        ],
        total: 2,
      }),
    })

    const services = await fetchSatringServices()
    expect(services).toHaveLength(2)
    expect(services[0]).toEqual({ url: 'https://api.one.com', name: 'Service One', source: 'satring' })
    expect(services[1]).toEqual({ url: 'https://api.two.com', name: 'Service Two', source: 'satring' })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('paginates through multiple pages', async () => {
    // Page 1: 20 services (full page)
    const page1Services = Array.from({ length: 20 }, (_, i) => ({
      url: `https://api.svc${i}.com`,
      name: `Service ${i}`,
    }))

    // Page 2: 5 services (partial page — last)
    const page2Services = Array.from({ length: 5 }, (_, i) => ({
      url: `https://api.svc${20 + i}.com`,
      name: `Service ${20 + i}`,
    }))

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ services: page1Services, total: 25 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ services: page2Services, total: 25 }),
      })

    const services = await fetchSatringServices()
    expect(services).toHaveLength(25)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenNthCalledWith(1,
      'https://satring.com/api/v1/services?page=1&page_size=20',
      expect.objectContaining({ headers: expect.any(Object) }),
    )
    expect(mockFetch).toHaveBeenNthCalledWith(2,
      'https://satring.com/api/v1/services?page=2&page_size=20',
      expect.objectContaining({ headers: expect.any(Object) }),
    )
  })

  it('skips entries without a URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        services: [
          { url: 'https://api.good.com', name: 'Good' },
          { name: 'No URL' },
          { url: '', name: 'Empty URL' },
        ],
        total: 3,
      }),
    })

    const services = await fetchSatringServices()
    expect(services).toHaveLength(1)
    expect(services[0].url).toBe('https://api.good.com')
  })

  it('returns empty array on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    const services = await fetchSatringServices()
    expect(services).toEqual([])
  })
})

describe('fetchAwesomeL402', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches README and extracts service URLs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(`
# awesome-L402

## Services
- [My API](https://api.l402service.com) — an L402 service
- [Source](https://github.com/user/repo) — GitHub repo
      `),
    })

    const services = await fetchAwesomeL402()
    expect(services).toHaveLength(1)
    expect(services[0]).toEqual({
      url: 'https://api.l402service.com',
      source: 'awesome-l402',
    })
  })

  it('returns empty array on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    const services = await fetchAwesomeL402()
    expect(services).toEqual([])
  })
})

describe('fetchX402Ecosystem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches HTML and extracts service URLs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(`
<html>
<body>
  <a href="https://api.x402service.com/pay">Pay API</a>
  <a href="https://github.com/coinbase/x402">Source</a>
  <a href="https://docs.x402.org/guide">Docs</a>
</body>
</html>
      `),
    })

    const services = await fetchX402Ecosystem()
    expect(services).toHaveLength(1)
    expect(services[0]).toEqual({
      url: 'https://api.x402service.com/pay',
      source: 'x402-ecosystem',
    })
  })

  it('returns empty array on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 })
    const services = await fetchX402Ecosystem()
    expect(services).toEqual([])
  })
})

describe('runRegistryScan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('aggregates and deduplicates URLs from all sources', async () => {
    // Satring response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        services: [
          { url: 'https://api.shared.com', name: 'Shared' },
          { url: 'https://api.satring-only.com', name: 'Satring Only' },
        ],
        total: 2,
      }),
    })

    // awesome-L402 response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(
        'Check https://api.shared.com and https://api.awesome-only.com',
      ),
    })

    // x402 ecosystem response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(
        '<a href="https://api.x402-only.com">X402</a>',
      ),
    })

    const urls = await runRegistryScan()
    expect(urls).toHaveLength(4)
    expect(urls).toContain('https://api.shared.com')
    expect(urls).toContain('https://api.satring-only.com')
    expect(urls).toContain('https://api.awesome-only.com')
    expect(urls).toContain('https://api.x402-only.com')
  })

  it('continues when individual sources fail', async () => {
    // Satring fails
    mockFetch.mockRejectedValueOnce(new Error('network error'))

    // awesome-L402 succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('Visit https://api.still-works.com'),
    })

    // x402 fails
    mockFetch.mockRejectedValueOnce(new Error('timeout'))

    const urls = await runRegistryScan()
    expect(urls).toHaveLength(1)
    expect(urls).toContain('https://api.still-works.com')
  })

  it('returns empty array when all sources fail', async () => {
    mockFetch.mockRejectedValue(new Error('all down'))
    const urls = await runRegistryScan()
    expect(urls).toEqual([])
  })
})
