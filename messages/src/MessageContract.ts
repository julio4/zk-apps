import {
  Field,
  UInt8,
  PublicKey,
  SmartContract,
  state,
  State,
  method,
  MerkleMapWitness,
} from 'o1js';

import { verifyMessage } from './encoding';
import { MerkleMapMsg } from './MerkleMapMsg';

const maxAddresses = 100;

/**
 * TODO doc
 */
export class MessageContract extends SmartContract {
  @state(PublicKey) admin = State<PublicKey>();
  @state(Field) root = State<Field>();
  @state(UInt8) eligible_count = State<UInt8>();

  init() {
    super.init();
    this.admin.set(this.sender);
    this.root.set(new MerkleMapMsg().getRoot());
    this.eligible_count.set(new UInt8(0));
  }

  events = {
    MessageDepositedEvent: Field,
  };

  // Add eligible address
  // Up to 100 addresses
  @method register(addressWitness: MerkleMapWitness) {
    // Only admin
    const admin = this.admin.getAndRequireEquals();
    admin.assertEquals(this.sender);

    // Maximum number of addresses
    const eligible_count = this.eligible_count.getAndRequireEquals();
    eligible_count.assertLessThan(maxAddresses);

    // Assert that the address is not already registered
    const root = this.root.getAndRequireEquals();
    MerkleMapMsg.isUnset(root, addressWitness).assertTrue();

    // Set the address to eligible
    const newRoot = MerkleMapMsg.setEligible(addressWitness);

    // Mutate states
    this.root.set(newRoot);
    this.eligible_count.set(eligible_count.add(1));
  }

  // Only eligible addresses
  // Eligible addresses can deposit messages
  // Last 6 bits of message are flags
  @method deposit_message(senderWitness: MerkleMapWitness, msg: Field) {
    // Only if sender is eligible
    const root = this.root.getAndRequireEquals();
    MerkleMapMsg.assertEligible(root, senderWitness, this.sender);

    // Message validation
    verifyMessage(msg);

    // Deposit message
    const newRoot = MerkleMapMsg.setMessage(senderWitness, msg);
    this.root.set(newRoot);

    // Emit event
    this.emitEvent('MessageDepositedEvent', msg);
  }
}
