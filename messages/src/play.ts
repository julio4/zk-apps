import { MerkleMapMsg } from "./MerkleMapMsg"
import { Provable, PrivateKey, PublicKey } from "o1js"

// accounts = {pk: PrivateKey, address: PublicKey}
// PrivateKey.random()
const generateAccounts = (n: number): {
  pk: PrivateKey,
  address: PublicKey
}[] => {
  const accounts = []
  for (let i = 0; i < n; i++) {
    const pk = PrivateKey.random()
    accounts[i] = {
      pk,
      address: pk.toPublicKey()
    }
  }
  return accounts
}

const map = new MerkleMapMsg()
Provable.log(map.getRoot())