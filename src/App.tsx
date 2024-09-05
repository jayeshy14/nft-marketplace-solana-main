import "./App.css";
import Home from "./components/Home";
import Mint from "./components/Mint";
import MyNfts from "./components/MyNfts";
import HomePage from "./components/HomePage";
import React, { FC, ReactNode, useMemo } from "react";
import { useContext, useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  BrowserRouter,
} from "react-router-dom";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";

const App: FC = () => {
  return (
    <Context>
      <Content />
    </Context>
  );
};
export default App;

const Context: FC<{ children: ReactNode }> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(() => [new PhantomWalletAdapter()], [network]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const Content: FC = () => {
  return (
    <div className="App">
      <WalletMultiButton />
      <h1>Real Estate NFT Marketplace</h1>
      <BrowserRouter>
        <div>
          <nav>
            <Link to="/">Home</Link>
            <br />
            <Link to="/home">All NFTs</Link>
            <br />
            <Link to="/mint">Mint</Link>
            <br />
            <Link to="/my-nfts">My NFTs</Link>
          </nav>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<Home />} />
            <Route path="/mint" element={<Mint />} />
            <Route path="/my-nfts" element={<MyNfts />} />
          </Routes>
        </div>
      </BrowserRouter>
    </div>
  );
};
