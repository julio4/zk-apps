import { UInt32, Provable, SelfProof, ZkProgram } from 'o1js';
import { ProvableMessage } from './Message';

export const MessageProgram = ZkProgram({
  name: 'message-program',
  publicInput: UInt32,
  publicOutput: UInt32,
  methods: {
    init: {
      privateInputs: [],
      method(lowMsg: UInt32) {
        return lowMsg;
      },
    },
    processMessage: {
      privateInputs: [SelfProof, ProvableMessage],
      method(
        _: UInt32,
        earlierProof: SelfProof<UInt32, UInt32>,
        msg: ProvableMessage
      ) {
        const isValid = msg.agent.isValid();
        earlierProof.verifyIf(isValid);
        // Only process messages with valid details
        return Provable.if(isValid, msg.nb, earlierProof.publicOutput);
      },
    },
  },
});

export const MessageProgramProof_ = ZkProgram.Proof(MessageProgram);
export class MessageProgramProof extends MessageProgramProof_ {}

// process batch of messages
export const processMessages = async (
  pendingMessages: ProvableMessage[],
  previousProof?: MessageProgramProof
) =>
  await pendingMessages.reduce<Promise<MessageProgramProof>>(
    async (proofPromise, msg) => {
      const proof = await proofPromise;
      return MessageProgram.processMessage(UInt32.zero, proof, msg);
    },
    Promise.resolve(previousProof || (await MessageProgram.init(UInt32.zero)))
  );
