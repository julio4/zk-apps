import { SmartContract, state, UInt32, State, method, Provable } from 'o1js';
import { MessageProgramProof } from './MessageProgram';

export class SpyContract extends SmartContract {
  @state(UInt32) highest_processed = State<UInt32>();

  init() {
    super.init();
    this.highest_processed.set(UInt32.zero);
  }

  @method process(rollupMessagesProof: MessageProgramProof) {
    const latestHighestNb = this.highest_processed.getAndRequireEquals();
    rollupMessagesProof.verify();
    const proofHighestNb = rollupMessagesProof.publicOutput;

    const newHighestNb = Provable.if(
      proofHighestNb.greaterThan(latestHighestNb),
      proofHighestNb,
      latestHighestNb
    );

    this.highest_processed.set(newHighestNb);
  }
}
