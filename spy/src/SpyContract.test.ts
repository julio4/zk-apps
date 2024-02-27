import { Mina, PrivateKey, PublicKey, AccountUpdate, UInt32 } from 'o1js';
import { SpyContract } from './SpyContract';
import { validMsg } from './Message.test';
import {
  MessageProgram,
  processMessages,
} from './MessageProgram';
import { ProvableMessage } from './Message';

let proofsEnabled = true;

describe('SpyContract', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    accounts: { publicKey: PublicKey; privateKey: PrivateKey }[],
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: SpyContract;

  beforeAll(async () => {
    await MessageProgram.compile();
    if (proofsEnabled) await SpyContract.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    accounts = Local.testAccounts.slice(1);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new SpyContract(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `SpyContract` smart contract', async () => {
    await localDeploy();
    expect(zkApp.highest_processed.get()).toEqual(UInt32.zero);
  });

  it('process single valid message', async () => {
    await localDeploy();
    let proof = await processMessages([ProvableMessage.from(validMsg)]);

    const account = accounts[0];
    const txn = await Mina.transaction(account.publicKey, () => {
      zkApp.process(proof);
    });
    await txn.prove();
    await txn.sign([account.privateKey]).send();

    expect(zkApp.highest_processed.get()).toEqual(new UInt32(validMsg.nb));
  });

  it('should not process invalid message', async () => {
    await localDeploy();
    let invalidProof = await processMessages([
      ProvableMessage.from({
        ...validMsg,
        agent: { ...validMsg.agent, checksum: 999 },
      }),
    ]);

    const account = accounts[0];
    const txn = await Mina.transaction(account.publicKey, () => {
      zkApp.process(invalidProof);
    });
    await txn.prove();
    await txn.sign([account.privateKey]).send();

    expect(zkApp.highest_processed.get()).toEqual(UInt32.zero);
  });

  it('should process multiples messages', async () => {
    await localDeploy();
    let messages = Array.from({ length: 10 }, (_, i) =>
      ProvableMessage.from({ nb: i, agent: validMsg.agent })
    );
    let proof = await processMessages(messages);

    const account = accounts[0];
    const txn = await Mina.transaction(account.publicKey, () => {
      zkApp.process(proof);
    });
    await txn.prove();
    await txn.sign([account.privateKey]).send();

    expect(zkApp.highest_processed.get()).toEqual(
      new UInt32(messages[messages.length - 1].nb)
    );
  });
});
