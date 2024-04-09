import { Field } from "o1js";
import {
  Message,
  MessageContent,
  MessageDetails,
} from "../src/spy_master/message";
import { Agent, AgentSecurityCode } from "../src/spy_master/agent";
import { UInt64 } from "@proto-kit/library";

describe("Agent", () => {
  let agent = new Agent(10, 55);
  let details = new MessageDetails({
    agent_id: agent.id,
    content: new MessageContent(555555555555),
    security_code: agent.security_code,
  });

  it("should create a message", () => {
    let msg = new Message(1, details);
    expect(msg).toBeDefined();
    expect(msg.number.toBigInt()).toBe(1n);
    expect(msg.details.agent_id.toBigInt()).toBe(10n);
    expect(msg.details.content.value.toBigInt()).toBe(555555555555n);
    expect(msg.details.security_code.value.toBigInt()).toBe(55n);
  });

  it("should create a message with primitives types", () => {
    let msg = new Message(1, {
      agent,
      content: 555555555555,
    });
    expect(msg).toBeDefined();
    expect(msg.number.toBigInt()).toBe(1n);
    expect(msg.details.agent_id.toBigInt()).toBe(10n);
    expect(msg.details.content.value.toBigInt()).toBe(555555555555n);
    expect(msg.details.security_code.value.toBigInt()).toBe(55n);
  });

  describe("message content", () => {
    let valid = Field(555555555555);
    let invalid = Field(1111111111);
    let invalid2 = Field(1111111111111);

    it("should create a valid message content", () => {});

    it("should throw an error for an invalid content in constructor", () => {
      expect(() => new MessageContent(invalid)).toThrow();
    });

    it("should throw an error for an invalid content in isValid", () => {
      let content = new MessageContent(valid);
      // force the code to be invalid
      content.value = invalid;
      expect(content.isValid().toBoolean()).toBe(false);
      content.value = invalid2;
      expect(content.isValid().toBoolean()).toBe(false);
    });
  });
});
