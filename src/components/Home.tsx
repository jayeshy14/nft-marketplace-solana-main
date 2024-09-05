import React, { useState, useEffect } from "react";
import { getProvider } from "../detectProvider";
import { provider, program } from "../anchorProvider";
import { web3 } from "@coral-xyz/anchor";
import { encode } from "@coral-xyz/anchor/dist/cjs/utils/bytes/bs58";
import axios from "axios";
import "./Home.css";
import {
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
const anchor = require("@project-serum/anchor");

const Home: React.FC = () => {
  const [nftData, setNftData] = useState<any[]>([]);
  const [cart, setCart] = useState<any | null>(null);
  const [indexInCart, setIndexInCart] = useState<number | null>(null);
  const [indexToDisplay, setIndexToDisplay] = useState<number[]>([]);

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

        const nftDataPromises = nftMetadataUriResponse.map(
          async (uri: string) => {
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
        console.log(data);

        let indexArray: number[] = [];
        const nftToDisplay = data.filter((nft: any) => nft.state === 0);
        const temp = data.filter((nft: any, index: number) => {
          if (nft.state === 0) {
            indexArray.push(index);
          }
        });
        setIndexToDisplay(indexArray);

        setNftData(nftToDisplay);
      } catch (error) {
        console.error("Error fetching NFT data:", error);
      }
    };

    getNftDetails();
  }, []);

  const handleBuyClick = (index: number) => {
    if (cart) {
      alert("Only one item in cart allowed");
      return; // Only one item in cart allowed
    }

    console.log("index: ", index);
    console.log("index in cart: ", indexToDisplay[index]);

    // Move the selected NFT to the cart
    setCart(nftData[index]);
    setIndexInCart(indexToDisplay[index]);
    console.log(nftData[index]);

    // Remove the selected NFT from the list
    const updatedNftData = nftData.filter((_, i) => i !== index);
    setNftData(updatedNftData);
  };

  const handlePayNowClick = async () => {
    if (!cart) return;

    // Implement the payment logic here
    console.log("Processing payment for NFT:", cart);

    try {
      const provider = getProvider();

      if (provider.publicKey.toBase58() === cart.owner) {
        alert("You cannot buy your own NFT");
        return;
      }

      // const buyerAta = await getAssociatedTokenAddress(
      //   new web3.PublicKey(cart.data.attributes[6].value),
      //   provider.publicKey,
      //   false
      // );
      // console.log("buyer ata: ", buyerAta.toBase58());
      // console.log(
      //   "owner ata: ",
      //   new web3.PublicKey(cart.data.attributes[7].value).toBase58()
      // );

      const sale_lamport = new anchor.BN(
        Number(cart.data.attributes[5].value) * LAMPORTS_PER_SOL
      );
      console.log(sale_lamport.toString());

      console.log("transferring of lamports initiated");
      const transferLamportsTx = await program.methods
        .transferLamports(indexInCart, sale_lamport)
        .accounts({
          state: new web3.PublicKey(
            "9Vj7E3HAc3bcVHz2ZB3J3vTT4DGirdQ7eHawhde1fRUZ"
          ),
          from: new web3.PublicKey(provider.publicKey),
          to: new web3.PublicKey(cart.owner),
          system_program: web3.SystemProgram.programId,
        })
        .rpc();
      console.log("transfer lamports tx signature: ", transferLamportsTx);
      alert("Payment successful!");
    } catch (error) {
      console.log("error calling buy_nft: ", error);
    }

    // After payment is processed, clear the cart
    setCart(null);
    setIndexInCart(null);
  };

  return (
    <div>
      <h1>List of NFTs</h1>
      <div className="nft-list">
        {nftData.map((nft, index) => (
          <div key={index} className="nft-card">
            <img
              src={`https://${nft.data.image}`}
              alt="NFT"
              className="nft-image"
            />
            <div className="nft-details">
              <h3>Name: {nft.data.name}</h3>
              <p>
                <strong>Owner:</strong>{" "}
                {nft.owner
                  ? `${nft.owner.slice(0, 4)}..${nft.owner.slice(-4)}`
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
              <button onClick={() => handleBuyClick(index)}>Buy</button>
            </div>
          </div>
        ))}
      </div>
      <div>
        <h2>Cart</h2>
        {cart ? (
          <div className="cart-item">
            <img
              src={`https://${cart.data.image}`}
              alt="Cart NFT"
              className="nft-image"
            />
            <div className="nft-details">
              <h3>Name: {cart.data.name}</h3>
              <p>
                <strong>Owner:</strong>{" "}
                {cart.owner
                  ? `${cart.owner.slice(0, 4)}..${cart.owner.slice(-4)}`
                  : "N/A"}
              </p>
              <p>
                <strong>Address:</strong> {cart.data.attributes[4].value}
              </p>
              <p>
                <strong>Price:</strong> {cart.data.attributes[5].value}
              </p>
              <p>
                <strong>Rooms:</strong> {cart.data.attributes[0].value}
              </p>
              <p>
                <strong>Bathrooms:</strong> {cart.data.attributes[1].value}
              </p>
              <p>
                <strong>Parking:</strong> {cart.data.attributes[2].value}
              </p>
              <p>
                <strong>Area:</strong> {cart.data.attributes[3].value}
              </p>
              <button onClick={handlePayNowClick}>Pay Now</button>
            </div>
          </div>
        ) : (
          <p>No item in cart</p>
        )}
      </div>
    </div>
  );
};

export default Home;
