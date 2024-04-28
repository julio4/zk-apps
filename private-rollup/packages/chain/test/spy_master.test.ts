import { TestingAppChain } from "@proto-kit/sdk";
import { PrivateKey, Field } from "o1js";
import { SpyMaster } from "../src/spy_master";
import { log } from "@proto-kit/common";
import { UInt64 } from "@proto-kit/library";
import { Agent, AgentSecurityCode } from "../src/spy_master/agent";
import { Message } from "../src/spy_master/message";

log.setLevel("ERROR");

describe("spyMaster", () => {
  let appChain = TestingAppChain.fromRuntime({
    SpyMaster,
  });
  let spyMaster: SpyMaster;
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
        SpyMaster: {},
      },
    });
    await appChain.start();
    appChain.setSigner(signerPrivateKey);

    spyMaster = appChain.runtime.resolve("SpyMaster");

    // Register agent
    const registerTx = await appChain.transaction(signer, () => {
      spyMaster.registerAgent(
        registeredAgent.id,
        registeredAgent.security_code as AgentSecurityCode
      );
    });
    await registerTx.sign();
    await registerTx.send();

    const block = await appChain.produceBlock();
    const agent = await appChain.query.runtime.SpyMaster.agents.get(
      registeredAgent.id
    );

    expect(block?.transactions[0].status.toBoolean()).toBe(true);
    expect(agent?.id.toBigInt()).toBe(registeredAgent.id.toBigInt());
  });

  it("send message as register agent should succeed", async () => {
    let msg = new Message(1, {
      agent: registeredAgent,
      content: 555555555555,
    });
    const processMsgTx = await appChain.transaction(signer, () => {
      spyMaster.processMsg(msg);
    });
    await processMsgTx.sign();
    await processMsgTx.send();

    const block = await appChain.produceBlock();
    const newAgent = await appChain.query.runtime.SpyMaster.agents.get(
      registeredAgent.id
    );

    expect(block?.transactions[0].status.toBoolean()).toBe(true);
    expect(newAgent?.last_msg_number.toBigInt()).toBe(msg.number.toBigInt());
  });

  it("send message as non registered agent should fail", async () => {
    let msg = new Message(1, {
      agent: nonRegisteredAgent,
      content: 555555555555,
    });

    const processMsgTx = await appChain.transaction(signer, () => {
      spyMaster.processMsg(msg);
    });
    await processMsgTx.sign();
    await processMsgTx.send();
    const block = await appChain.produceBlock();
    const agent = await appChain.query.runtime.SpyMaster.agents.get(
      nonRegisteredAgent.id
    );
    expect(block?.transactions[0].status.toBoolean()).toBe(false);
    expect(agent).toBeUndefined();
  });

  it("send message with non matching security code should fail", async () => {
    let msg = new Message(1, {
      agent: registeredAgent,
      content: 555555555555,
    });
    msg.details.security_code = AgentSecurityCode.from(11);

    const processMsgTx = await appChain.transaction(signer, () => {
      spyMaster.processMsg(msg);
    });
    await processMsgTx.sign();
    await processMsgTx.send();

    const block = await appChain.produceBlock();
    expect(block?.transactions[0].status.toBoolean()).toBe(false);
  });

  it("send message with incorrect content length should fail", async () => {
    let msg = new Message(1, {
      agent: registeredAgent,
      content: 555555555555,
    });
    msg.details.content.value = Field.from(5);

    const processMsgTx = await appChain.transaction(signer, () => {
      spyMaster.processMsg(msg);
    });
    await processMsgTx.sign();
    await processMsgTx.send();

    const block = await appChain.produceBlock();
    expect(block?.transactions[0].status.toBoolean()).toBe(false);
  });

  it("send message with previous message number should fail", async () => {
    let first_msg = new Message(2, {
      agent: registeredAgent,
      content: 555555555555,
    });

    const processMsgTx = await appChain.transaction(signer, () => {
      spyMaster.processMsg(first_msg);
    });
    await processMsgTx.sign();
    await processMsgTx.send();

    const block = await appChain.produceBlock();

    let msg = new Message(first_msg.number.toBigInt() - 1n, {
      agent: registeredAgent,
      content: 555555555555,
    });

    const processMsgTx2 = await appChain.transaction(signer, () => {
      spyMaster.processMsg(msg);
    });
    await processMsgTx2.sign();
    await processMsgTx2.send();

    const new_block = await appChain.produceBlock();
    const after = await appChain.query.runtime.SpyMaster.agents.get(
      registeredAgent.id
    );

    expect(new_block?.transactions[0].status.toBoolean()).toBe(false);
    expect(after?.last_msg_number.toBigInt()).toBe(first_msg.number.toBigInt());
  });
});
