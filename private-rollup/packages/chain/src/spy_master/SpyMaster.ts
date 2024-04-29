import {
  RuntimeModule,
  runtimeMethod,
  runtimeModule,
  state,
} from "@proto-kit/module";
import { StateMap, assert } from "@proto-kit/protocol";
import { Message } from "./message";
import { Agent, AgentId, AgentSecurityCode } from "./agent";

export const errors = {
  agentNotRegistered: () => "Agent is not registered",
  invalidSecurityCode: () => "Invalid security code",
  invalidMessageContent: () => "Invalid message content",
  securityCodeNotMatching: () => "Security code does not match",
  messageNumberNotGreaterThanLast: () =>
    "Message number is not greater than the last one",
};

@runtimeModule()
export class SpyMaster extends RuntimeModule {
  // Pre-populated
  @state() public agents = StateMap.from(AgentId, Agent);

  @runtimeMethod()
  public registerAgent(id: AgentId, security_code: AgentSecurityCode): void {
    let optAgent = this.agents.get(id);
    // Assert agent does not exist
    optAgent.isSome.assertFalse("Agent already exists");

    // Assert security code respects constraints
    let isValidSecurityCode = security_code.isValid();
    assert(isValidSecurityCode, errors.invalidSecurityCode());

    // Create agent
    this.agents.set(id, new Agent(id, security_code));
  }

  @runtimeMethod()
  public processMsg(msg: Message) {
    // Assert agent exists
    const optAgent = this.agents.get(msg.details.agent_id);
    const isAgentRegistered = optAgent.isSome;
    assert(isAgentRegistered, errors.agentNotRegistered());

    // unwrap
    const agent = optAgent.value;

    // Assert security code matches
    const isMatchingSecurityCode = msg.details.security_code.value.equals(
      agent.security_code.value
    );
    assert(isMatchingSecurityCode, errors.securityCodeNotMatching());

    // Assert message content respect constraints
    let isValidMsg = msg.isValid();
    assert(isValidMsg, errors.invalidMessageContent());

    // Assert message number is greater than the last one for the agent
    const isMsgNumberGreaterThanLast = msg.number.greaterThan(
      agent.last_msg_number
    );
    assert(
      isMsgNumberGreaterThanLast,
      errors.messageNumberNotGreaterThanLast()
    );

    // We accept the message
    // Update the last message number state of the agent
    agent.last_msg_number = msg.number;
    this.agents.set(agent.id, agent);
  }
}
