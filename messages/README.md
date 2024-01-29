# Secret message deposit with allowlist

This contract allows for a set of eligible users to deposit a secret message.

An administrator is designated during the contract's initialization.
The administrator can register up to 100 eligible users.

Any eligible user can deposit a secret message only once, then he is not eligible anymore.

A message is a field containing:

- Data: a 248 bits segment
- Flags: a 6 bits segment

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                                                               +
|                                                               |
+                                                               +
|                                                               |
+                                                               +
|                                                               |
+                          Data - 248                           +
|                                                               |
+                                                               +
|                                                               |
+                                                               +
|                                                               |
+                                               +-+-+-+-+-+-+-+-+
|                                               | Flags - 6 |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

There's some restrictions on the data and flags fields:

- **data: it can't be all zeros** (however you can hash the 'all zeros' data and use the hash as data)
- Flags:
  - Rule 1: If flag 1 is true, then all other flags must be false
  - Rule 2: If flag 2 is true, then flag 3 must be true
  - Rule 3: If flag 4 is true, then flags 5 and 6 must be false

## Data storage

The contract only keep track of the root of a Merkle tree, the administrator public key and the counter of registered users.
The MerkleTree follow a custom implementation of a Merkle map with the `MerkleMapMsg` class (see `src/MerkleMapMsg.ts` and `src/MerkleMapMsg.test.ts`).
This contains functions to ensure every state mutation is valid, and will be enforced by the contract.

The storage of the whole Merkle tree is left to the client.
An example of off-chain storage implementation is provided (see `src/OffChainStorage.ts` and `src/MerkleMapMsg.test.ts`).
This contains functions to check the validity of state mutations, but it is not part of the proof sent to the contract.

## Secret message

The client need to use the `encoding.constructSecretMessageHelper(data: Field, flags: Field)` function to use `Poseidon` to hash the data.
However, we don't want to hash the flags, so the resulting 254 bits of the `Poseidon.hash(data)` is shifted to the left by 6 bits, and the flags are added to the right.

## Contracts entrypoints

### Deploy

The deployer will become the administrator.

### Register

```ts
@method register(addressWitness: MerkleMapWitness)
```

Only admin. Register a new user as eligible.
The `addressWitness` is a Merkle tree witness of the user's address.
You can use `OffChainStorage.setEligible(address: PublicKey, admin_pk: PrivateKey): MerkleMapWitness` to get the witness.

### Deposit

```ts
@method deposit_message(senderWitness: MerkleMapWitness, msg: Field)
```

Only eligible users. Deposit a message.
After depositing a message, the user is not eligible anymore, but the registered users counter is not decremented.

An event `MessageDepositedEvent` with the attached `msg` is emitted.

## How to build

```sh
npm run build
```

## How to run tests

```sh
npm run test
npm run testw # watch mode
```

## How to run coverage

```sh
npm run coverage
```

## License

[Apache-2.0](LICENSE)
