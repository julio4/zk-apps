import {
  Bool,
  Field,
  MerkleMap,
  MerkleMapWitness,
  Poseidon,
  PublicKey,
} from 'o1js';

export enum State {
  Unset = 0, //
  Eligible = 0b110110, // This is an invalid flags sequence
  // Deposited, // Any field that satisfy verifyMessage()
}

/**
 * Wrapper of MerkleMap to store messages.
 * Provide helper functions to simplify the logic of the zkApp.
 */
export class MerkleMapMsg extends MerkleMap {
  static keyOf(sender: PublicKey): Field {
    return Poseidon.hash(sender.toFields());
  }

  static isUnset(targetRoot: Field, addressWitness: MerkleMapWitness): Bool {
    const [root] = addressWitness.computeRootAndKey(Field(State.Unset));
    return root.equals(targetRoot);
  }

  static assertEligible(
    targetRoot: Field,
    addressWitness: MerkleMapWitness,
    address: PublicKey
  ) {
    const [witnessRoot, witnessKey] = addressWitness.computeRootAndKey(
      Field(State.Eligible)
    );
    witnessKey.assertEquals(MerkleMapMsg.keyOf(address));
    witnessRoot.assertEquals(targetRoot);
  }

  static setEligible(witness: MerkleMapWitness): Field {
    const [newRoot] = witness.computeRootAndKey(Field(State.Eligible));
    return newRoot;
  }

  static setMessage(witness: MerkleMapWitness, msg: Field): Field {
    const [newRoot] = witness.computeRootAndKey(msg);
    return newRoot;
  }
}

export default MerkleMapMsg;
