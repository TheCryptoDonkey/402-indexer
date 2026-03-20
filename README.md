# 402-indexer

Nostr-native crawler that discovers L402 and x402 paid APIs and publishes [kind 31402](https://github.com/forgesworn/402-announce) events for decentralised service discovery.

## What it does

The indexer finds paid APIs across multiple channels and announces them on Nostr so clients like [402-mcp](https://github.com/forgesworn/402-mcp) and the [402.pub](https://402.pub) directory can discover them.

### Discovery channels

- **Active prober** — HTTP probe for `WWW-Authenticate: L402` and `402 Payment Required` headers
- **Nostr aggregator** — Subscribe to existing kind 31402 events across relays
- **GitHub scanner** — Search GitHub for repos using L402/x402 patterns
- **npm scanner** — Find packages depending on toll-booth, aperture, and other L402 libraries
- **Community listener** — Accept kind 1402 suggestion events from users

### Health monitoring

Discovered services are verified daily. Endpoints that become unreachable are marked stale and eventually delisted, keeping the directory accurate.

## Usage

```bash
# Install
npm install

# Configure (see config section below)
cp config/default.json config/local.json

# Build and run
npm run build
npm start
```

## Configuration

The indexer reads from `config/local.json` and environment variables:

- `NOSTR_NSEC` — Nostr secret key for signing kind 31402 events
- `RELAYS` — Comma-separated relay URLs

## Part of the 402 ecosystem

| Package | Purpose |
|---------|---------|
| [toll-booth](https://github.com/forgesworn/toll-booth) | L402 middleware — gate any API behind Lightning |
| [402-announce](https://github.com/forgesworn/402-announce) | Publish kind 31402 service announcements |
| [402-mcp](https://github.com/forgesworn/402-mcp) | AI agents discover, pay for, and consume 402 APIs |
| [402.pub](https://402.pub) | Live service directory |
| **402-indexer** | Crawl and index paid APIs (this repo) |

## Licence

MIT
