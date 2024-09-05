import React, { useState, useEffect } from "react";
import { getProvider } from "../detectProvider";
import { program } from "../anchorProvider";
import { web3 } from "@coral-xyz/anchor";
import axios from "axios";
import { encode } from "@coral-xyz/anchor/dist/cjs/utils/bytes/bs58";
import {
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const MyNfts: React.FC = () => {
  const [nftData, setNftData] = useState<any[]>([]);
  const [ownedNftData, setOwnedNftData] = useState<any[]>([]);
  const [transferNftData, setTransferNftData] = useState<any[]>([]);
  const [transferNftDataIndex, setTransferNftDataIndex] = useState<number[]>(
    []
  );
  const [pendingOwnersList, setPendingOwnersList] = useState<any[]>([]);

  useEffect(() => {
    const getNftDetails = async () => {
      try {
        const provider = getProvider();

        const nftOwnersResponse = await program.methods
          .getOwners()
          .accounts({
            state: new web3.PublicKey(
              "9Vj7E3HAc3bcVHz2ZB3J3vTT4DGirdQ7eHawhde1fRUZ"
            ),
            signer: provider.publicKey,
          })
          .view();
          console.log("nft owner view: ", nftOwnersResponse);

        const nftStatesResponse = await program.methods
          .getNftStates()
          .accounts({
            state: new web3.PublicKey(
              "9Vj7E3HAc3bcVHz2ZB3J3vTT4DGirdQ7eHawhde1fRUZ"
            ),
            signer: provider.publicKey,
          })
          .view();

        const nftMetadataUriResponse = await program.methods
          .getMetadatauri()
          .accounts({
            state: new web3.PublicKey(
              "9Vj7E3HAc3bcVHz2ZB3J3vTT4DGirdQ7eHawhde1fRUZ"
            ),
            signer: provider.publicKey,
          })
          .view();
          console.log("nft metadata uri response: ", nftMetadataUriResponse)

        const nftPendingOwnerResponse = await program.methods
          .getNftPendingOwners()
          .accounts({
            state: new web3.PublicKey(
              "9Vj7E3HAc3bcVHz2ZB3J3vTT4DGirdQ7eHawhde1fRUZ"
            ),
            signer: provider.publicKey,
          })
          .view();
        console.log("pending owners", pendingOwnersList);

        const nftDataPromises = nftMetadataUriResponse.map(
          async (uri: string) => {
            console.log(uri);
            const response = await axios.get(
              `https://gold-quick-antelope-719.mypinata.cloud/ipfs/${uri}`
            );
            return response.data;
          }
        );
        const fetchedNftData = await Promise.all(nftDataPromises);

        const data = nftMetadataUriResponse.map(
          (_uri: string, index: number) => ({
            data: fetchedNftData[index],
            owner: encode(nftOwnersResponse[index]),
            state: nftStatesResponse[index],
          })
        );

        const ownedNfts = data.filter(
          (nft: any) =>
            nft.owner === provider.publicKey.toBase58() &&
            (nft.state === 0 || nft.state === 2)
        );

        const transferNftIndices: number[] = [];
        const transferNftsIndices = data.filter((nft: any, index: number) => {
          if (nft.owner === provider.publicKey.toBase58() && nft.state === 1) {
            transferNftIndices.push(index);
          }
        });
        setTransferNftDataIndex(transferNftIndices);
        console.log(transferNftIndices);

        const transferNfts = data.filter(
          (nft: any) =>
            nft.owner === provider.publicKey.toBase58() && nft.state === 1
        );
        console.log(transferNfts);

        setNftData(data);
        setOwnedNftData(ownedNfts);
        setTransferNftData(transferNfts);
        setPendingOwnersList(nftPendingOwnerResponse);
        console.log("pending owner: ", pendingOwnersList);
      } catch (error) {
        console.error("Error fetching NFT data:", error);
      }
    };

    getNftDetails();
  }, []);

  const handletransferClick = async (index: number) => {
    console.log(encode(pendingOwnersList[transferNftDataIndex[index]]));
    console.log(transferNftDataIndex[index]);
    console.log(
      "mint: ",
      nftData[transferNftDataIndex[index]].data.attributes[6].value
    );
    const provider = getProvider();

    const buyerAta = await getAssociatedTokenAddress(
      new web3.PublicKey(
        nftData[transferNftDataIndex[index]].data.attributes[6].value
      ),
      new web3.PublicKey(
        encode(pendingOwnersList[transferNftDataIndex[index]])
      ),
      false
    );
    let recipient = encode(pendingOwnersList[transferNftDataIndex[index]]);

    console.log("transferring of nft initiated");
    const tx = await program.methods
      .buyNft(transferNftDataIndex[index])
      .accounts({
        state: new web3.PublicKey(
          "9Vj7E3HAc3bcVHz2ZB3J3vTT4DGirdQ7eHawhde1fRUZ"
        ),
        mint: new web3.PublicKey(
          nftData[transferNftDataIndex[index]].data.attributes[6].value
        ),
        sender: new web3.PublicKey(provider.publicKey.toBase58()),
        recipient: new web3.PublicKey(recipient),
        sender_token_account: new web3.PublicKey(
          nftData[transferNftDataIndex[index]].data.attributes[8].value
        ),
        recipient_token_account: buyerAta,
        token_program: TOKEN_PROGRAM_ID,
        system_program: web3.SystemProgram.programId,
        associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log("transfer nft tx signature: ", tx);
    alert("Transfer successful!");
  };

  return (
    <div>
      <h1>My NFTs</h1>
      <div>
        <h2>NFTs you own</h2>
        {ownedNftData.length > 0 ? (
          <div>
            {ownedNftData.map((nft, index) => (
              <div key={index} className="nft-card">
                <img
                  src={`https://${nft.data.image}`}
                  alt="NFT"
                  className="nft-image"
                />
                <div className="nft-details">
                  <h3>Name: {nft.data.name}</h3>
                  <p>
                    <strong>Address:</strong> {nft.data.attributes[4].value}
                  </p>
                  <p>
                    <strong>Price: INR</strong> {nft.data.attributes[5].value}
                  </p>
                  <p>
                    <strong>Rooms:</strong> {nft.data.attributes[0].value}
                  </p>
                  <p>
                    <strong>Bathrooms:</strong> {nft.data.attributes[1].value}
                  </p>
                  <p>
                    <strong>Parking:</strong> {nft.data.attributes[2].value}
                  </p>
                  <p>
                    <strong>Area:</strong> {nft.data.attributes[3].value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>You don't own any NFTs yet.</p>
        )}
      </div>
      <div>
        <h2>NFTs yet to be transferred</h2>
        {transferNftData.length > 0 ? (
          <div>
            {transferNftData.map((nft, index) => (
              <div key={index} className="nft-card">
                <img
                  src={`https://${nft.data.image}`}
                  alt="NFT"
                  className="nft-image"
                />
                <div className="nft-details">
                  <h3>Name: {nft.data.name}</h3>
                  <p>
                    <strong>Buyer:</strong>{" "}
                    {transferNftDataIndex[index]
                      ? `${encode(
                          pendingOwnersList[transferNftDataIndex[index]]
                        ).slice(0, 4)}..${encode(
                          pendingOwnersList[transferNftDataIndex[index]]
                        ).slice(-4)}`
                      : "N/A"}
                  </p>
                  <p>
                    <strong>Address:</strong> {nft.data.attributes[4].value}
                  </p>
                  <p>
                    <strong>Price: INR</strong> {nft.data.attributes[5].value}
                  </p>
                  <p>
                    <strong>Rooms:</strong> {nft.data.attributes[0].value}
                  </p>
                  <p>
                    <strong>Bathrooms:</strong> {nft.data.attributes[1].value}
                  </p>
                  <p>
                    <strong>Parking:</strong> {nft.data.attributes[2].value}
                  </p>
                  <p>
                    <strong>Area:</strong> {nft.data.attributes[3].value}
                  </p>
                  <button onClick={() => handletransferClick(index)}>
                    Transfer
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No NFTs to transfer yet.</p>
        )}
      </div>
    </div>
  );
};

export default MyNfts;
