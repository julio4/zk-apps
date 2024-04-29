import { Bool, Field, PublicKey, Struct, UInt64 as O1UInt64 } from "o1js";
import { UInt64 } from "@proto-kit/library";

export class AgentId extends UInt64 {}
export class AgentSecurityCode extends Struct({
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
    // Only 2 digits allowed
    code.assertLessThan(100);
    code.assertGreaterThan(9);
    super({ value: code });
  }

  public static from(
    code: Field | bigint | number | string
  ): AgentSecurityCode {
    return new AgentSecurityCode(code);
  }

  public isValid(): Bool {
    return this.value.lessThan(100).and(this.value.greaterThan(9));
  }
}

export class Agent extends Struct({
  id: AgentId,
  last_msg_number: UInt64,
  security_code: AgentSecurityCode,
}) {
  public constructor(
    id: AgentId | Field | bigint | number,
    security_code: AgentSecurityCode | Field | bigint | number | string
  ) {
    if (!(id instanceof AgentId)) id = AgentId.from(id);
    if (!(security_code instanceof AgentSecurityCode))
      security_code = AgentSecurityCode.from(security_code);
    super({
      id,
      security_code,
      last_msg_number: UInt64.from(0),
    });
  }
}

export class AgentTxDetails extends Struct({
  blockHeight: O1UInt64,
  msgSender: PublicKey,
  nonce: O1UInt64,
}) {}
