import {
  AnchorProvider,
  Program,
  web3,
  Idl,
  setProvider,
} from "@coral-xyz/anchor";
import idl from "./contracts/IDL.json";

const connection = new web3.Connection(
  web3.clusterApiUrl("devnet"),
  "confirmed"
);
const wallet = window.solana;

const provider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
setProvider(provider);

const program = new Program(idl as Idl, provider);

export { provider, program };
