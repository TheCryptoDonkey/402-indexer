import { Relay } from 'nostr-tools/relay'
import { finalizeEvent } from 'nostr-tools/pure'
import type { VerifiedEvent } from 'nostr-tools/pure'
import { KIND_DELETION } from '../types.js'
import { hexToBytes } from '../utils.js'

const RELAY_TIMEOUT_MS = 10_000

export interface PublishResult {
  accepted: number
  failed: number
}

/**
 * Publish a signed event to a set of relays.
 * Connects, publishes, and closes each relay. Failures are non-fatal.
 */
export async function publishEvent(
  event: VerifiedEvent,
  relayUrls: string[],
): Promise<PublishResult> {
  let accepted = 0
  let failed = 0

  const results = await Promise.allSettled(
    relayUrls.map(async (url) => {
      const relay = await Promise.race([
        Relay.connect(url),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`timeout: ${url}`)), RELAY_TIMEOUT_MS),
        ),
      ])

      try {
        await relay.publish(event)
        accepted++
      } finally {
        relay.close()
      }
    }),
  )

  for (const r of results) {
    if (r.status === 'rejected') failed++
  }

  return { accepted, failed }
}

/**
 * Publish a NIP-09 deletion event to remove a previously published event.
 */
export async function deleteEvent(
  secretKeyHex: string,
  eventIdToDelete: string,
  relayUrls: string[],
): Promise<PublishResult> {
  const skBytes = hexToBytes(secretKeyHex)
  try {
    const deletion = finalizeEvent({
      kind: KIND_DELETION,
      tags: [['e', eventIdToDelete]],
      content: 'Service now self-announced by operator',
      created_at: Math.floor(Date.now() / 1000),
    }, skBytes)

    return publishEvent(deletion, relayUrls)
  } finally {
    skBytes.fill(0)
  }
}
