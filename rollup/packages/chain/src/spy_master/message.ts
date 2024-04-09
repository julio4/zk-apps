import { Bool, Field, Struct } from "o1js";
import { UInt64 } from "@proto-kit/library";
import { Agent, AgentId, AgentSecurityCode } from "./agent";

// Not really sure about "12 characters" requirement
// So I'm going to assume we expect a 12 digit field
export class MessageContent extends Struct({
  value: Field,
}) {
  public constructor(code: Field | bigint | number | string) {
    if (
      typeof code === "bigint" ||
      typeof code === "number" ||
      typeof code === "string"
    ) {
      code = Field(code);
    }
    code.assertLessThan(1000000000000);
    code.assertGreaterThan(99999999999);
    super({ value: code });
  }

  public static from(
    code: Field | bigint | number | string
  ): AgentSecurityCode {
    return new AgentSecurityCode(code);
  }

  public isValid(): Bool {
    return this.value.lessThan(1000000000000).and(this.value.greaterThan(99999999999));
  }
}

export class MessageDetails extends Struct({
  agent_id: AgentId,
  content: MessageContent,
  security_code: AgentSecurityCode,
}) {}

export class Message extends Struct({
  number: UInt64,
  details: MessageDetails,
}) {
  public constructor(
    number: UInt64 | Field | bigint | number,
    details:
      | MessageDetails
      | {
          agent: Agent;
          content: Field | bigint | number | string;
        }
  ) {
    if (
      number instanceof Field ||
      typeof number === "bigint" ||
      typeof number === "number"
    ) {
      number = UInt64.from(number);
    }
    if (!(details instanceof MessageDetails)) {
      details = new MessageDetails({
        agent_id: details.agent.id,
        content: new MessageContent(details.content),
        security_code: details.agent.security_code,
      });
    }
    super({ number: number as UInt64, details });
  }

  public isValid(): Bool {
    return this.details.content.isValid();
  }
}
