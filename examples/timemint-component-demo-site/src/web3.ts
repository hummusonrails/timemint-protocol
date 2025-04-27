import { ethers } from "ethers";
import timemintAbi from "./abi/timemint.json";

const contractABI = timemintAbi;
const contractAddress = import.meta.env.VITE_TIMEMINT_CONTRACT_ADDRESS as string;

export function getProvider() {
  if (!(window as any).ethereum) throw new Error("No wallet found");
  return new ethers.BrowserProvider((window as any).ethereum);
}

export async function getContract(signerOrProvider?: any) {
  const provider = signerOrProvider || getProvider();
  return new ethers.Contract(contractAddress, contractABI, provider);
}

export async function getDebugOwnerInfo(address: string) {
  const contract = await getContract();
  return contract.debugOwnerInfo(address);
}
