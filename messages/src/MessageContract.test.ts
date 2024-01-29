import { Field, Mina, PrivateKey, PublicKey, AccountUpdate, UInt8 } from 'o1js';
import { MessageContract } from './MessageContract';
import { constructSecretMessageHelper } from './encoding';
import OffChainStorage from './OffChainStorage';
import MerkleMapMsg, { State } from './MerkleMapMsg';

let proofsEnabled = false;

describe('MessageContract', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    accounts: { publicKey: PublicKey; privateKey: PrivateKey }[],
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: MessageContract,
    storage: OffChainStorage;

  const msg = constructSecretMessageHelper(
    Field(0x1234567890abcdefn),
    Field(0b100000)
  );

  beforeAll(async () => {
    if (proofsEnabled) await MessageContract.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    accounts = Local.testAccounts.slice(1);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new MessageContract(zkAppAddress);
    storage = new OffChainStorage(deployerKey.toPublicKey());
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `MessageContract` smart contract', async () => {
    await localDeploy();
    const admin = zkApp.admin.get();
    const eligible_count = zkApp.eligible_count.get();
    const root = zkApp.root.get();

    expect(admin).toEqual(deployerAccount);
    expect(eligible_count).toEqual(new UInt8(0));
    expect(root).toEqual(storage.map.getRoot());
  });

  describe('Register eligible accounts (Only admin)', () => {
    it('Admin can register new account', async () => {
      await localDeploy();
      const account = accounts[0];
      expect(zkApp.eligible_count.get()).toEqual(new UInt8(0));

      // register new eligible account transaction
      const witness = storage.setEligible(account.publicKey, deployerKey);
      const txn = await Mina.transaction(deployerAccount, () => {
        zkApp.register(witness);
      });
      await txn.prove();
      await txn.sign([deployerKey]).send();

      storage.assertSynced(zkApp.root.get());
      expect(zkApp.eligible_count.get()).toEqual(new UInt8(1));
    });

    it('Non-admin cannot register account', async () => {
      await localDeploy();
      const account = accounts[0];
      expect(zkApp.eligible_count.get()).toEqual(new UInt8(0));

      // storage.setEligible(account.publicKey, account.privateKey);
      // will fail because we implemented an admin check in OffChainStorage.setEligible()
      // However, we don't trust OffChainStorage
      const witness = storage.map.getWitness(
        MerkleMapMsg.keyOf(account.publicKey)
      );
      storage.map.set(
        MerkleMapMsg.keyOf(account.publicKey),
        Field(State.Eligible)
      );

      expect(async () => {
        const txn = await Mina.transaction(account.publicKey, () => {
          zkApp.register(witness);
        });
        await txn.prove();
        await txn.sign([account.privateKey]).send();
      }).rejects.toThrow();
      expect(() => storage.assertSynced(zkApp.root.get())).toThrow();
      expect(zkApp.eligible_count.get()).toEqual(new UInt8(0));
    });

    it('Admin cannot register account twice (before deposit)', async () => {
      await localDeploy();
      const account = accounts[0];

      // register new eligible account transaction
      const witness = storage.setEligible(account.publicKey, deployerKey);
      const txn = await Mina.transaction(deployerAccount, () => {
        zkApp.register(witness);
      });
      await txn.prove();
      await txn.sign([deployerKey]).send();

      // Force set eligible again in local storage
      const newWitness = storage.map.getWitness(
        MerkleMapMsg.keyOf(account.publicKey)
      );
      expect(async () => {
        const txn = await Mina.transaction(deployerAccount, () => {
          zkApp.register(newWitness);
        });
        await txn.prove();
        await txn.sign([deployerKey]).send();
      }).rejects.toThrow();
      // expect(() => storage.assertSynced(zkApp.root.get())).toThrow();
      // Actually, it should not throw because we writed the same state Eligible -> Eligible
      // However, the transaction must throw and the eligible_count must not change
      expect(zkApp.eligible_count.get()).toEqual(new UInt8(1));
    });

    it('Admin cannot register account twice (after deposit)', async () => {
      await localDeploy();
      const account = accounts[0];

      // register new eligible account transaction
      const witness = storage.setEligible(account.publicKey, deployerKey);
      const txn = await Mina.transaction(deployerAccount, () => {
        zkApp.register(witness);
      });
      await txn.prove();
      await txn.sign([deployerKey]).send();

      // deposit message transaction
      const depositWitness = storage.depositMessage(account.publicKey, msg);
      const depositTxn = await Mina.transaction(account.publicKey, () => {
        zkApp.deposit_message(depositWitness, msg);
      });
      await depositTxn.prove();
      await depositTxn.sign([account.privateKey]).send();
      storage.assertSynced(zkApp.root.get());

      // Force set eligible again in local storage
      const newWitness = storage.map.getWitness(
        MerkleMapMsg.keyOf(account.publicKey)
      );
      storage.map.set(
        MerkleMapMsg.keyOf(account.publicKey),
        Field(State.Eligible)
      );
      expect(async () => {
        const txn = await Mina.transaction(deployerAccount, () => {
          zkApp.register(newWitness);
        });
        await txn.prove();
        await txn.sign([deployerKey]).send();
      }).rejects.toThrow();
      // expect(() => storage.assertSynced(zkApp.root.get())).not.toThrow();
      // same as above
      expect(zkApp.eligible_count.get()).toEqual(new UInt8(1));
    });

    // This is a long running test
    // We could speed it up with recursion
    // @see 'Maximum 100 register (fast)' for a version with a predefined root
    it.skip('Maximum 100 register', async () => {
      console.log('Warning: this test is long running, consider `skip` it');
      await localDeploy();
      expect(zkApp.eligible_count.get()).toEqual(new UInt8(0));
      const max = 100;

      const acc = Array.from({ length: max + 1 }, () => {
        const pk = PrivateKey.random();
        return { publicKey: pk.toPublicKey(), privateKey: pk };
      });
      for (let i = 0; i < max; i++) {
        const account = acc[i];
        const witness = storage.setEligible(account.publicKey, deployerKey);
        const txn = await Mina.transaction(deployerAccount, () => {
          zkApp.register(witness);
        });
        await txn.prove();
        await txn.sign([deployerKey]).send();
        expect(zkApp.eligible_count.get()).toEqual(new UInt8(i + 1));
      }
      storage.assertSynced(zkApp.root.get());

      // register new eligible account transaction
      const account = acc[max];
      // Force set eligible
      const witness = storage.map.getWitness(
        MerkleMapMsg.keyOf(account.publicKey)
      );
      storage.map.set(
        MerkleMapMsg.keyOf(account.publicKey),
        Field(State.Eligible)
      );
      expect(async () => {
        const txn = await Mina.transaction(deployerAccount, () => {
          zkApp.register(witness);
        });
        await txn.prove();
        await txn.sign([deployerKey]).send();
      }).rejects.toThrow();
      expect(() => storage.assertSynced(zkApp.root.get())).toThrow();
      expect(zkApp.eligible_count.get()).toEqual(new UInt8(max));
    });
  });

  describe('Deposit message (Only eligible accounts)', () => {
    it('Eligible account can deposit message', async () => {
      await localDeploy();
      const account = accounts[0];

      const eligibleWitness = storage.setEligible(
        account.publicKey,
        deployerKey
      );
      const eligibleTxn = await Mina.transaction(deployerAccount, () => {
        zkApp.register(eligibleWitness);
      });
      await eligibleTxn.prove();
      await eligibleTxn.sign([deployerKey]).send();
      storage.assertSynced(zkApp.root.get());

      // deposit message transaction
      const witness = storage.depositMessage(account.publicKey, msg);
      const txn = await Mina.transaction(account.publicKey, () => {
        zkApp.deposit_message(witness, msg);
      });
      await txn.prove();
      await txn.sign([account.privateKey]).send();

      storage.assertSynced(zkApp.root.get());
      expect(storage.isDeposited(account.publicKey)).toEqual(true);
    });

    it('Non-eligible account cannot deposit message', async () => {
      await localDeploy();
      const account = accounts[0];

      // storage.depositMessage(account.publicKey, msg);
      const witness = storage.map.getWitness(
        MerkleMapMsg.keyOf(account.publicKey)
      );
      storage.map.set(MerkleMapMsg.keyOf(account.publicKey), msg);

      expect(async () => {
        const txn = await Mina.transaction(account.publicKey, () => {
          zkApp.deposit_message(witness, msg);
        });
        await txn.prove();
        await txn.sign([account.privateKey]).send();
      }).rejects.toThrow();
      expect(() => storage.assertSynced(zkApp.root.get())).toThrow();
    });

    it('Eligible account that deposited are not eligible anymore (=> can deposit once)', async () => {
      await localDeploy();
      const account = accounts[0];

      const eligibleWitness = storage.setEligible(
        account.publicKey,
        deployerKey
      );
      const eligibleTxn = await Mina.transaction(deployerAccount, () => {
        zkApp.register(eligibleWitness);
      });
      await eligibleTxn.prove();
      await eligibleTxn.sign([deployerKey]).send();
      storage.assertSynced(zkApp.root.get());

      // deposit message transaction
      const depositWitness = storage.depositMessage(account.publicKey, msg);
      const depositTxn = await Mina.transaction(account.publicKey, () => {
        zkApp.deposit_message(depositWitness, msg);
      });
      await depositTxn.prove();
      await depositTxn.sign([account.privateKey]).send();
      storage.assertSynced(zkApp.root.get());

      expect(storage.isEligible(account.publicKey)).toEqual(false);

      // Force deposit again in local storage
      const newMsg = constructSecretMessageHelper(
        Field(0xdead),
        Field(0b100000)
      );
      const witness = storage.map.getWitness(
        MerkleMapMsg.keyOf(account.publicKey)
      );
      storage.map.set(MerkleMapMsg.keyOf(account.publicKey), newMsg);
      expect(async () => {
        const txn = await Mina.transaction(account.publicKey, () => {
          zkApp.deposit_message(witness, msg);
        });
        await txn.prove();
        await txn.sign([account.privateKey]).send();
      }).rejects.toThrow();
      expect(() => storage.assertSynced(zkApp.root.get())).toThrow();
    });
  });
});
