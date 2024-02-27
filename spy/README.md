# Batch message verifications

This contract allows to process batches of messages in a single transaction.

Type `Message`: 

```ts
type Message = {
  nb: number;
  agent: {
    id: number;
    x: number;
    y: number;
    checksum: number;
  };
};
```

Messages details (`agent` field) are checked privately and the contract only keep track of the highest message number that was verified.

Here's the constraints on the data:
- agent.id is a number between 0 and 3000
- agent.x is a number between 0 and 15000
- agent.y is a number between 5000 and 20000
- agent.checksum is the sum of agent.id, agent.x and agent.y
- agent.y is strictly greater than agent.x
- if agent.id is 0, the previous constraints are not enforced

## Contracts entrypoints

### Process

```ts
@method process(proof: MessageProgramProof)
```

The batch of transaction is processed by recursively processing each message locally using the `MessageProgram` ZkProgram's `processMessage` method and obtain a `MessageProgramProof`. You can also use the `init(lowMsg: UInt32)` method of this program to initialize the proof with the latest highest message number that was processed successfully (obtainable with the `highest_processed`).

You can use the `processMessages(pendingMessages: ProvableMessage[], previousProof?: MessageProgramProof): Promise<MessageProgramProof>` method to process a batch of messages, with a potential `previousProof` to continue from a previous batch/process in chunk to reduce local computation.

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
