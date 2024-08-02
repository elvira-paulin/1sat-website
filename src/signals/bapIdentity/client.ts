"use client";

import { BAP } from "bitcoin-bap";
import { encryptionPrefix } from "@/constants";
import {
	decryptData,
	generateEncryptionKeyFromPassphrase,
} from "@/utils/encryption";
import {
	ResultObj,
	IdentityResult,
	ProfileFromJson,
	EncryptedIdentityJson,
} from "@/types/identity";
import {
	identitiesLoading,
	bapIdentityRaw,
	bapIdentities,
	bapIdEncryptionKey,
	activeBapIdentity,
	selectedBapIdentity,
	hasIdentityBackup
} from "./index";

export const setBapIdentity = (importedProfile: ProfileFromJson) => {
	identitiesLoading.value = true;
	bapIdentityRaw.value = importedProfile;
	extractIdentities();
};

const getIdentityAddress = async (idKey: string) => {
	const resp = fetch(`/api/identity/get`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ idKey: idKey }),
	});
	return (await resp).json();
};

const getIdentityByAddress = async (resultObj: ResultObj) => {
	const resp = fetch(`/api/identity/validByAddress`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			address: resultObj?.result?.currentAddress,
		}),
	});
	return (await resp).json();
};

export const extractIdentities = async () => {
	if (!bapIdentityRaw.value) return;

	const bapIdRaw = bapIdentityRaw.value;
	const bapId = new BAP(bapIdRaw.xprv);
	bapId.importIds(bapIdRaw.ids);
	const ids = bapId.listIds();

	const resultsWithAddresses =
		ids?.length &&
		(await Promise.all(ids.map((id: string) => getIdentityAddress(id))));

	const resultsWithIdentities =
		resultsWithAddresses?.length &&
		(await Promise.all(
			resultsWithAddresses.map((resultObj: ResultObj) =>
				getIdentityByAddress(resultObj)
			)
		));

	bapIdentities.value =
		resultsWithIdentities.length &&
		resultsWithIdentities.map((resultObj: ResultObj) => {
			if (resultObj.status === "OK") {
				return resultObj.result;
			}
		});

	identitiesLoading.value = false;
};


export const loadIdentityFromSessionStorage = () => {
	if (!!sessionStorage.getItem("activeIdentity")) {
		activeBapIdentity.value = JSON.parse(sessionStorage.getItem("activeIdentity")!);
	}
};

export const removeIdentity = () => {
	bapIdEncryptionKey.value = null;
	bapIdentityRaw.value = null;
	bapIdentities.value = null;
	identitiesLoading.value = false;
	activeBapIdentity.value = null;
	selectedBapIdentity.value = null;
	hasIdentityBackup.value = false;

	localStorage.removeItem("encryptedIdentity");
	sessionStorage.removeItem("activeIdentity");
};


export const loadIdentityFromEncryptedStorage = async (passphrase: string) => {
	const encryptedIdentityStr = localStorage.getItem("encryptedIdentity");

	if (!encryptedIdentityStr) {
		return false;
	}

	const encryptedIdentityParts = JSON.parse(encryptedIdentityStr) as EncryptedIdentityJson;

	if (!encryptedIdentityParts.pubKey || !encryptedIdentityParts.encryptedIdentity) {
		throw new Error(
			"Load identity error - No public key or encryptedIdentity props found in encrypted backup"
		);
	}

	const encryptionKey = await generateEncryptionKeyFromPassphrase(
		passphrase,
		encryptedIdentityParts.pubKey
	);

	if (!encryptionKey) {
		throw new Error("No encryption key found. Unable to decrypt.");
	}

	let decryptedBackupBin;

	try {
		decryptedBackupBin = decryptData(
			Buffer.from(
				encryptedIdentityParts.encryptedIdentity.replace(encryptionPrefix, ""),
				"base64"
			),
			encryptionKey
		);
	} catch (error) {
		console.log(error);
		return false;
	}

	const decryptedBackupStr =
		Buffer.from(decryptedBackupBin).toString("utf-8");

	const { activeBapIdentity: activeIdentityBackup } = JSON.parse(
		decryptedBackupStr
	);

	if (!activeIdentityBackup || !activeIdentityBackup?.identity) {
		return false;
	}

	activeBapIdentity.value = activeIdentityBackup;
	setIdentitySessionStorage(activeIdentityBackup);

	return true;
};

export const setIdentitySessionStorage = (identity: IdentityResult) => {
	if (!identity) return;
	const activeIdentityString = JSON.stringify(identity);
	sessionStorage.setItem("activeIdentity", activeIdentityString);
};