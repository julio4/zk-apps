import {
  verifyMessageFlags,
  assertMessageDataNotZero,
  getMessageData,
  constructMessageHelper,
  constructSecretMessageHelper,
  verifyMessage,
} from './encoding';
import { Field, Poseidon, Provable } from 'o1js';

describe('Message format', () => {
  describe('Flags validation', () => {
    describe('flags: rule 1', () => {
      it('Success scenarios', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            verifyMessageFlags(Field(0b100000));
          });
        }).not.toThrow();

        expect(() => {
          Provable.runAndCheck(() => {
            verifyMessageFlags(Field(0b000000));
          });
        }).not.toThrow();
      });

      it('Failure scenario', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            verifyMessageFlags(Field(0b100001));
          });
        }).toThrow();
      });
    });

    describe('flags: rule 2', () => {
      it('Success scenarios', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            verifyMessageFlags(Field(0b011000));
          });
        }).not.toThrow();

        expect(() => {
          Provable.runAndCheck(() => {
            verifyMessageFlags(Field(0b001000));
          });
        }).not.toThrow();

        expect(() => {
          Provable.runAndCheck(() => {
            verifyMessageFlags(Field(0b000000));
          });
        }).not.toThrow();
      });

      it('Failure scenario', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            verifyMessageFlags(Field(0b010000));
          });
        }).toThrow();
      });
    });

    describe('flags: rule 3', () => {
      it('Success scenarios', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            verifyMessageFlags(Field(0b000100));
          });
        }).not.toThrow();

        expect(() => {
          Provable.runAndCheck(() => {
            verifyMessageFlags(Field(0b000011));
          });
        }).not.toThrow();
      });

      it('Failure scenario', () => {
        expect(() => {
          Provable.runAndCheck(() => {
            verifyMessageFlags(Field(0b000101));
          });
        }).toThrow();
      });
    });
  });

  describe('getMessageData', () => {
    it('Should remove flags', () => {
      const raw = 0xdeadbeefdeadbeefn;
      const data = getMessageData(Field((raw << 6n) | 0b100000n));
      expect(data).toEqual(Field(raw << 6n));
    });
  });

  describe('data not null', () => {
    it('Assert should fail with null data', () => {
      expect(() => {
        Provable.runAndCheck(() => {
          assertMessageDataNotZero(Field(0b100000));
        });
      }).toThrow();
    });

    it('Assert should pass with non null data', () => {
      expect(() => {
        Provable.runAndCheck(() => {
          assertMessageDataNotZero(Field(0b1100000));
        });
      }).not.toThrow();
    });
  });

  describe('constructMessageHelper', () => {
    const raw = 0xdeadbeefdeadbeefn;
    const flags = 0b100000n;

    it('Should construct a message', () => {
      const msg = constructMessageHelper(Field(raw), Field(flags));
      expect(() => {
        Provable.runAndCheck(() => {
          verifyMessage(msg);
        });
      }).not.toThrow();
      expect(msg).toEqual(Field((raw << 6n) | flags));
    });

    it('Should construct a secret message', () => {
      const msg = constructSecretMessageHelper(Field(raw), Field(flags));

      expect(() => {
        Provable.runAndCheck(() => {
          verifyMessage(msg);
        });
      }).not.toThrow();
      expect(msg).toEqual(
        Field(
          (Poseidon.hash(Field(raw).toFields()).toBigInt() >> 6n) << 6n
        ).add(Field(flags))
      );
    });
  });
});
