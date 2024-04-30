"use client";

import { AssetType } from "@/constants";
import { showUnlockWalletModal } from "@/signals/wallet";
import { ordAddress } from "@/signals/wallet/address";
import { useLocalStorage } from "@/utils/storage";
import { computed } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { Noto_Serif } from "next/font/google";
import { BsShieldLockFill } from "react-icons/bs";
import { FaSpinner } from "react-icons/fa";
import OrdinalListings, { OrdViewMode } from "../OrdinalListings";
import WalletTabs from "./tabs";

const notoSerif = Noto_Serif({
	style: "italic",
	weight: ["400", "700"],
	subsets: ["latin"],
});

const WalletOrdinals = ({
	address: addressProp,
	onClick,
}: {
	address?: string;
	onClick?: (outpoint: string) => Promise<void>;
}) => {
	useSignals();
	const [encryptedBackup] = useLocalStorage<string | undefined>(
		"encryptedBackup"
	);
	console.log({ ordAddress: ordAddress.value, addressProp, encryptedBackup });

	const locked = computed(() => !ordAddress.value && !!encryptedBackup);

	if (locked.value) {
		return (
			// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
			<div
				className="mx-auto w-fit flex flex-col items-center justify-center cursor-pointer min-h-[80vh]"
				onClick={() => {
					showUnlockWalletModal.value = true;
				}}
			>
				<div
					className={`flex items-center text-2xl text-[#555] my-4 ${notoSerif.className}`}
				>
					<BsShieldLockFill className="w-6 h-6 text-[#555] mr-2" />
					Funds are SAFU
				</div>

				<div className="btn btn-primary mt-4 btn-neutral">
					Unlock Wallet
				</div>
			</div>
		);
	}

	if (!ordAddress.value) {
		return (
			<div className="mx-auto animate-spin w-fit flex flex-col items-center justify-center min-h-[80vh]">
				<FaSpinner />
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<div className={`${"mb-12"} mx-auto w-full max-w-5xl`}>
				<div className="flex flex-col items-center justify-center w-full h-full max-w-5xl">
					<WalletTabs
						type={AssetType.Ordinals}
						address={addressProp}
					/>
					<div className="w-full min-h-[80vh] tab-content bg-base-100 border-base-200 rounded-box p-2 md:p-6 flex flex-col md:flex-row md:max-w-5xl">
						<OrdinalListings
							address={addressProp || ordAddress.value}
							mode={OrdViewMode.Grid}
							onClick={onClick}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export default WalletOrdinals;
