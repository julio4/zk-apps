import { Field, PrivateKey } from 'o1js';
import { OffChainStorage } from './OffChainStorage';
import { constructSecretMessageHelper } from './encoding';
import { State } from './MerkleMapMsg';

describe('MerkleMapMsg in OffChainStorage', () => {
  const admin = PrivateKey.random();
  const msg = constructSecretMessageHelper(
    Field(0x1234567890abcdefn),
    Field(0b100000)
  );
  let storage: OffChainStorage;

  beforeEach(() => {
    storage = new OffChainStorage(admin.toPublicKey());
  });

  it('Should be State.Unset at initialization', () => {
    const random = PrivateKey.random();
    const address = random.toPublicKey();

    expect(storage.isEligible(address)).toEqual(false);
    expect(storage.get(address)).toEqual(Field(State.Unset));
    expect(storage.isDeposited(address)).toEqual(false);
  });

  it('Should be State.Eligible after setEligible()', () => {
    const sender = PrivateKey.random().toPublicKey();
    storage.setEligible(sender, admin);
    expect(storage.isEligible(sender)).toEqual(true);
    expect(storage.get(sender)).toEqual(Field(State.Eligible));
    expect(storage.isDeposited(sender)).toEqual(false);
  });

  it('Should be State.Deposited and not State.Eligible after depositMessage()', () => {
    const sender = PrivateKey.random().toPublicKey();
    storage.setEligible(sender, admin);
    expect(storage.isEligible(sender)).toEqual(true);
    expect(storage.get(sender)).toEqual(Field(State.Eligible));

    storage.depositMessage(sender, msg);
    expect(storage.get(sender)).toEqual(msg);

    expect(storage.isEligible(sender)).toEqual(false);
    expect(storage.get(sender)).not.toEqual(Field(State.Eligible));
    expect(storage.get(sender)).not.toEqual(Field(State.Unset));
    expect(storage.isDeposited(sender)).toEqual(true);
  });

  it('Should fail to depositMessage() if not Eligible', () => {
    const sender = PrivateKey.random().toPublicKey();
    expect(storage.get(sender)).toEqual(Field(State.Unset));
    expect(() => {
      storage.depositMessage(sender, msg);
    }).toThrow();
  });
});
