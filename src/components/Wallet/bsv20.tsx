import { AssetType } from "@/constants";
import { Suspense } from "react";
import TokenListingSkeleton from "../skeletons/listing/Token";
import Bsv20List from "./bsv20List";

interface WalletBsv20Props {
  type: AssetType.BSV20 | AssetType.BSV21;
  address?: string;
}

const WalletBsv20 = ({ type, address }: WalletBsv20Props) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="w-full">
        {/* <table className="table font-mono">
          <thead>
            <tr>
              <th className="min-w-16">Ticker</th>
              <th className="">Amount</th>
              <th className="text-right w-full">Sats / Token</th>
              <th className="text-right min-w-48">Total Price</th>
            </tr>
          </thead> */}
          <Suspense fallback={<TokenListingSkeleton />}>
            <Bsv20List type={type} address={address} />
          </Suspense>
        {/* </table> */}
      </div>
    </div>
  );
};

export default WalletBsv20;