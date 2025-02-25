"use client"

import type { InputOutpoint } from "@/app/outpoint/[outpoint]/[tab]/page";
import { API_HOST } from "@/constants";
import { Signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import OutpointHeading from "../pages/outpoint/heading";
import DisplayIO from "./display";
import { Transaction } from "@bsv/sdk";

export const showDetails = new Signal<boolean>(undefined);

export interface TxDetailsProps {
  vout: number;
  txid: string;
  showing?: boolean;
}

const TxDetails = ({ txid, vout, showing }: TxDetailsProps) => {
  useSignals();
  const [rawtx, setRawtx] = useState<string | undefined>();
  const [inputOutpoints, setInputOutpoints] = useState<InputOutpoint[]>([]);
  const [outputSpends, setOutputSpends] = useState<string[]>([]);

  useEffect(() => {
    const fire = async () => {
      try {
        const response = await fetch(
          `https://api.whatsonchain.com/v1/bsv/main/tx/${txid}/hex`
        );
        const rawTx = await response.text();
        setRawtx(rawTx);
      } catch (e) {
        console.error(e);
      }
    };

    if (!rawtx && txid && showDetails.value) {
      fire();
    }
  }, [txid, showDetails.value, rawtx]);


  useEffect(() => {
    const fire = async (rawTx: string) => {
      const tx = Transaction.fromHex(rawTx);
      const numInputs = tx.inputs.length;
      const inputOutpointsData: InputOutpoint[] = [];
      for (let i = 0; i < numInputs; i++) {
        const input = tx.inputs[i];
        const txid = input.sourceTXID as string;
        const vout = input.sourceOutputIndex;
        const url = `https://junglebus.gorillapool.io/v1/txo/get/${txid}_${vout}`;
        const spentOutpointResponse = await fetch(url, {
          headers: {
            Accept: "application/octet-stream",
          },
        });
        const res = await spentOutpointResponse.arrayBuffer();
        const { script, satoshis } = parseOutput(res);
        inputOutpointsData.push({ script, satoshis, txid, vout });
      }
      setInputOutpoints(inputOutpointsData);

      const outputOutpoints: string[] = [];
      const numOutputs = tx.outputs.length;
      for (let i = 0; i < numOutputs; i++) {
        outputOutpoints.push(`${txid}_${i}`);
      }

      const outputSpendsResponse = await fetch(`${API_HOST}/api/spends`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(outputOutpoints),
      });

      const outputSpendsData = ((await outputSpendsResponse.json()) || []).filter(
        (s: string) => s && s !== ""
      );
      setOutputSpends(outputSpendsData);

    }

    if (rawtx) {
      fire(rawtx);
    }
  }, [rawtx, setOutputSpends, setInputOutpoints, txid]);

  const toggleDetails = useCallback(() => {
    showDetails.value = !showDetails.value;
    // console.log({ showDetails: showDetails.value });
  }, [showDetails.value]);

  useMemo(() => {
    if (showDetails.value === undefined) {
      showDetails.value = showing !== false;
      showing = showDetails.value;
    }
  }, [showing, showDetails]);

  // useEffect(() => {
  //   console.log({ showDetails: showDetails.value });
  // }, [showDetails]);

  return (
    <>
      <div className="flex">
        <OutpointHeading outpoint={`${txid}_${vout}`} toggleDetails={toggleDetails} showing={showDetails.value} />
      </div>
      {showDetails.value && <DisplayIO
        rawtx={rawtx}
        inputOutpoints={inputOutpoints}
        outputSpends={outputSpends}
        vout={vout}
      />}
    </>
  );
};

export default TxDetails;


function parseOutput(output: ArrayBuffer): {
  satoshis: bigint;
  script: string;
} {
  // Extract the amount (8 bytes) and convert from little-endian format
  const view = new DataView(output);
  const satoshis = view.getBigUint64(0, true); // true for little-endian

  // Convert the rest of the buffer to hex and extract the script
  const hex = Buffer.from(output.slice(8)).toString("hex");
  const [scriptLength, remainingHex] = parseVarInt(hex);
  const script = remainingHex.substring(0, scriptLength * 2);

  return {
    satoshis: satoshis,
    script: script,
  };
}


function parseVarInt(hex: string): [number, string] {
  let len = 1;
  let value = Number.parseInt(hex.substring(0, 2), 16);

  if (value < 0xfd) {
    return [value, hex.substring(2)];
  }
  if (value === 0xfd) {
    len = 3;
  } else if (value === 0xfe) {
    len = 5;
  } else {
    len = 9;
  }

  value = Number.parseInt(hex.substring(2, len * 2), 16);
  return [value, hex.substring(len * 2)];
}
