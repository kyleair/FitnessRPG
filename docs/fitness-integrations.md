# Fitness Integrations

**Status:** Discovery notes

## Initial integration target

Strava is the first example because it provides a familiar activity history and makes the import story concrete. The mockups should behave as though a connection exists, but use seeded data.

## Import experience to prototype

1. User opens Connections.
2. User sees Strava as `Connected` or `Not connected`.
3. User taps `Sync activities`.
4. App previews imported activities before awarding XP.
5. App shows the XP explanation and any progression changes.

## Trust and data principles

- Always show the source of an imported activity.
- Distinguish synced, pending, failed, and manually entered activities.
- Make duplicate handling visible.
- Let users correct or exclude an imported activity during the prototype.
- Do not imply that a third-party sync is real until it is implemented.

## Later technical questions

- OAuth and token storage.
- Webhooks versus periodic sync.
- Activity edits and deletions after import.
- Mapping provider activity types to internal skills.
- Privacy, account deletion, and export behavior.
- Whether other providers should use the same normalized activity model.
