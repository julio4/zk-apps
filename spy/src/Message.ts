import { Bool, Struct, UInt32 } from 'o1js';

export type Message = {
  nb: number;
  agent: {
    id: number;
    x: number;
    y: number;
    checksum: number;
  };
};

export class Agent extends Struct({
  id: UInt32,
  x: UInt32,
  y: UInt32,
  checksum: UInt32,
}) {
  isValid(): Bool {
    return this.id.equals(UInt32.zero).or(
      // Agent XLocation should be between 0 and 15000
      this.x
        .lessThanOrEqual(new UInt32(15000))
        // Agent YLocation should be between 5000 and 20000
        .and(this.y.greaterThanOrEqual(new UInt32(5000)))
        .and(this.y.lessThanOrEqual(new UInt32(20000)))
        // Agent YLocation should be greater than Agent XLocation
        .and(this.y.greaterThan(this.x))
        // Checksum check
        .and(this.checksum.equals(this.id.add(this.x).add(this.y)))
    );
  }
}

export class ProvableMessage extends Struct({
  nb: UInt32,
  agent: Agent,
}) {
  static from(msg: Message) {
    return new ProvableMessage({
      nb: new UInt32(msg.nb),
      agent: new Agent({
        id: new UInt32(msg.agent.id),
        x: new UInt32(msg.agent.x),
        y: new UInt32(msg.agent.y),
        checksum: new UInt32(msg.agent.checksum),
      }),
    });
  }
}
