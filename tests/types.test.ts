import { describe, it, expect } from 'vitest'
import {
  type DiscoveredService,
  type ProbeResult,
  type HealthEntry,
  type EventSource,
  isValidEventSource,
  isValidStatus,
} from '../src/types.js'

describe('type guards', () => {
  describe('isValidEventSource', () => {
    it('accepts valid sources', () => {
      expect(isValidEventSource('crawl')).toBe(true)
      expect(isValidEventSource('github')).toBe(true)
      expect(isValidEventSource('submit')).toBe(true)
      expect(isValidEventSource('self')).toBe(true)
    })

    it('rejects invalid sources', () => {
      expect(isValidEventSource('unknown')).toBe(false)
      expect(isValidEventSource('')).toBe(false)
    })
  })

  describe('isValidStatus', () => {
    it('accepts valid statuses', () => {
      expect(isValidStatus('active')).toBe(true)
      expect(isValidStatus('stale')).toBe(true)
      expect(isValidStatus('unreachable')).toBe(true)
    })

    it('rejects invalid statuses', () => {
      expect(isValidStatus('deleted')).toBe(false)
      expect(isValidStatus('')).toBe(false)
    })
  })
})
