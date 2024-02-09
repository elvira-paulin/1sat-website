"use client";

import { API_HOST, AssetType, toastErrorProps } from "@/constants";
import {
  bsvWasmReady,
  ordPk,
  payPk,
  pendingTxs,
  utxos,
} from "@/signals/wallet";
import { fundingAddress, ordAddress } from "@/signals/wallet/address";
import { Ticker } from "@/types/bsv20";
import { BSV20TXO } from "@/types/ordinals";
import { PendingTransaction } from "@/types/preview";
import * as http from "@/utils/httpClient";
import { createChangeOutput, signPayment } from "@/utils/transaction";
import { useSignal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import {
  P2PKHAddress,
  PrivateKey,
  Script,
  SigHash,
  Transaction,
  TxIn,
  TxOut,
} from "bsv-wasm-web";
import { Utxo, buildInscription } from "js-1sat-ord";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import toast from "react-hot-toast";

interface TransferModalProps {
  onClose: () => void;
  amount?: number;
  address?: string;
  type: AssetType;
  dec: number;
  id: string;
  balance: number;
  sym?: string;
}

const TransferBsv20Modal: React.FC<TransferModalProps> = ({
  type,
  balance,
  sym,
  id,
  amount: amt,
  dec,
  address: addr,
  onClose,
}) => {
  useSignals();
  const router = useRouter();
  // use signal for amount and address
  const amount = useSignal(amt?.toString() || "0");
  const address = useSignal(addr || "");

  const setAmountToBalance = useCallback(() => {
    amount.value = balance.toString();
    console.log(amount.value);
  }, [amount, balance]);

  const transferBsv20 = useCallback(
    async (
      sendAmount: number,
      paymentUtxos: Utxo[],
      inputTokens: BSV20TXO[], //
      paymentPk: PrivateKey,
      changeAddress: string,
      ordPk: PrivateKey,
      ordAddress: string,
      payoutAddress: string,
      ticker: Ticker
    ): Promise<PendingTransaction> => {
      if (!bsvWasmReady.value) {
        throw new Error("bsv wasm not ready");
      }
      let tx = new Transaction(1, 0);

      // add token inputs
      let amounts = 0;
      let i = 0;
      for (const utxo of inputTokens) {
        const txBuf = Buffer.from(utxo.txid, "hex");
        let utxoIn = new TxIn(txBuf, utxo.vout, Script.from_asm_string(""));
        amounts += parseInt(utxo.amt);
        tx.add_input(utxoIn);

        // sign ordinal
        const sig = tx.sign(
          ordPk,
          SigHash.NONE | SigHash.ANYONECANPAY | SigHash.FORKID,
          i,
          Script.from_bytes(Buffer.from(utxo.script, "base64")),
          BigInt(1)
        );

        utxoIn.set_unlocking_script(
          Script.from_asm_string(
            `${sig.to_hex()} ${ordPk.to_public_key().to_hex()}`
          )
        );

        tx.set_input(i, utxoIn);
        i++;
        if (sendAmount <= amounts) {
          break;
        }
      }
      debugger;
      if (amounts > sendAmount) {
        // build change inscription
        const changeInscription = {
          p: "bsv-20",
          op: "transfer",
          amt: (amounts - sendAmount).toString(),
        } as any;
        if (ticker.tick) {
          changeInscription.tick = ticker.tick;
        } else if (ticker.id) {
          changeInscription.id = ticker.id;
        } else {
          throw new Error("unexpected error");
        }
        const changeFileB64 = Buffer.from(
          JSON.stringify(changeInscription)
        ).toString("base64");
        const changeInsc = buildInscription(
          P2PKHAddress.from_string(ordAddress),
          changeFileB64,
          "application/bsv-20"
        );
        const changeInscOut = new TxOut(BigInt(1), changeInsc);
        tx.add_output(changeInscOut);
      }

      let totalSatsIn = 0;
      // payment Inputs
      for (const utxo of paymentUtxos.sort((a, b) => {
        return a.satoshis > b.satoshis ? -1 : 1;
      })) {
        let utxoIn = new TxIn(
          Buffer.from(utxo.txid, "hex"),
          utxo.vout,
          Script.from_asm_string("")
        );

        tx.add_input(utxoIn);

        utxoIn = signPayment(tx, paymentPk, i, utxo, utxoIn);
        tx.set_input(i, utxoIn);
        totalSatsIn += utxo.satoshis;
        i++;
        break;
      }

      const inscription = {
        p: "bsv-20",
        op: "transfer",
        amt: sendAmount.toString(),
      } as any;
      if (ticker.tick) {
        inscription.tick = ticker.tick;
      } else if (ticker.id) {
        inscription.id = ticker.id;
      }

      const fileB64 = Buffer.from(JSON.stringify(inscription)).toString(
        "base64"
      );
      const insc = buildInscription(
        P2PKHAddress.from_string(payoutAddress),
        fileB64,
        "application/bsv-20"
      );

      let satOut = new TxOut(BigInt(1), insc);
      tx.add_output(satOut);

      const indexerAddress = ticker.fundAddress;
      // output 4 indexer fee
      if (indexerAddress) {
        const indexerFeeOutput = new TxOut(
          BigInt(2000), // 1000 * 2 inscriptions
          P2PKHAddress.from_string(indexerAddress).get_locking_script()
        );
        tx.add_output(indexerFeeOutput);
      }

      const changeOut = createChangeOutput(tx, changeAddress, totalSatsIn);
      tx.add_output(changeOut);

      return {
        rawTx: tx.to_hex(),
        size: tx.get_size(),
        fee: paymentUtxos[0]!.satoshis - Number(tx.satoshis_out()),
        numInputs: tx.get_ninputs(),
        numOutputs: tx.get_noutputs(),
        txid: tx.get_id_hex(),
        inputTxid: paymentUtxos[0].txid,
        marketFee: 0,
      };
    },
    []
  );

  const submit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!amount.value || !address.value) {
        return;
      }
      if (parseFloat(amount.value) > balance) {
        toast.error("Not enough Bitcoin!", toastErrorProps);
        return;
      }
      console.log(amount.value, address.value);
      const amt = Math.floor(parseFloat(amount.value) * 10 ** dec);
      const bsv20TxoUrl = `${API_HOST}/api/bsv20/${ordAddress.value}/${type === AssetType.BSV20 ? "tick" : "id"}/${id}`;
      const { promise } = http.customFetch<BSV20TXO[]>(bsv20TxoUrl);
      const tokenUtxos = await promise;
      const { promise: promiseTickerDetails } = http.customFetch<Ticker>(
        `${API_HOST}/api/bsv20/${type === AssetType.BSV20 ? "tick" : "id"}/${id}`
      );
      const ticker = await promiseTickerDetails;
      const transferTx = await transferBsv20(
        amt,
        utxos.value!,
        tokenUtxos,
        PrivateKey.from_wif(payPk.value!),
        fundingAddress.value!,
        PrivateKey.from_wif(ordPk.value!),
        ordAddress.value!,
        address.value, // recipient ordinal address
        ticker
      );
      pendingTxs.value = [transferTx];
      router.push("/preview");
    },
    [amount.value, address.value, balance, dec, type, id, transferBsv20, router]
  );

  return (
    <div
      className="z-10 flex items-center justify-center fixed top-0 left-0 w-screen h-screen bg-black bg-opacity-50 overflow-hidden"
      onClick={() => onClose()}
    >
      <div
        className="w-full max-w-lg m-auto p-4 bg-[#111] text-[#aaa] rounded flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full h-64 md:h-full overflow-hidden mb-4">
          <form onSubmit={submit}>
            <div className="flex justify-between">
              <div className="text-lg font-semibold">
                Transfer {type} {id}
              </div>
              <div
                className="text-xs cursor-pointer text-[#aaa]"
                onClick={setAmountToBalance}
              >
                Balance: {balance} {type === AssetType.BSV21 ? id : sym}
              </div>
            </div>

            <div className="flex flex-col w-full">
              <label className="text-sm font-semibold text-[#aaa] mb-2">
                Amount
              </label>
              <input
                type="number"
                placeholder="0.00000000"
                max={balance}
                className="input input-bordered w-full"
                value={amount.value || "0"}
                onChange={(e) => {
                  if (
                    e.target.value === "" ||
                    parseFloat(e.target.value) <= balance
                  ) {
                    amount.value = e.target.value;
                  }
                }}
              />
            </div>
            <div className="flex flex-col mt-4">
              <label className="text-sm font-semibold text-[#aaa] mb-2">
                Address
              </label>
              <input
                type="text"
                placeholder="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
                className="input input-bordered w-full"
                value={address.value}
                onChange={(e) => {
                  address.value = e.target.value;
                }}
              />
            </div>
            <div className="modal-action">
              <button className="bg-[#222] p-2 rounded cusros-pointer hover:bg-emerald-600 text-white">
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TransferBsv20Modal;