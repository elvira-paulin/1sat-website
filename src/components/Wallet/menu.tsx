"use client";

import { API_HOST, OLD_ORD_PK_KEY, OLD_PAY_PK_KEY } from "@/constants";
import {
	bsv20Balances,
	bsvWasmReady,
	chainInfo,
	exchangeRate,
	hasUnprotectedKeys,
	indexers,
	ordPk,
	payPk,
	pendingTxs,
	showDepositModal,
	usdRate,
	utxos,
} from "@/signals/wallet";
import { fundingAddress, ordAddress } from "@/signals/wallet/address";
import {
	loadKeysFromBackupFiles,
	loadKeysFromSessionStorage,
} from "@/signals/wallet/client";
import type { BSV20Balance } from "@/types/bsv20";
import type { ChainInfo, IndexerStats } from "@/types/common";
import type { PendingTransaction } from "@/types/preview";
import { getUtxos } from "@/utils/address";
import { useLocalStorage } from "@/utils/storage";
import { computed, effect } from "@preact/signals-react";
import { useSignal, useSignals } from "@preact/signals-react/runtime";
import init from "bsv-wasm-web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ChangeEvent } from "react";
import toast from "react-hot-toast";
import { CgSpinner } from "react-icons/cg";
import {
	FaExclamationCircle,
	FaFileImport,
	FaPlus,
	FaUnlock,
} from "react-icons/fa";
import { FaCopy, FaWallet } from "react-icons/fa6";
import { toBitcoin, toSatoshi } from "satoshi-bitcoin-ts";
import { useCopyToClipboard } from "usehooks-ts";
import * as http from "../../utils/httpClient";
import DepositModal from "../modal/deposit";
import { EnterPassphraseModal } from "../modal/enterPassphrase";
import ImportWalletModal from "../modal/importWallet";
import ProtectKeysModal from "../modal/protectKeys";
import WithdrawalModal from "../modal/withdrawal";
let initAttempted = false;

const WalletMenu: React.FC = () => {
	useSignals();
	const router = useRouter();

	const showWithdrawalModal = useSignal(false);
	const showUnlockWalletModal = useSignal(false);
	const showUnlockWalletButton = useSignal(false);
	const showImportWalletModal = useSignal(false);
	const showProtectKeysModal = useSignal(false);
	const showDropdown = useSignal(false);

	const [encryptedBackup] = useLocalStorage("encryptedBackup");

	const [value, copy] = useCopyToClipboard();
	const ordAddressHover = useSignal(false);

	const mouseEnterOrdAddress = () => {
		console.log("mouseEnterOrdAddress");
		ordAddressHover.value = true;
	};

	const mouseLeaveOrdAddress = () => {
		console.log("mouseLeaveOrdAddress");
		ordAddressHover.value = false;
	};

	// useEffect needed so that we can use localStorage
	useEffect(() => {
		if (bsvWasmReady.value && payPk.value && ordPk.value) {
			const localTxsStr = localStorage.getItem("1satpt");
			const localTxs = localTxsStr ? JSON.parse(localTxsStr) : null;
			if (localTxs) {
				pendingTxs.value = localTxs as PendingTransaction[];
			}
		}
	}, [bsvWasmReady.value, ordPk.value, payPk.value]);

	useEffect(() => {
		loadKeysFromSessionStorage();

		if (encryptedBackup) {
			showUnlockWalletButton.value = true;
		}
	}, [encryptedBackup, showUnlockWalletButton]);

	useEffect(() => {
		if (
			!!localStorage.getItem(OLD_PAY_PK_KEY) &&
			!!localStorage.getItem(OLD_ORD_PK_KEY)
		) {
			hasUnprotectedKeys.value = true;
		}
	}, []);

	const balance = computed(() => {
		if (!utxos.value) {
			return 0;
		}
		return utxos.value.reduce((acc, utxo) => acc + utxo.satoshis, 0);
	});

	effect(() => {
		const address = ordAddress.value;
		const fire = async () => {
			bsv20Balances.value = [];
			try {
				const { promise } = http.customFetch<BSV20Balance[]>(
					`${API_HOST}/api/bsv20/${address}/balance`
				);
				const u = await promise;
				bsv20Balances.value = u.sort((a, b) => {
					return b.all.confirmed + b.all.pending >
						a.all.confirmed + a.all.pending
						? 1
						: -1;
				});

				const statusUrl =
					"https://1sat-api-production.up.railway.app/status";
				const { promise: promiseStatus } = http.customFetch<{
					exchangeRate: number;
					chainInfo: ChainInfo;
					indexers: IndexerStats;
				}>(statusUrl);
				const {
					chainInfo: info,
					exchangeRate: er,
					indexers: indx,
				} = await promiseStatus;
				console.log({ info, exchangeRate, indexers });
				chainInfo.value = info;
				usdRate.value = toSatoshi(1) / er;
				exchangeRate.value = er;
				indexers.value = indx;
			} catch (e) {
				console.log(e);
			}
		};

		if (bsvWasmReady.value && address && !bsv20Balances.value) {
			fire();
		}
	});

	useEffect(() => {
		const fire = async (a: string) => {
			utxos.value = [];
			utxos.value = await getUtxos(a);
		};

		if (bsvWasmReady.value && fundingAddress && !utxos.value) {
			const address = fundingAddress.value;
			if (address) {
				fire(address);
			}
		}
	}, [bsvWasmReady.value, fundingAddress.value, utxos.value]);

	effect(() => {
		const fire = async () => {
			await init();
			bsvWasmReady.value = true;
		};
		if (!initAttempted && bsvWasmReady.value === false) {
			initAttempted = true;
			fire();
		}
	});

	// const importKeys = (e: SyntheticEvent) => {
	// 	e.preventDefault();
	// 	const el = document.getElementById("backupFile");
	// 	el?.click();
	// 	return;
	// };

	const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			console.log("handleFileChange called", e.target.files[0]);

			await loadKeysFromBackupFiles(e.target.files[0]);
			showDropdown.value = false;
			router?.push("/wallet");
		}
	};

	const handleUnlockWallet = () => {
		showUnlockWalletModal.value = true;
		showDropdown.value = false;
	};

	const handleImportWallet = () => {
		showImportWalletModal.value = true;
		showDropdown.value = false;
	};

	const handleProtectKeys = () => {
		showProtectKeysModal.value = true;
		showDropdown.value = false;
	};

	return (
		<ul className="dropdown dropdown-end">
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
			<div
				className="btn btn-ghost m-1 rounded relative"
				tabIndex={0}
				role="button"
				onClick={() => {
					showDropdown.value = true;
				}}
			>
				<div className="tooltip tooltip-bottom" data-tip="Wallet">
					<FaWallet />
				</div>
			</div>
			{showDropdown.value && (
				// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
				<ul
					// biome-ignore lint/a11y/noNoninteractiveTabindex: <explanation>
					tabIndex={0}
					onClick={() => {
						showDropdown.value = false;
					}}
					className="dropdown-content menu shadow border-yellow-200/25 bg-base-100 rounded-box w-64 border"
				>
					{payPk.value && ordPk.value && (
						<div>
							<div className="text-center mb-2">
								<div className="text-[#555] text-lg">
									Balance
								</div>
								<div className="text-2xl font-mono my-2">
									{balance.value === undefined ? (
										"" // user has no wallet yet
									) : usdRate.value > 0 ? (
										`$${(
											balance.value / usdRate.value
										).toFixed(2)}`
									) : (
										<CgSpinner className="animate-spin inline-flex w-4" />
									)}
									<span className="text-xs ml-1">USD</span>
								</div>
								<div className="text-[#555] my-2">
									{toBitcoin(balance.value)}{" "}
									<span className="text-xs">BSV</span>
								</div>
							</div>
							<div className="flex gap-2 justify-center items-center">
								<button
									type="button"
									className="btn btn-sm btn-primary"
									onClick={() => {
										showDepositModal.value = true;
									}}
								>
									Deposit
								</button>
								<button
									type="button"
									disabled={
										usdRate.value <= 0 ||
										balance.value === 0
									}
									className="btn btn-sm btn-primary"
									onClick={() => {
										showWithdrawalModal.value = true;
									}}
								>
									Withdraw
								</button>
							</div>

							<div className="divider">1Sat Wallet</div>
							<ul className="p-0">
								{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
								<li
									onClick={() => {
										showDropdown.value = false;
									}}
								>
									<Link href="/wallet/ordinals">
										Ordinals
									</Link>
								</li>
								{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
								<li
									onClick={() => {
										showDropdown.value = false;
									}}
								>
									<Link href="/wallet/bsv20">BSV20</Link>
								</li>
								{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
								<li
									onClick={() => {
										showDropdown.value = false;
									}}
								>
									<Link href="/wallet/bsv21">BSV21</Link>
								</li>
								<li
									onMouseEnter={mouseEnterOrdAddress}
									onMouseLeave={mouseLeaveOrdAddress}
								>
									<button
										type="button"
										className={
											"flex items-center justify-between w-full"
										}
										onClick={(e) => {
											e.preventDefault();
											copy(ordAddress.value || "");
											console.log(
												"Copied",
												ordAddress.value
											);
											toast.success(
												"Copied Ordinals Address"
											);
											showDropdown.value = false;
										}}
									>
										{ordAddressHover.value
											? `${ordAddress.value?.slice(
													0,
													10
											  )}...${ordAddress.value?.slice(
													-10
											  )}`
											: "Ordinals Address"}{" "}
										<FaCopy className="text-[#333]" />
									</button>
								</li>
							</ul>

							<div className="divider">Keys</div>
							<ul className="p-0">
								<li>
									<button
										type="button"
										onClick={handleImportWallet}
									>
										Import Wallet
									</button>
								</li>
								<li>
									<button type="button" onClick={backupKeys}>
										Export Keys
									</button>
								</li>
								{/* <li className="hover:bg-error hover:text-error-content rounded transition opacity-25">
                <Link href="/wallet/swap">Swap Keys</Link>
              </li> */}
								<li className="hover:bg-error hover:text-error-content rounded transition opacity-25">
									<Link href="/wallet/delete">Sign Out</Link>
								</li>
							</ul>
						</div>
					)}
					{hasUnprotectedKeys.value && (
						<li>
							<button
								type="button"
								className="flex w-full flex-row items-center justify-between bg-yellow-600 text-black hover:bg-yellow-500"
								onClick={handleProtectKeys}
							>
								Protect Your Keys
								<FaExclamationCircle className="w-4 h-4" />
							</button>
						</li>
					)}
					{!payPk.value && !ordPk.value && (
						<>
							{showUnlockWalletButton.value && (
								<ul className="p-0">
									<li onClick={handleUnlockWallet}>
										<div className="flex w-full flex-row items-center justify-between">
											Unlock Wallet
											<FaUnlock className="w-4 h-4" />
										</div>
									</li>
								</ul>
							)}
							<ul className="p-0">
								<li>
									<Link
										href="/wallet/create"
										className="flex w-full flex-row items-center justify-between"
									>
										Create New Wallet
										<FaPlus className="w-4 h-4" />
									</Link>
								</li>
							</ul>
							<ul className="p-0">
								<li>
									<button
										type="button"
										onClick={handleImportWallet}
										className="flex flex-row items-center justify-between w-full"
									>
										Import Wallet
										<FaFileImport className="w-4 h-4" />
									</button>
								</li>
							</ul>
						</>
					)}
				</ul>
			)}
			{showDepositModal.value && (
				<DepositModal
					onClose={() => {
						showDepositModal.value = false;
					}}
				/>
			)}
			{showWithdrawalModal.value && (
				<WithdrawalModal
					onClose={() => {
						showWithdrawalModal.value = false;
					}}
				/>
			)}
			<EnterPassphraseModal
				open={showUnlockWalletModal.value}
				onClose={() => {
					showUnlockWalletModal.value = false;
				}}
				onUnlock={() => {
					showUnlockWalletModal.value = false;
				}}
			/>

			<ImportWalletModal
				open={showImportWalletModal.value}
				onClose={() => {
					showImportWalletModal.value = false;
				}}
			/>

			<ProtectKeysModal
				open={showProtectKeysModal.value}
				onClose={() => {
					showProtectKeysModal.value = false;
				}}
			/>

			<input
				accept=".json"
				className="hidden"
				id="backupFile"
				onChange={handleFileChange}
				type="file"
			/>
		</ul>
	);
};

export default WalletMenu;

export const backupKeys = () => {
	const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(
		JSON.stringify({ payPk: payPk.value, ordPk: ordPk.value })
	)}`;

	const clicker = document.createElement("a");
	clicker.setAttribute("href", dataStr);
	clicker.setAttribute("download", "1sat.json");
	clicker.click();
};

export const swapKeys = () => {
	// swaps paypk with ordpk values
	const tempPayPk = payPk.value;
	const tempOrdPk = ordPk.value;
	if (!tempPayPk || !tempOrdPk) {
		return;
	}
	ordPk.value = tempPayPk;
	payPk.value = tempOrdPk;
	toast.success("Keys Swapped");
};
