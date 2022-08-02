import { deferred } from "https://deno.land/std@0.138.0/async/deferred.ts";
import { Crypto } from "../crypto/crypto.ts";

export class AttachmentStreamInfo {
  private transformer: TransformStream<Uint8Array, Uint8Array>;
  private updatableHash = Crypto.updatableSha256();

  size = deferred<number>();
  hash = deferred<string>();

  constructor() {
    const { updatableHash, size, hash } = this;

    let currentSize = 0;

    this.transformer = new TransformStream({
      transform(chunk, controller) {
        updatableHash.update(chunk);
        currentSize += chunk.byteLength;

        controller.enqueue(chunk);
      },
      flush() {
        const digest = updatableHash.digest();

        hash.resolve(Crypto.sha256base32(digest));
        size.resolve(currentSize);
      },
    });
  }

  get writable() {
    return this.transformer.writable;
  }

  get readable() {
    return this.transformer.readable;
  }
}
