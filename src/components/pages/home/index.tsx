import oneSatLogo from "@/assets/images/icon.svg";
import Artifact from "@/components/artifact";
import Tabs, { Tab } from "@/components/tabs";
import { OrdUtxo, useWallet } from "@/context/wallet";
import { fillContentType } from "@/utils/artifact";
import { WithRouterProps } from "next/dist/client/with-router";
import Head from "next/head";
import Image from "next/image";
import Router from "next/router";
import { useEffect, useState } from "react";
import { FetchStatus } from "..";

export type CallbackData = {
  numInputs: number;
  numOutputs: number;
  fee: number;
  rawTx: string;
};

interface PageProps extends WithRouterProps {}

const rando = getRandomInt(0, 300000);

const HomePage: React.FC<PageProps> = ({}) => {
  const [numMinted, setNumMinted] = useState<number>(0);
  const [artifact, setArtifact] = useState<OrdUtxo | undefined>();
  const {
    setFetchInscriptionsStatus,
    fetchInscriptionsStatus,
    getArtifactByInscriptionId,
  } = useWallet();
  const [fetchCountStatus, setFetchCountStatus] = useState<FetchStatus>(
    FetchStatus.Idle
  );
  const [randomNumber, setRandomNumber] = useState<number>(
    getRandomInt(rando, numMinted)
  );

  useEffect(() => {
    if (!randomNumber) {
      setRandomNumber(getRandomInt(0, numMinted));
    }
  }, [setRandomNumber]);

  useEffect(() => {
    const fire = async () => {
      try {
        setFetchCountStatus(FetchStatus.Loading);
        const resp = await fetch(
          `https://ordinals.gorillapool.io/api/inscriptions/count`
        );

        const { count } = await resp.json();
        setNumMinted(count);
        setFetchCountStatus(FetchStatus.Success);
      } catch (e) {
        console.error({ e });
        setFetchCountStatus(FetchStatus.Error);
      }
    };

    if (!numMinted && fetchCountStatus === FetchStatus.Idle) {
      fire();
    }
  }, [numMinted, fetchCountStatus]);

  useEffect(() => {
    const interval = setInterval(() => {
      console.log("This will be called every 12 seconds");
      if (numMinted) {
        setRandomNumber(getRandomInt(0, numMinted));
        setFetchInscriptionsStatus(FetchStatus.Idle);
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [numMinted, setRandomNumber, setFetchInscriptionsStatus]);

  useEffect(() => {
    const fire = async (iid: number) => {
      const art = await getArtifactByInscriptionId(iid);
      if (art) {
        const art2 = await fillContentType(art);
        console.log("setting", art2);
        setArtifact(art2);
      }
    };
    if (
      fetchInscriptionsStatus === FetchStatus.Idle &&
      randomNumber !== artifact?.id
    ) {
      fire(randomNumber);
    }
  }, [randomNumber, artifact, getArtifactByInscriptionId]);

  return (
    <>
      <Head>
        <title>1SatOrdinals.com</title>
        <meta
          name="description"
          content="An Ordinals-compatible implementation on Bitcoin SV"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto+Mono&family=Roboto+Slab&family=Ubuntu:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <main className="flex items-center justify-center h-full w-full">
        <div className="flex flex-col items-center justify-between w-full h-full">
          <div className="w-full flex flex-col items-center justify-center ">
            <nav>
              <Tabs currentTab={Tab.Overview} />
            </nav>
            <h1 className="mt-8 text-4xl text-teal-400">
              {numMinted ? `${numMinted.toLocaleString()}` : ""}
            </h1>
            <h2 className="mb-12 text-2xl">Inscriptions Made</h2>
            <div className="mx-auto h-[calc(300px-72px)] max-w-5xl">
              {artifact && (
                <Artifact
                  id={artifact?.id}
                  outPoint={`${artifact?.txid}_${artifact?.vout}`}
                  contentType={artifact.type}
                  classNames={{
                    wrapper: "min-w-96",
                    media: "max-h-96 max-w-96",
                  }}
                />
              )}
              {!artifact && (
                <div className="max-w-[600px] text-yellow-400 font-mono">
                  <div className="cursor-pointer my-8 w-full">
                    <Image
                      style={{
                        boxShadow: "0 0 0 0 rgba(0, 0, 0, 1)",
                        transform: "scale(1)",
                        animation: "pulse 2s infinite",
                        width: "12rem",
                        height: "12rem",
                      }}
                      src={oneSatLogo}
                      onClick={() => Router?.push("/wallet")}
                      alt={"1Sat Ordinals"}
                      className="cursor-pointer mx-auto rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default HomePage;

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}