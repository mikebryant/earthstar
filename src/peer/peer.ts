import { ShareAddress } from "../util/doc-types.ts";
import { IPeer } from "./peer-types.ts";

//--------------------------------------------------

import { Logger } from "../util/log.ts";

import { IReplica } from "../replica/replica-types.ts";
import { Syncer } from "../syncer/syncer.ts";
import { SyncerDriverLocal } from "../syncer/syncer_driver_local.ts";
import { BlockingBus } from "../streams/stream_utils.ts";
const logger = new Logger("peer", "blueBright");
const J = JSON.stringify;

//================================================================================

/** Holds many shares' replicas and manages their synchronisation with other peers. Recommended as the point of contact between your application and Earthstar shares. */
export class Peer implements IPeer {
  private replicaEventBus = new BlockingBus<Map<ShareAddress, IReplica>>();

  /** A subscribable map of the replicas stored in this peer. */
  replicaMap: Map<ShareAddress, IReplica> = new Map();

  constructor() {
    logger.debug("constructor");
  }

  //--------------------------------------------------
  // getters

  hasShare(share: ShareAddress): boolean {
    return this.replicaMap.has(share);
  }
  shares(): ShareAddress[] {
    const keys = [...this.replicaMap.keys()];
    keys.sort();
    return keys;
  }
  replicas(): IReplica[] {
    const keys = [...this.replicaMap.keys()];
    keys.sort();
    return keys.map((key) => this.replicaMap.get(key) as IReplica);
  }
  size(): number {
    return this.replicaMap.size;
  }
  getReplica(ws: ShareAddress): IReplica | undefined {
    return this.replicaMap.get(ws);
  }

  //--------------------------------------------------
  // setters

  async addReplica(replica: IReplica): Promise<void> {
    logger.debug(`addReplica(${J(replica.share)})`);
    if (this.replicaMap.has(replica.share)) {
      logger.debug(`already had a replica with that share`);
      throw new Error(
        `Peer.addReplica: already has a replica with share ${
          J(replica.share)
        }.  Don't add another one.`,
      );
    }
    this.replicaMap.set(replica.share, replica);
    await this.replicaEventBus.send(this.replicaMap);
    logger.debug(`    ...addReplica: done`);
  }
  async removeReplicaByShare(share: ShareAddress): Promise<void> {
    logger.debug(`removeReplicaByShare(${J(share)})`);
    this.replicaMap.delete(share);
    await this.replicaEventBus.send(this.replicaMap);
  }
  async removeReplica(
    replica: IReplica,
  ): Promise<void> {
    const existingReplica = this.replicaMap.get(replica.share);
    if (replica === existingReplica) {
      logger.debug(`removeReplica(${J(replica.share)})`);
      await this.removeReplicaByShare(replica.share);
    } else {
      logger.debug(
        `removeReplica(${
          J(replica.share)
        }) -- same share but it's a different instance now; ignoring`,
      );
    }
  }

  //----------------------------------------------
  // Syncing stuff

  /**
   * Begin synchronising with a remote or local peer.
   * @param target - A HTTP URL, Websocket URL, or an instance of `Peer`.
   * @returns A function which stops the synchronisation when called.
   */
  sync(target: IPeer | string, live?: boolean): Syncer {
    try {
      // Check if it's a URL of some kind.
      const url = new URL(target as string);

      // Check if it's a web syncer
      if (url.protocol.startsWith("ws") || url.protocol.startsWith("http")) {
        // Not handled here.
      }
    } catch {
      const syncer: Syncer = new Syncer({
        peer: this,
        driver: new SyncerDriverLocal(target as IPeer, live ? "live" : "once"),
        mode: "live",
      });

      return syncer;
    }

    return undefined as never;
  }
}
