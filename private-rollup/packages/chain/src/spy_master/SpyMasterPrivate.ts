import { Bool, Experimental, Field, Struct } from "o1js";
import { Agent, AgentId, AgentTxDetails } from "./agent";
import { Message } from "./message";
import { SpyMaster, errors as spyMasterErrors } from "./SpyMaster";
import { runtimeMethod, runtimeModule, state } from "@proto-kit/module";
import { StateMap, assert } from "@proto-kit/protocol";
import { UInt64 } from "@proto-kit/library";
import { Pickles } from "o1js/dist/node/snarky";
import { dummyBase64Proof } from "o1js/dist/node/lib/proof_system";

const errors = {
  ...spyMasterErrors,
  unsafeProcessMsgCall: () => "`processMsg` should not be called directly",
};

class UpdatedAgentState extends Struct({
  messageNb: UInt64,
  agentId: AgentId,
}) {}

const verifyMsgCircuit = (agent: Agent, msg: Message) => {
  // Assert security code matches
  const isMatchingSecurityCode = msg.details.security_code.value.equals(
    agent.security_code.value
  );
  isMatchingSecurityCode.assertTrue(errors.securityCodeNotMatching());

  // Assert message content respect constraints
  let isValidMsg = msg.isValid();
  isValidMsg.assertTrue(errors.invalidMessageContent());

  // Assert message number is greater than the last one for the agent
  const isMsgNumberGreaterThanLast = msg.number.greaterThan(
    agent.last_msg_number
  );
  isMsgNumberGreaterThanLast.assertTrue(
    errors.messageNumberNotGreaterThanLast()
  );

  // We accept the message
  // Update the last message number state of the agent
  return new UpdatedAgentState({
    messageNb: msg.number,
    agentId: agent.id,
  });
};

export const ProcessMsgProgram = Experimental.ZkProgram({
  publicInput: Agent,
  publicOutput: UpdatedAgentState,

  methods: {
    verifyMsg: {
      privateInputs: [Message],
      method: verifyMsgCircuit,
    },
  },
});

export class ProcessMsgProof extends Experimental.ZkProgram.Proof(
  ProcessMsgProgram
) {}

export const ProcessMsgDummyProof: (
  agent: Agent,
  msg: Message
) => Promise<ProcessMsgProof> = async (agent: Agent, msg: Message) => {
  const [, dummy] = Pickles.proofOfBase64(await dummyBase64Proof(), 2);
  return new ProcessMsgProof({
    proof: dummy,
    publicOutput: verifyMsgCircuit(agent, msg),
    publicInput: agent,
    maxProofsVerified: 2,
  });
};

@runtimeModule()
export class SpyMasterPrivate extends SpyMaster {
  @state() public agentTxDetails = StateMap.from(AgentId, AgentTxDetails);

  @runtimeMethod()
  public processMsg(msg: Message) {
    assert(Bool(false), errors.unsafeProcessMsgCall());
  }

  @runtimeMethod()
  public processMsgSafe(proof: ProcessMsgProof) {
    // Assert agent exists
    let optAgent = this.agents.get(proof.publicOutput.agentId);
    const isAgentRegistered = optAgent.isSome;
    assert(isAgentRegistered, errors.agentNotRegistered());

    // unwrap
    const agent = optAgent.value;

    // verify given proof
    proof.verify();

    // update state
    agent.last_msg_number = proof.publicOutput.messageNb;
    this.agents.set(agent.id, agent);

    // save agent tx details context
    const txDetails = new AgentTxDetails({
      blockHeight: this.network.block.height,
      msgSender: this.transaction.sender.value,
      nonce: this.transaction.nonce.value,
    });
    this.agentTxDetails.set(agent.id, txDetails);
  }
}
