# Spy Master Rollup using ProtoKit

### Running tests

```zsh
# run and watch tests for the `chain` package
pnpm run test --filter=chain -- --watchAll
```

### Privacy issue

With this design, every transactions contains the agent security code in clear and one could read the agent security code as soon as the transaction enters the mempool.
We could use `state proof` to generate a off-chain proof that the agent security code is correct and ensuring privacy and authenticity of the agent security code by verifying the proof on-chain as part of the transaction.
