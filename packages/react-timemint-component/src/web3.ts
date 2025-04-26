import { ethers } from "ethers";
import timemintAbi from "./abi/timemint.json";

export function getProvider(): ethers.BrowserProvider {
  if (!(window as any).ethereum) throw new Error("No wallet found. Please install MetaMask or another wallet.");
  return new ethers.BrowserProvider((window as any).ethereum);
}

export async function getContract(signerOrProvider?: any, contractAddress?: string) {
  if (!contractAddress) throw new Error("No contract address provided");
  const provider = signerOrProvider || getProvider();
  return new ethers.Contract(contractAddress, timemintAbi as any, provider);
}

export async function requestAccount(): Promise<string> {
  const provider = getProvider();
  const accounts = await provider.send('eth_requestAccounts', []);
  return accounts[0];
}
