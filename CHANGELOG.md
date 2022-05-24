# Changelog

## Next

- Improvement: noble-ed25519 has been updated, and is now audited and 10 - 15%
  faster.
- BREAKING: `Peer` no longer has a `peerId` property.
- BREAKING: `Peer.sync`'s type has changed. It now takes a boolean as its only
  parameter, indicating whether the sync should be 'live' (connection kept open)
  or not. It also now returns a syncer. In light of this, the `stopSyncing` and
  `syncUntilCaughtUp` methods have also been removed.
- Feature (experimental): Added a new `ReplicaDriverSqliteFfi`, which uses
  native bindings to Sqlite. It has much better write performance than the
  ordinary Sqlite driver, which makes it very suitable for replica servers. It
  has worse read performance, however. Usage requires passing the `--unstable`
  flag to Deno.
- Improvement: ReplicaDriverMemory's performance for setting and querying has
  been massively improved.
- BREAKING: Syncer has been replaced by a completely new, faster implementation.
  It is NOT able to sync with v7 - v9 peers.
- BREAKING: LiveQueryEvent is now ReplicaEvent
- BREAKING: Replica.ingest no longer returns an IngestEvent or ValidationError.
  It now returns `true` (indicating success) or a ValidationError.
- Feature: Added Replica.getEventStream which returns a ReadableStream of
  replica events. By default it gets all events, but you can subscribe to
  specific events by passing a channel name.
- Feature: Added Replica.onEvent which will run a given callback every time a
  replica event occurs.
- BREAKING: Replica no longer has a subscribable `bus` property,
- Feature: Added CryptoDriverSodium for Deno. This driver is several magnitudes
  faster than the default crypto driver. Set it with `setGlobalCryptoDriver`.
- BREAKING: Initialising a `Replica` is now simpler: you only need to provide a
  driver.

## v9.3.2

- Updated earthstar_streaming_rcp to v5.0.1

## v9.3.1

- Updated earthstar_streaming_rcp to v5.0.0

## v9.3.0

- Feature: Replica will now permanently delete all expired documents on
  instantiation, and delete expired docs every hour thereafter. Previously it
  would only stop returning expired docs in user queries.
- Feature: Added `Replica.queryAuthors` and `Replica.queryPaths`, which returns
  an array of (unique) authors of paths from the docs resulting from that query.

## 9.2.0

- Feature: Added `generateShareAddress` utility to generate valid, safe share
  addresses.
- Feature: Updated filesystem sync so that deleted (not just modified) files can
  be overwritten using the `overwriteFilesAtOwnedPaths` option.

## 9.1.0

- Feature: Added 'overwriteFilesAtOwnedPaths' option to SyncFsOptions. This will
  forcibly overwrite any files at paths owned by other identities with ones from
  the replica.

## 9.0.1

- Added a `pulled` property to syncer statuses.
- Fixed an issue where SyncCoordinators would pull twice as much as they needed
  to.

## 9.0.0

- Breaking: Syncing has been updated so that peers inform each other when they
  are caught up. v7 - v8 peers will not be able to sync with each other.
- Patch: Addressed an issue affecting synchronisation with HTTP peers.
- Feature: Peer.syncUntilCaughtUp. Syncs with targets until both sides of the
  synchronisation have nothing left to pull from each other.
- Patch: SyncCoordinator will now request 10 docs at a time instead of
  everything a peer has.
- Feature: Peer.syncStatuses. Subscribable map of Peer's sync operations'
  statuses.
- Feature: Syncer.syncStatuses. Subscribable map of syncer's connections' sync
  statuses.
- Feature: SyncCoordinator.syncStatuses. Subscribable map of coordinator's
  shares' sync statuses, with number of ingested docs and 'caught up' status of
  each syncing session.
- Patch: Common shares between peers are re-established whenever a Peer's set of
  replicas chages.
- Patch: Improved the heuristic `syncReplicaAndFsDir` uses to determine whether
  a file has changed or not, fixing issues where files at owned paths which had
  not been changed would cause the function to throw.

## 8.3.1

- Patch: Made `syncReplicaAndFsDir` ignore `.DS_Store` files.
- Patch: Improve how `syncReplicaAndFsDir` determines the latest version of a
  document, fixing an issue with 'zombie' files which would return after
  deletion.

## 8.3.0

- Feature: Added a new export, `syncReplicaAndFsDir`, which bidirectionally
  syncs the contents of a replica and filesystem directory.
- Patch: Replica drivers will now validate share addresses which have been
  passed to them.
- Patch: ReplicaDriverSqlite (Deno and Node) now initialise their maxLocalIndex
  correctly, fixing issues where new documents could not be created.
- Patch: ReplicaDriverSqlite (Deno) now no longer fails when using the `create`
  mode.
- Patch: SyncCoordinator now requests all document history from other peers.