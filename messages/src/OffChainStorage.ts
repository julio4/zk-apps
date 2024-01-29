import { Field, MerkleMapWitness, PrivateKey, PublicKey } from 'o1js';
import { MerkleMapMsg, State } from './MerkleMapMsg';
import { verifyMessage } from './encoding';

/**
 * Really simple implementation of a simulated off-chain storage for our MerkleMapMsg.
 * All checks implemented are not enforced and should not be trusted.
 * This is only for testing purposes, before sending transactions to the contract.
 */
export class OffChainStorage {
  private admin: PublicKey;
  private eligible_count: number;
  // We keep map public to allow forced mutations without checks in tests
  map: MerkleMapMsg;

  constructor(admin: PublicKey) {
    this.map = new MerkleMapMsg();
    this.admin = admin;
    this.eligible_count = 0;
  }

  get(key: PublicKey): Field {
    return this.map.get(MerkleMapMsg.keyOf(key));
  }

  assertSynced(root: Field) {
    this.map.getRoot().assertEquals(root);
  }

  setEligible(address: PublicKey, admin_pk: PrivateKey): MerkleMapWitness {
    if (admin_pk.toPublicKey().equals(this.admin).not().toBoolean())
      throw new Error('Not admin');
    if (this.eligible_count === 100) throw new Error('Max addresses reached');

    // Get witness of address's Unset state
    this.map.get(MerkleMapMsg.keyOf(address)).assertEquals(Field(State.Unset));
    const witness = this.map.getWitness(MerkleMapMsg.keyOf(address));

    // Set new state locally
    this.map.set(MerkleMapMsg.keyOf(address), Field(State.Eligible));
    this.eligible_count++;
    return witness;
  }

  depositMessage(sender: PublicKey, msg: Field): MerkleMapWitness {
    verifyMessage(msg);
    // Get witness of sender's eligibility
    this.map
      .get(MerkleMapMsg.keyOf(sender))
      .assertEquals(Field(State.Eligible));
    const witness = this.map.getWitness(MerkleMapMsg.keyOf(sender));

    // Set new state locally
    this.map.set(MerkleMapMsg.keyOf(sender), msg);
    return witness;
  }

  isEligible(sender: PublicKey): boolean {
    const state = this.map.get(MerkleMapMsg.keyOf(sender));
    return state.equals(Field(State.Eligible)).toBoolean();
  }

  isDeposited(sender: PublicKey): boolean {
    let state = this.map.get(MerkleMapMsg.keyOf(sender));
    return state
      .equals(Field(State.Eligible))
      .not()
      .and(state.equals(Field(State.Unset)).not())
      .toBoolean();
  }
}

export default OffChainStorage;
