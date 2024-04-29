import { Suspense } from "react";
import TokenListingSkeleton from "../skeletons/listing/Token";
import Bsv20List from "./bsv20List";
import type { WalletTab } from "./tabs";

interface WalletBsv20Props {
	type: WalletTab.BSV20 | WalletTab.BSV21;
	address?: string;
}

export type NumResults = {
	num: any;
	autofill: any;
};

const WalletBsv20 = async ({ type, address }: WalletBsv20Props) => {
	return (
		<div className="flex flex-col justify-start w-full md:min-h-[80vh]">
			<div className="w-full">
				<Suspense
					fallback={
						<table width={"100%"}>
							<TokenListingSkeleton />
						</table>
					}
				>
					<Bsv20List type={type} address={address} />
				</Suspense>
			</div>
		</div>
	);
};

export default WalletBsv20;
