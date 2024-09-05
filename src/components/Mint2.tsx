import React, { useState, useEffect } from "react";
import { provider, program } from "../anchorProvider";
import { web3 } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getProvider } from "../detectProvider";
import { Transaction } from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

const Mint: React.FC = () => {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState<any | null>(0);
  const [rooms, setRooms] = useState<any | null>(0);
  const [bathrooms, setBathrooms] = useState<any | null>(0);
  const [parking, setParking] = useState<any | null>(0);
  const [area, setArea] = useState<any | null>(0);
  const [image, setImage] = useState<any | null>(null);
  const [uri, setUri] = useState("");
  const [stateInitialized, setStateInitialized] = useState<boolean>(false);

  const pinataGatewayUrl = process.env.REACT_APP_PINATA_GATEWAY_URL;

  // Hooks for wallet and connection
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  useEffect(() => {
    const checkInitialization = async () => {
      try {
        const stateAccountPublicKey = new web3.PublicKey(
          "6f5afGVi6rUuPsStY9UgnCK5gVXjn8hh1vQMwSoBffKN"
        );

        const stateAccount = await provider.connection.getAccountInfo(
          stateAccountPublicKey
        );
        if (stateAccount) {
          setStateInitialized(true);
        }
      } catch (error) {
        console.error("Error checking initialization:", error);
      }
    };

    checkInitialization();
  }, []);

  const handleFileChange = (event: any) => {
    if (!event.target.files) return;
    setImage(event.target.files[0]);
  };

  const initializeState = async () => {
    try {
      const seedBytes = new Uint8Array([
        115, 116, 97, 116, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ]); // seed is 'state'
      const stateAccount = web3.Keypair.fromSeed(seedBytes);

      const tx = await program.methods
        .initialize()
        .accounts({
          state: new web3.PublicKey(
            "6f5afGVi6rUuPsStY9UgnCK5gVXjn8hh1vQMwSoBffKN"
          ),
          signer: provider.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      console.log("Initialize tx signature: ", tx);

      setStateInitialized(true);
    } catch (error) {
      console.error("Error initializing state:", error);
    }
  };

  const mintNft = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    if (!publicKey) {
      alert("Wallet not connected");
      return;
    }

    if (!stateInitialized) {
      alert("State is not initialized. Initializing the state first.");
      await initializeState();
      return;
    }

    try {
      // Upload image to IPFS and create metadata
      const formData = new FormData();
      formData.append("file", image);
      const options = JSON.stringify({
        cidVersion: 0,
      });
      formData.append("pinataOptions", options);
      const metadata = JSON.stringify({
        name: name,
      });
      formData.append("pinataMetadata", metadata);

      const res = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_VITE_PINATA_JWT}`,
          },
          body: formData,
        }
      );

      const resDataJson = await res.json();
      const tokenImageUri = `${pinataGatewayUrl}/ipfs/${resDataJson.IpfsHash}`;
      console.log("NFT image saved to IPFS! Creating metadata...");

      // Create NFT metadata
      const data = JSON.stringify({
        pinataContent: {
          name: name,
          symbol: name.toUpperCase(),
          description: "Real Estate NFT",
          image: tokenImageUri,
          attributes: [
            {
              trait_type: "numberOfRooms",
              value: rooms,
            },
            {
              trait_type: "numberOfBathrooms",
              value: bathrooms,
            },
            {
              trait_type: "numberOfParking",
              value: parking,
            },
            {
              trait_type: "propertyAreaInSqft",
              value: area,
            },
            {
              trait_type: "address",
              value: address,
            },
          ],
          properties: {},
          collection: {},
        },
        pinataMetadata: {
          name: "Metadata.json",
        },
      });

      // Upload metadata to IPFS
      const res2 = await fetch(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_VITE_PINATA_JWT}`,
            "Content-Type": "application/json",
          },
          body: data,
        }
      );
      const resData2 = await res2.json();
      setUri(`${pinataGatewayUrl}/ipfs/${resData2.IpfsHash}`);
      console.log("NFT metadata saved to IPFS!");
      setTimeout(() => {
        console.log("URI: ", uri);
      }, 2000);

      // Get mintAccount using the seed
      const seeds = [Buffer.from("mint"), publicKey.toBuffer()];
      const [mintAccountPublicKey] = web3.PublicKey.findProgramAddressSync(
        seeds,
        program.programId
      );
      console.log("mintAccountPublicKey: ", mintAccountPublicKey.toBase58());

      // const ata = web3.PublicKey.findProgramAddressSync(
      //   [
      //     publicKey.toBuffer(),
      //     // TOKEN_PROGRAM_ID.toBuffer(),
      //     ASSOCIATED_TOKEN_PROGRAM_ID.toBuffer(),
      //     mintAccountPublicKey.toBuffer(),
      //   ],
      //   // ASSOCIATED_TOKEN_PROGRAM_ID
      //   TOKEN_PROGRAM_ID
      // )[0];
      // console.log("ata: ", ata.toBase58());
      const ata = await getAssociatedTokenAddress(
        mintAccountPublicKey,
        new web3.PublicKey(publicKey.toString())
      );
      console.log("ata: ", ata.toBase58());

      const atatx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          publicKey,
          ata,
          publicKey,
          mintAccountPublicKey,
          program.programId,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
      let { blockhash } = await connection.getLatestBlockhash("finalized");
      atatx.recentBlockhash = blockhash;
      atatx.feePayer = publicKey;

      // Send transaction
      let sig = await sendTransaction(atatx, connection, {
        skipPreflight: true,
      });
      console.log("atatx signature: ", sig);
    } catch (err) {
      console.error("Error minting NFT: ", err);
    }
  };

  return (
    <>
      <h1>Mint your NFT</h1>
      <form onSubmit={mintNft}>
        <label>
          Name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <br />
        <br />
        <label>
          Address:
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </label>
        <br />
        <br />
        <label>
          Price:
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </label>
        <br />
        <br />
        <label>
          Rooms:
          <input
            type="number"
            value={rooms}
            onChange={(e) => setRooms(e.target.value)}
            required
          />
        </label>
        <br />
        <br />
        <label>
          Bathrooms:
          <input
            type="number"
            value={bathrooms}
            onChange={(e) => setBathrooms(e.target.value)}
            required
          />
        </label>
        <br />
        <br />
        <label>
          Parking:
          <input
            type="number"
            value={parking}
            onChange={(e) => setParking(e.target.value)}
            required
          />
        </label>
        <br />
        <br />
        <label>
          Area:
          <input
            type="number"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            required
          />
        </label>
        <br />
        <br />
        <label>
          Image:
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e)}
            required
          />
        </label>
        <br />
        <br />
        <button type="submit">MINT</button>
      </form>
    </>
  );
};

export default Mint;
