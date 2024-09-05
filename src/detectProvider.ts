export const getProvider = () => {
  if ("phantom" in window) {
    const provider = window.solana;

    if (provider?.isPhantom) {
      return provider;
    }
  }

  window.open("https://phantom.app/", "_blank");
};
