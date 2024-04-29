# Spy Master Rollup using ProtoKit

### Running tests

```zsh
# run and watch tests for the `chain` package
pnpm run test --filter=chain -- --watchAll
```

### Privacy issue

With this design, every transactions contains the agent security code and message content in clear and one could read these as soon as the transaction enters the mempool.
We could use `state proof` to generate an off-chain proof that the agent security code and message content is correct and verify the proof on-chain as part of the transaction to ensure privacy.
