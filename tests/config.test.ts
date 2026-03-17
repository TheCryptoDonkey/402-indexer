import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadConfig } from '../src/config.js'

describe('loadConfig', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('requires INDEXER_SECRET_KEY', () => {
    expect(() => loadConfig()).toThrow('INDEXER_SECRET_KEY')
  })

  it('loads secret key from env', () => {
    vi.stubEnv('INDEXER_SECRET_KEY', 'a'.repeat(64))
    const config = loadConfig()
    expect(config.secretKey).toBe('a'.repeat(64))
  })

  it('rejects invalid secret key length', () => {
    vi.stubEnv('INDEXER_SECRET_KEY', 'tooshort')
    expect(() => loadConfig()).toThrow('64-character hex')
  })

  it('loads GitHub token from env when present', () => {
    vi.stubEnv('INDEXER_SECRET_KEY', 'a'.repeat(64))
    vi.stubEnv('GITHUB_TOKEN', 'ghp_test123')
    const config = loadConfig()
    expect(config.githubToken).toBe('ghp_test123')
  })

  it('defaults probe interval to 24 hours', () => {
    vi.stubEnv('INDEXER_SECRET_KEY', 'a'.repeat(64))
    const config = loadConfig()
    expect(config.probeIntervalMs).toBe(24 * 60 * 60 * 1000)
  })

  it('defaults scan interval to 7 days', () => {
    vi.stubEnv('INDEXER_SECRET_KEY', 'a'.repeat(64))
    const config = loadConfig()
    expect(config.scanIntervalMs).toBe(7 * 24 * 60 * 60 * 1000)
  })
})
