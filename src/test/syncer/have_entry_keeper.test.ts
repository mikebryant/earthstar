import { Crypto } from "../../crypto/crypto.ts";
import { DocDriverMemory } from "../../replica/doc_drivers/memory.ts";
import { AttachmentDriverMemory } from "../../replica/attachment_drivers/memory.ts";
import { QuerySourceEvent } from "../../replica/replica-types.ts";
import { Replica } from "../../replica/replica.ts";

import { HaveEntryKeeper } from "../../syncer/have_entry_keeper.ts";
import { HaveEntry } from "../../syncer/syncer_types.ts";
import { AuthorKeypair } from "../../util/doc-types.ts";
import { sleep } from "../../util/misc.ts";
import { readStream } from "../../util/streams.ts";
import { assert, assertEquals } from "../asserts.ts";
import { writeRandomDocs } from "../test-utils.ts";
import { DocEs5, FormatEs5 } from "../../formats/format_es5.ts";

Deno.test("HaveEntryKeeper", async () => {
  const SHARE_ADDR = "+test.a123";

  const keypair = await Crypto.generateAuthorKeypair("test") as AuthorKeypair;
  const keypairB = await Crypto.generateAuthorKeypair(
    "suzy",
  ) as AuthorKeypair;

  const replica = new Replica(
    {
      driver: {
        docDriver: new DocDriverMemory(SHARE_ADDR),
        attachmentDriver: new AttachmentDriverMemory(),
      },
    },
  );

  await replica.set(keypair, {
    path: "/shared_path",
    text: "Hello",
  });

  await replica.set(keypairB, {
    path: "/shared_path",
    text: "Howdy",
  });

  await replica.set(keypair, {
    path: "/another_path",
    text: "Greetings",
  });

  await replica.set(keypairB, {
    path: "/yet_another_path",
    text: "Yo.",
  });

  const haveKeeper = new HaveEntryKeeper("existing");

  const queryStream = replica.getQueryStream(
    {
      historyMode: "all",
      orderBy: "localIndex ASC",
    },
    "existing",
  );

  await queryStream.pipeTo(haveKeeper.writable);

  const collected = await readStream(haveKeeper.readable);

  const docIdsAndPaths = collected.map((entry) => ({
    id: entry.id,
  }));
  const versionIdsAndPaths = collected.flatMap((entry) =>
    Object.keys(entry.versions).map((key) => ({
      id: key,
    }))
  );

  const idsAndPaths = [...docIdsAndPaths, ...versionIdsAndPaths];

  assertEquals(
    collected.length,
    3,
    "The entry keeper in 'existing' mode should have streamed three entries",
  );

  for (const { id } of idsAndPaths) {
    const result = haveKeeper.getPathAndVersionsForId(id);

    assert(result, `HaveEntryKeeper has entry with ID.`);
  }

  // =======================

  // Testing a live haveEntryKeeper

  const liveHaveKeeper = new HaveEntryKeeper("everything");

  const liveQueryStream = replica.getQueryStream(
    {
      historyMode: "all",
      orderBy: "localIndex ASC",
    },
    "everything",
  );

  liveQueryStream.pipeTo(liveHaveKeeper.writable);

  const liveEntryStream = liveHaveKeeper.readable;

  await replica.set(keypairB, {
    path: "/more_paths",
    text: "Hiiiii",
  });

  await replica.set(keypairB, {
    path: "/another_path",
    text: "Hiiiii",
  });

  const liveCollected: HaveEntry[] = [];

  const liveCollectorWritable = new WritableStream<HaveEntry>({
    write(entry) {
      liveCollected.push(entry);
    },
  });

  const abortController = new AbortController();

  liveEntryStream.pipeTo(liveCollectorWritable, {
    signal: abortController.signal,
  });

  await sleep(10);

  const liveDocIdsAndPaths = liveCollected.map((entry) => ({
    id: entry.id,
  }));
  const liveVersionIdsAndPaths = liveCollected.flatMap((entry) =>
    Object.keys(entry.versions).map((key) => ({
      id: key,
    }))
  );

  const liveIdsAndPaths = [...liveDocIdsAndPaths, ...liveVersionIdsAndPaths];

  assertEquals(
    liveCollected.length,
    5,
    "The entry keeper in 'everything' mode should have streamed 5 entries",
  );

  for (const { id } of liveIdsAndPaths) {
    const result = liveHaveKeeper.getId(id);

    assert(result, `HaveEntryKeeper has entry with ID.`);
  }

  await replica.close(true);
});

Deno.test({
  name: "HaveEntryKeeper hashes",
  fn: async () => {
    const SHARE_ADDR = "+test.a123";

    // Set up two replicas to have the same docs.

    const keypair = await Crypto.generateAuthorKeypair("test") as AuthorKeypair;

    const replica = new Replica({
      driver: {
        docDriver: new DocDriverMemory(SHARE_ADDR),
        attachmentDriver: new AttachmentDriverMemory(),
      },
    });

    await writeRandomDocs(keypair, replica, 1000);

    const otherReplica = new Replica({
      driver: {
        docDriver: new DocDriverMemory(SHARE_ADDR),
        attachmentDriver: new AttachmentDriverMemory(),
      },
    });

    const ingestWritable = new WritableStream<QuerySourceEvent<DocEs5>>({
      async write(event) {
        if (event.kind === "success" || event.kind === "existing") {
          await otherReplica.ingest(FormatEs5, event.doc);
        }
      },
    });

    await replica.getQueryStream(
      {
        historyMode: "all",
        orderBy: "localIndex ASC",
      },
      "existing",
    ).pipeTo(ingestWritable);

    // Now set up their HaveEntryKeepers

    const haveKeeper = new HaveEntryKeeper("existing");

    const queryStream = replica.getQueryStream(
      {
        historyMode: "all",
      },
      "existing",
    );

    await queryStream.pipeTo(haveKeeper.writable);

    const otherHaveKeeper = new HaveEntryKeeper("existing");

    const otherQueryStream = otherReplica.getQueryStream(
      {
        historyMode: "all",
        orderBy: "localIndex ASC",
      },
      "existing",
    );

    await otherQueryStream.pipeTo(otherHaveKeeper.writable);

    await haveKeeper.isReady();
    await otherHaveKeeper.isReady();

    assertEquals(
      haveKeeper.getEntries().length,
      otherHaveKeeper.getEntries().length,
      "Keepers do not have the same number of entries.",
    );

    assertEquals(
      otherHaveKeeper.getHash(),
      haveKeeper.getHash(),
    );

    await replica.close(true);
    await otherReplica.close(true);
  },
  // TODO: This test leaks calls to crypto.digest that I can't trace down.
  sanitizeOps: false,
});

// TODOM1: Test that two replicas with docs inserted in a different order generate the same hash.
