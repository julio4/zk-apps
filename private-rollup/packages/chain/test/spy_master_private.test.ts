import { TestingAppChain } from "@proto-kit/sdk";
import { PrivateKey } from "o1js";
import { log } from "@proto-kit/common";
import { UInt64 } from "@proto-kit/library";

import {
  SpyMasterPrivate,
  Agent,
  AgentSecurityCode,
  Message,
  ProcessMsgDummyProof,
} from "../src/spy_master";

log.setLevel("ERROR");

describe("spyMasterPrivate", () => {
  let appChain = TestingAppChain.fromRuntime({
    SpyMasterPrivate,
  });
  let spyMasterPrivate: SpyMasterPrivate;
  let registeredAgent = new Agent(1, 55);
  let nonRegisteredAgent = new Agent(2, 44);
  const signerPrivateKey = PrivateKey.random();
  const signer = signerPrivateKey.toPublicKey();

  beforeEach(async () => {
    appChain.configurePartial({
      Runtime: {
        Balances: {
          totalSupply: UInt64.from(10000),
        },
        SpyMasterPrivate: {},
      },
    });
    await appChain.start();
    appChain.setSigner(signerPrivateKey);

    spyMasterPrivate = appChain.runtime.resolve("SpyMasterPrivate");

    // Register agent
    const registerTx = await appChain.transaction(signer, () => {
      spyMasterPrivate.registerAgent(
        registeredAgent.id,
        registeredAgent.security_code as AgentSecurityCode
      );
    });
    await registerTx.sign();
    await registerTx.send();

    const block = await appChain.produceBlock();
    const agent = await appChain.query.runtime.SpyMasterPrivate.agents.get(
      registeredAgent.id
    );

    expect(block?.transactions[0].status.toBoolean()).toBe(true);
    expect(agent?.id.toBigInt()).toBe(registeredAgent.id.toBigInt());
  });

  it("unsafe processMessage call should fail", async () => {
    let msg = new Message(1, {
      agent: registeredAgent,
      content: 555555555555,
    });
    const processMsgTx = await appChain.transaction(signer, () => {
      spyMasterPrivate.processMsg(msg);
    });
    await processMsgTx.sign();
    await processMsgTx.send();

    const block = await appChain.produceBlock();
    expect(block?.transactions[0].status.toBoolean()).toBe(false);
  });

  it("send message as register agent should succeed", async () => {
    let msg = new Message(1, {
      agent: registeredAgent,
      content: 555555555555,
    });
    const proof = await ProcessMsgDummyProof(registeredAgent, msg);

    const processMsgTx = await appChain.transaction(signer, () => {
      spyMasterPrivate.processMsgSafe(proof);
    });
    await processMsgTx.sign();
    await processMsgTx.send();

    const block = await appChain.produceBlock();
    const newAgent = await appChain.query.runtime.SpyMasterPrivate.agents.get(
      registeredAgent.id
    );

    expect(block?.transactions[0].status.toBoolean()).toBe(true);
    expect(newAgent?.last_msg_number.toBigInt()).toBe(msg.number.toBigInt());
  });

  it("can query the agentTxDetails state for a specific block height", async () => {
    let msg = new Message(1, {
      agent: registeredAgent,
      content: 555555555555,
    });
    const proof = await ProcessMsgDummyProof(registeredAgent, msg);
    const processMsgTx = await appChain.transaction(signer, () => {
      spyMasterPrivate.processMsgSafe(proof);
    });
    await processMsgTx.sign();
    await processMsgTx.send();
    const block = await appChain.produceBlock();

    const agentTxDetails =
      await appChain.query.runtime.SpyMasterPrivate.agentTxDetails.get(
        registeredAgent.id
      );

    expect(agentTxDetails?.blockHeight.toBigInt()).toBe(
      block?.height.toBigInt()
    );
    expect(agentTxDetails?.msgSender.toBase58()).toBe(signer.toBase58());
    expect(agentTxDetails?.msgSender.toBase58()).toBe(
      processMsgTx.transaction?.sender.toBase58()
    );
    expect(agentTxDetails?.nonce.toBigInt()).toBe(
      processMsgTx.transaction?.nonce.toBigInt()
    );
  });

  // All other specific constraits are tested in `spy_master.test.ts` already
});
