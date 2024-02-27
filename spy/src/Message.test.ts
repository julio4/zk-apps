import { UInt32 } from 'o1js';
import { Message, ProvableMessage } from './Message';

export const validMsg: Message = {
  nb: 1,
  agent: {
    id: 1,
    x: 10000,
    y: 11000,
    checksum: 21001,
  },
};

describe('ProvableMessage', () => {
  it('ProvableMessage.from(Message)', () => {
    const message = ProvableMessage.from(validMsg);
    expect(message.nb).toEqual(new UInt32(validMsg.nb));
    expect(message.agent.id).toEqual(new UInt32(validMsg.agent.id));
    expect(message.agent.x).toEqual(new UInt32(validMsg.agent.x));
    expect(message.agent.y).toEqual(new UInt32(validMsg.agent.y));
    expect(message.agent.checksum).toEqual(new UInt32(validMsg.agent.checksum));
  });

  describe('ProvableMessage.agent.isValid()', () => {
    it('Should return true if valid', () => {
      const message = ProvableMessage.from(validMsg);
      expect(message.agent.isValid().toBoolean()).toBe(true);
    });

    it('Checksum check', () => {
      const message = ProvableMessage.from({
        ...validMsg,
        agent: {
          ...validMsg.agent,
          checksum: 21002,
        },
      });
      expect(message.agent.isValid().toBoolean()).toBe(false);
    });

    it('Agent YLocation should be greater than Agent XLocation', () => {
      const message = ProvableMessage.from({
        ...validMsg,
        agent: {
          id: 1,
          x: 10000,
          y: 9000,
          checksum: 19001,
        },
      });
      expect(message.agent.isValid().toBoolean()).toBe(false);
    });

    it('Agent YLocation should be between 5000 and 20000', () => {
      let message = ProvableMessage.from({
        ...validMsg,
        agent: {
          id: 1,
          x: 10000,
          y: 4000,
          checksum: 14001,
        },
      });
      expect(message.agent.isValid().toBoolean()).toBe(false);
      message.agent.y = new UInt32(21000);
      message.agent.checksum = new UInt32(32001);
      expect(message.agent.isValid().toBoolean()).toBe(false);
    });

    it('Agent XLocation should be between 0 and 15000', () => {
      let message = ProvableMessage.from({
        ...validMsg,
        agent: {
          id: 1,
          x: 16000,
          y: 17000,
          checksum: 34001,
        },
      });
      expect(message.agent.isValid().toBoolean()).toBe(false);
      message.agent.x = UInt32.zero;
      message.agent.checksum = new UInt32(17001);
      expect(message.agent.isValid().toBoolean()).toBe(true);
    });

    it('Agent id 0 is always valid', () => {
      const message = ProvableMessage.from({
        ...validMsg,
        agent: {
          id: 0,
          x: 0,
          y: 0,
          checksum: 1,
        },
      });
      expect(message.agent.isValid().toBoolean()).toBe(true);
    });
  });
});
