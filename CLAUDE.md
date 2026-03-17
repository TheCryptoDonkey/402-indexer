# CLAUDE.md — 402-indexer

Nostr-native crawler that discovers L402 and x402 paid APIs and publishes kind 31402 events.

## Commands

```bash
pnpm build        # Build
pnpm test         # Run all tests
pnpm lint         # Type check
pnpm start        # Run the indexer
```

## Structure

```
src/
  types.ts                     # Core types
  utils.ts                     # Shared utilities (hexToBytes)
  event-parser.ts              # Parse kind 31402 → DiscoveredService
  channels/
    active-prober.ts           # HTTP probe for 402 headers
    nostr-aggregator.ts        # Subscribe to kind 31402 across relays
    github-scanner.ts          # GitHub API search
    npm-scanner.ts             # npm dependents scan
    community-listener.ts      # Kind 1402 suggestion listener
  publisher/
    event-builder.ts           # Build kind 31402 from DiscoveredService
    relay-publisher.ts         # Sign + publish + NIP-09 delete
  health/
    state-store.ts             # JSON file persistence for health state
    health-checker.ts          # Daily endpoint verification
    lifecycle.ts               # Stale/unreachable/delist transitions
  orchestrator.ts              # CLI entry point, starts all channels
  config.ts                    # Env vars + config file loading
```

## Conventions

- **British English** — colour, initialise, behaviour, licence
- **Git:** commit messages use `type: description` format
- **Git:** Do NOT include `Co-Authored-By` lines
- **TDD** — write failing test first, then implement
