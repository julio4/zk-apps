import { Bool, Field, Gadgets, Poseidon } from 'o1js';

const flagsLen = 6;
const flagsMask = 2n ** BigInt(flagsLen) - 1n;

/**
 * Message flags are the last 6 bits of a Field (as a message)
 * There is 3 rules for message flags:
 * - Rule 1: If flag 1 is true, then all other flags must be false
 * - Rule 2: If flag 2 is true, then flag 3 must be true
 * - Rule 3: If flag 4 is true, then flags 5 and 6 must be false
 */
export const verifyFlags = (flags: Bool[]) => {
  /*
   Boolean logic:
   Bits: | a | b | c | d | e | f |
   Rules: (~ not, + or, * and, => implies)
    a => ~b*~c*~d*~e*~f
    b => c
    d => ~e*~f

    (~a+(~b*~c*~d*~e*~f))*(~b+c)*(~d+(~e*~f))
  */
  if (flags.length !== flagsLen) {
    throw new Error(`Flags must be ${flagsLen} bits long`);
  }

  // let flags = field.toBits(flagsLen);
  let a = flags[5];
  let b = flags[4];
  let c = flags[3];
  let d = flags[2];
  let e = flags[1];
  let f = flags[0];

  // Or using Bitwise operations with Gadgets
  // I'm not entirely sure if using Gadgets is more efficient than using .toBits() directly?
  // let a = Gadgets.and(msg, Field(0b100000), flags_length).equals(Field(0b100000));
  // let b = Gadgets.and(msg, Field(0b010000), flags_length).equals(Field(0b010000));
  // let c = Gadgets.and(msg, Field(0b001000), flags_length).equals(Field(0b001000));
  // let d = Gadgets.and(msg, Field(0b000100), flags_length).equals(Field(0b000100));
  // let e = Gadgets.and(msg, Field(0b000010), flags_length).equals(Field(0b000010));
  // let f = Gadgets.and(msg, Field(0b000001), flags_length).equals(Field(0b000001));
  // Provable.log([a, b, c, d, e, f]);

  let rule1 = a
    .not()
    .or(b.not().and(c.not()).and(d.not()).and(e.not()).and(f.not()));
  let rule2 = b.not().or(c);
  let rule3 = d.not().or(e.not().and(f.not()));
  let rules = rule1.and(rule2).and(rule3);

  rules.assertTrue();
};

export const verifyMessageFlags = (msg: Field) =>
  verifyFlags(Gadgets.and(msg, Field(flagsMask), 254).toBits(flagsLen));

export const getMessageData = (msg: Field): Field =>
  Gadgets.and(msg, Field(2n ** 254n - 1n - flagsMask), 254);

export const assertMessageDataNotZero = (msg: Field) =>
  getMessageData(msg).assertNotEquals(Field(0));

export const verifyMessage = (msg: Field) => {
  verifyMessageFlags(msg);
  assertMessageDataNotZero(msg);
};

// This is not used in the proof so we use javascript
export const constructMessageHelper = (data: Field, flags: Field): Field => {
  if (data.greaterThan(Field(2n ** 254n - 1n - flagsMask)).toBoolean()) {
    throw new Error('Data is too big');
  }
  // Quick flags check (~a+(~b*~c*~d*~e*~f))*(~b+c)*(~d+(~e*~f))
  const b = flags
    .toBits(flagsLen)
    .map((flag) => flag.toBoolean())
    .reverse();
  if (
    !(
      (!b[0] || (!b[1] && !b[2] && !b[3] && !b[4] && !b[5])) &&
      (!b[1] || b[2]) &&
      (!b[3] || (!b[4] && !b[5]))
    )
  ) {
    throw new Error('Invalid flags');
  }

  // shit data flagsMask to the left and concate
  // We use javascript big int as it's only an helper not included in the proof
  // return Field(data.toBigInt() << flagsMask | flags.toBigInt());
  const tmp = Field(data.toBigInt() << BigInt(flagsLen));
  // console.log("tmp is:", tmp.toBits(254).map(b => b.toBoolean() ? '1' : '0').join(''))
  return tmp.add(flags);
};

// To keep a message secret, just hash it before depositing it
// HOWEVER, the message must be on 248bits, to keep 6 bits for flags
// When using Poseidon hash, the resulting hash will be 254bits regarding of input size
// Solution:
// We truncate the first 6 bits.
// Implications:
// - Reduced collision resistance
// - Reduced Pre-image, second Pre-image resistance
// It's acceptable for only 6 bits in this context where the main goal is only to hide message
export const constructSecretMessageHelper = (
  data: Field,
  flags: Field
): Field =>
  constructMessageHelper(
    Field(Poseidon.hash(data.toFields()).toBigInt() >> BigInt(flagsLen)),
    flags
  );

export default {
  verifyMessageFlags,
  getMessageData,
  assertMessageDataNotZero,
  constructMessageHelper,
  constructSecretMessageHelper,
  verifyMessage,
};
