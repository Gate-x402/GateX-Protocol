import { JsonRpcProvider } from "ethers";
import type { Network } from "@gatex/common";

export function createBNBProvider(network: Network, rpcUrl: string): JsonRpcProvider {
  return new JsonRpcProvider(rpcUrl);
}

export function getTokenAddress(token: string, addresses: Record<string, string>): string {
  const address = addresses[token];
  if (!address) {
    throw new Error(`Token address not found for ${token}`);
  }
  return address;
}

export const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
] as const;

