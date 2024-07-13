import { Container } from "@/components/og/Container";
import { Logo } from "@/components/og/Logo";
import { API_HOST, ORDFS } from "@/constants";
import type { OrdUtxo } from "@/types/ordinals";
import { getNotoSerifItalicFont } from "@/utils/font";
import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "1Sat Ordinals Outpoint";
export const size = {
	width: 1200,
	height: 630,
};
export const contentType = "image/png";

export default async function Image({
	params,
}: {
	params: { outpoint: string };
}) {
	const notoSerif = await getNotoSerifItalicFont();

	const url = `https://res.cloudinary.com/tonicpow/image/fetch/c_crop,b_rgb:111111,g_center,h_${size.height},w_${size.width}/f_auto/${ORDFS}/${params.outpoint}`;

	console.log("Opengraph image url:", url)

	const detailsUrl = `${API_HOST}/api/inscriptions/${params.outpoint}`
	const details = await fetch(
		detailsUrl,
	).then((res) => {
		if (!res.ok) {
			throw new Error(`Error fetching JSON from ${detailsUrl}`);
		}
		return res.json() as Promise<OrdUtxo>
	});

	const isImageInscription =
		details?.origin?.data?.insc?.file.type?.startsWith("image");
	// const url = `${ORDFS}/${params.outpoint}`;

	return new ImageResponse(
		<Container>
			{isImageInscription ? (
				// biome-ignore lint/a11y/useAltText: <explanation>
				// eslint-disable-next-line @next/next/no-img-element
				<img src={url} alt={alt} title={alt} {...size} />
			) : (
				details.origin?.data?.map?.name ||
				details.origin?.data?.bsv20?.tick ||
				details.origin?.data?.bsv20?.sym ||
				details.origin?.data?.insc?.json?.tick ||
				details.origin?.data?.insc?.json?.p ||
				details.origin?.data?.insc?.file.type ||
				"Mystery Outpoint"
			)}

			<Logo />
		</Container>,
		{
			...size,
			fonts: [
				{
					name: "Noto Serif",
					data: await notoSerif,
					style: "italic",
					weight: 400,
				},
			],
		},
	);
}
