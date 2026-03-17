import { describe, it, expect, vi, beforeEach } from 'vitest'
import { publishEvent, deleteEvent } from '../../src/publisher/relay-publisher.js'
import type { VerifiedEvent } from 'nostr-tools/pure'

// Mock nostr-tools/relay
vi.mock('nostr-tools/relay', () => {
  const mockPublish = vi.fn().mockResolvedValue(undefined)
  const mockClose = vi.fn()
  return {
    Relay: {
      connect: vi.fn().mockResolvedValue({
        publish: mockPublish,
        close: mockClose,
      }),
    },
  }
})

const { Relay } = await import('nostr-tools/relay')

function makeMockEvent(overrides: Partial<VerifiedEvent> = {}): VerifiedEvent {
  return {
    id: 'event-id-123',
    pubkey: 'pubkey-123',
    created_at: 1710000000,
    kind: 31402,
    tags: [],
    content: '{}',
    sig: 'sig-123',
    [Symbol.for('verified')]: true,
    ...overrides,
  } as VerifiedEvent
}

describe('publishEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('publishes to all relays', async () => {
    const event = makeMockEvent()
    const relays = ['wss://relay1.example.com', 'wss://relay2.example.com']

    const result = await publishEvent(event, relays)

    expect(Relay.connect).toHaveBeenCalledTimes(2)
    expect(result.accepted).toBe(2)
    expect(result.failed).toBe(0)
  })

  it('handles relay connection failures gracefully', async () => {
    vi.mocked(Relay.connect)
      .mockResolvedValueOnce({ publish: vi.fn(), close: vi.fn() } as never)
      .mockRejectedValueOnce(new Error('connection refused'))

    const event = makeMockEvent()
    const result = await publishEvent(event, ['wss://ok.com', 'wss://fail.com'])

    expect(result.accepted).toBe(1)
    expect(result.failed).toBe(1)
  })

  it('closes all relay connections after publishing', async () => {
    const mockClose = vi.fn()
    vi.mocked(Relay.connect).mockResolvedValue({
      publish: vi.fn(),
      close: mockClose,
    } as never)

    const event = makeMockEvent()
    await publishEvent(event, ['wss://relay.com'])

    expect(mockClose).toHaveBeenCalled()
  })
})

describe('deleteEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('publishes a kind 5 deletion event', async () => {
    const mockPublish = vi.fn()
    vi.mocked(Relay.connect).mockResolvedValue({
      publish: mockPublish,
      close: vi.fn(),
    } as never)

    await deleteEvent('secret-key-hex'.padEnd(64, '0'), 'event-to-delete', ['wss://relay.com'])

    expect(mockPublish).toHaveBeenCalledTimes(1)
    const publishedEvent = mockPublish.mock.calls[0][0]
    expect(publishedEvent.kind).toBe(5)
    expect(publishedEvent.tags).toContainEqual(['e', 'event-to-delete'])
  })
})
