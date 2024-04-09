import { Field } from "o1js";
import { Agent, AgentId, AgentSecurityCode } from "../src/spy_master/agent";

describe("Agent", () => {
  let id = AgentId.from(1);
  let securityCode = AgentSecurityCode.from(10);

  it("should create an agent", () => {
    let agent = new Agent(id, securityCode);
    expect(agent.id.toBigInt()).toBe(id.toBigInt());
    expect(agent.security_code.value.toBigInt()).toBe(securityCode.value.toBigInt());
    expect(agent.last_msg_number.toBigInt()).toBe(0n);
  });

  it("should create an agent with primitives types", () => {
    let agent = new Agent(1, 10);
    expect(agent.id.toBigInt()).toBe(id.toBigInt());
    expect(agent.security_code.value.toBigInt()).toBe(securityCode.value.toBigInt());
    expect(agent.last_msg_number.toBigInt()).toBe(0n);
  });

  describe("security code", () => {
    let valid = Field(10);
    let invalid = Field(101);
    let invalid2 = Field(8);

    it("should create a valid security code", () => {
      let validCode: AgentSecurityCode = new AgentSecurityCode(valid);
      expect(validCode.isValid().toBoolean()).toBe(true);
    });

    it("should throw an error for an invalid security code in constructor", () => {
      expect(() => new AgentSecurityCode(invalid)).toThrow();
    });

    it("should throw an error for an invalid security code", () => {
      let code = new AgentSecurityCode(valid);
      // force the code to be invalid
      code.value = invalid;
      expect(code.isValid().toBoolean()).toBe(false);
      code.value = invalid2;
      expect(code.isValid().toBoolean()).toBe(false);
    });
  });
});
