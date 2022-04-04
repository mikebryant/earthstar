import { assert, assertEquals } from "../asserts.ts";

import { ShareAddress } from "../../util/doc-types.ts";
import { IReplica } from "../../replica/replica-types.ts";
import { GlobalCryptoDriver } from "../../crypto/global-crypto-driver.ts";
import { compareByFn, sortedInPlace } from "../../replica/compare.ts";
import { Replica } from "../../replica/replica.ts";
import { FormatValidatorEs4 } from "../../format-validators/format-validator-es4.ts";
import { Peer } from "../../peer/peer.ts";
import { testScenarios } from "../test-scenarios.ts";
import { TestScenario } from "../test-scenario-types.ts";

//================================================================================

import { Logger } from "../../util/log.ts";

let loggerTest = new Logger("test", "whiteBright");
let loggerTestCb = new Logger("test cb", "white");
let J = JSON.stringify;

//setDefaultLogLevel(LogLevel.None);
//setLogLevel('peer', LogLevel.Debug);

//================================================================================

export let runPeerTests = (
    scenario: TestScenario,
) => {
    const { name, makeDriver } = scenario;

    let TEST_NAME = "peer shared tests";
    let SUBTEST_NAME = name;

    function makeStorage(share: ShareAddress): IReplica {
        let stDriver = makeDriver(share);
        let storage = new Replica(share, FormatValidatorEs4, stDriver);
        return storage;
    }

    Deno.test(SUBTEST_NAME + ": peer basics", async () => {
        let initialCryptoDriver = GlobalCryptoDriver;

        let shares = [
            "+one.ws",
            "+two.ws",
            "+three.ws",
        ];
        let storages = shares.map((ws) => makeStorage(ws));

        let sortedShares = sortedInPlace([...shares]);
        let sortedStorages = [...storages];
        sortedStorages.sort(compareByFn((storage) => storage.share));

        let peer = new Peer();

        assert(
            typeof peer.peerId === "string" && peer.peerId.length > 5,
            "peer has a peerId",
        );

        assertEquals(
            peer.hasShare("+two.ws"),
            false,
            "does not yet have +two.ws",
        );
        assertEquals(peer.shares(), [], "has no shares");
        assertEquals(peer.replicas(), [], "has no replicas");
        assertEquals(peer.size(), 0, "size is zero");

        for (let storage of storages) {
            await peer.addReplica(storage);
        }

        assertEquals(
            peer.hasShare("nope"),
            false,
            "does not have invalid share address",
        );
        assertEquals(
            peer.hasShare("+nope.ws"),
            false,
            "does not have +nope.ws share",
        );
        assertEquals(
            peer.hasShare("+two.ws"),
            true,
            "now it does have +two.ws",
        );

        assertEquals(
            peer.shares(),
            sortedShares,
            "has all 3 shares, sorted",
        );
        assertEquals(
            peer.replicas(),
            sortedStorages,
            "has all 3 storages sorted by share",
        );
        assertEquals(peer.size(), 3, "size is 3");

        await peer.removeReplicaByShare("+one.ws");
        assertEquals(
            peer.shares(),
            ["+three.ws", "+two.ws"],
            "removed by share address",
        );
        assertEquals(peer.size(), 2, "size is 2");

        await peer.removeReplica(storages[1]); // that's two.ws
        assertEquals(
            peer.shares(),
            ["+three.ws"],
            "removed storage instance",
        );
        assertEquals(peer.size(), 1, "size is 1");

        assertEquals(
            initialCryptoDriver,
            GlobalCryptoDriver,
            `GlobalCryptoDriver has not changed unexpectedly.  started as ${
                (initialCryptoDriver as any).name
            }, ended as ${(GlobalCryptoDriver as any).name}`,
        );

        for (const storage of storages) {
            await storage.close(true);
        }

        // TODO: eventually test peer.bus events when we have them
    });
};

for (const scenario of testScenarios) {
    runPeerTests(scenario);
}
