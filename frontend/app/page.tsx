"use client";

import BlockchainNotary from "@/components/BlockchainNotary";

export default function Home() {
  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

  return (
    <main>
      <BlockchainNotary contractAddress={CONTRACT_ADDRESS} />
    </main>
  );
}
