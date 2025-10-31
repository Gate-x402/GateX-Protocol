import { Contract, Interface, Log } from "ethers";
import { ERC20_ABI } from "./provider";
import type { PayToken } from "@gatex/common";

const ERC20_INTERFACE = new Interface(ERC20_ABI);

export interface TransferLog {
  from: string;
  to: string;
  value: bigint;
}

export function parseTransferLog(log: Log): TransferLog | null {
  try {
    const parsed = ERC20_INTERFACE.parseLog(log);
    if (parsed?.name === "Transfer") {
      return {
        from: parsed.args.from as string,
        to: parsed.args.to as string,
        value: parsed.args.value as bigint,
      };
    }
  } catch {
    // Not a transfer log
  }
  return null;
}

export async function verifyERC20Payment(
  contract: Contract,
  txHash: string,
  treasury: string,
  minAmount: bigint
): Promise<{ success: boolean; amount: bigint; from: string }> {
  const receipt = await contract.provider.getTransactionReceipt(txHash);
  if (!receipt) {
    return { success: false, amount: 0n, from: "" };
  }

  let totalAmount = 0n;
  let payer = "";

  for (const log of receipt.logs) {
    try {
      const transfer = parseTransferLog(log);
      if (transfer && transfer.to.toLowerCase() === treasury.toLowerCase()) {
        totalAmount += transfer.value;
        payer = transfer.from;
      }
    } catch {
      continue;
    }
  }

  return {
    success: totalAmount >= minAmount && payer !== "",
    amount: totalAmount,
    from: payer,
  };
}

export async function verifyBNBPayment(
  provider: { getTransactionReceipt: (hash: string) => Promise<any>; getTransaction: (hash: string) => Promise<any> },
  txHash: string,
  treasury: string,
  minAmount: bigint
): Promise<{ success: boolean; amount: bigint; from: string }> {
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) {
    return { success: false, amount: 0n, from: "" };
  }

  const tx = await provider.getTransaction(txHash);
  if (!tx || !tx.to) {
    return { success: false, amount: 0n, from: "" };
  }

  const toAddress = tx.to.toLowerCase();
  const treasuryAddress = treasury.toLowerCase();

  if (toAddress !== treasuryAddress) {
    return { success: false, amount: 0n, from: "" };
  }

  const amount = tx.value || 0n;

  return {
    success: amount >= minAmount,
    amount,
    from: tx.from,
  };
}

