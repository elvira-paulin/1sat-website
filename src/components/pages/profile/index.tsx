"use client";
import { Ubuntu_Mono } from "next/font/google";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSignals, useSignalEffect } from "@preact/signals-react/runtime";
import { loadIdentityFromSessionStorage } from "@/signals/bapIdentity/client";
import {
	availableIdentities,
	activeBapIdentity,
} from "@/signals/bapIdentity";
import ProfileAccordion from "@/components/profileAccordion";

const ubuntuMono = Ubuntu_Mono({
	style: "normal",
	weight: ["400", "700"],
	subsets: ["latin"],
});

const ProfilePage = () => {
	useSignals();
	const router = useRouter();

	useEffect(() => {
		if (!activeBapIdentity.value || !availableIdentities.value) {
			const identities = loadIdentityFromSessionStorage();

			if (!identities.availableIDs?.length) {
				router.push("/");
			}
		}
	}, [activeBapIdentity.value, availableIdentities.value]);

	return availableIdentities.value ? (
		<main className="px-4 w-full min-h-screen flex flex-col items-center">
			<div className="flex flex-col  w-full h-full sm:w-9/12">
				<h2
					className={` ${ubuntuMono.className} items-center text-center my-5 text-xl sm:text-2xl`}
				>
					Profile
				</h2>
				<ProfileAccordion
					canSetActiveBapIdentity={false}
					identities={availableIdentities.value}
				/>
			</div>
		</main>
	) : null;
};
export default ProfilePage;