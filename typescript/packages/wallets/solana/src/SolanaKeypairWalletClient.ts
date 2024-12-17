import { type Keypair, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import nacl from "tweetnacl";
import { type SolanWalletClientCtorParams, SolanaWalletClient } from "./SolanaWalletClient";
import type { SolanaTransaction } from "./types";

export type SolanaKeypairWalletClientCtorParams = SolanWalletClientCtorParams & {
    keypair: Keypair;
};

export class SolanaKeypairWalletClient extends SolanaWalletClient {
    #keypair: Keypair;

    constructor(params: SolanaKeypairWalletClientCtorParams) {
        const { keypair, connection } = params;
        super({ connection });
        this.#keypair = keypair;
    }

    getAddress() {
        return this.#keypair.publicKey.toBase58();
    }

    async signMessage(message: string) {
        const messageBytes = Buffer.from(message);
        const signature = nacl.sign.detached(messageBytes, this.#keypair.secretKey);
        return {
            signature: Buffer.from(signature).toString("hex"),
        };
    }

    async sendTransaction({ instructions, addressLookupTableAddresses = [] }: SolanaTransaction) {
        const latestBlockhash = await this.connection.getLatestBlockhash();
        const message = new TransactionMessage({
            payerKey: this.#keypair.publicKey,
            recentBlockhash: latestBlockhash.blockhash,
            instructions,
        }).compileToV0Message(await this.getAddressLookupTableAccounts(addressLookupTableAddresses));
        const transaction = new VersionedTransaction(message);

        transaction.sign([this.#keypair]);

        const hash = await this.connection.sendTransaction(transaction, {
            maxRetries: 5,
        });
        return {
            hash,
        };
    }
}

export const solana = (params: SolanaKeypairWalletClientCtorParams) => new SolanaKeypairWalletClient(params);