"use client";

import { resultsPerPage } from "@/constants";
import { ordUtxos } from "@/signals/wallet";
import { OrdUtxo } from "@/types/ordinals";
import { computed, useSignal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useInView } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { FiLoader } from "react-icons/fi";
import { toBitcoin } from "satoshi-bitcoin-ts";
import Artifact from "../artifact";
import { checkOutpointFormat, getCollectionIds, getOrdUtxos, listingCollection, listingName, mintNumber } from "./helpers";

interface Props {
  address: string;
  listings?: OrdUtxo[];
}

const GridList = ({ address, listings: listingsProp }: Props) => {
  useSignals();
  const ref = useRef(null);
  const isInView = useInView(ref);
  const listings = useSignal<OrdUtxo[]>(listingsProp || []);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["ordinals", address],
    queryFn: ({ pageParam }) =>
      getOrdUtxos({ address, pageParam }),
    getNextPageParam: (lastPage, pages, lastPageParam) => {
      if (lastPageParam === 0) {
        return lastPageParam + 1;
      }
      if (lastPage.length === resultsPerPage) {
        return lastPageParam + 1;
      }
      return undefined;
    },
    initialPageParam: 0,
  });
  // useEffects remain the same for data fetching and error handling


  // set the ord utxos
  useEffect(() => {
    if (data) {
      const pageData = data.pages[data.pages.length - 1];
      if (pageData !== undefined) {
        ordUtxos.value = data.pages.reduce((acc, val) => acc.concat(val), []);
        listings.value = ordUtxos.value || [];
      }
    }
  }, [data, listings]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const newPageData = data?.pages[data.pages.length - 1];
    if (isInView && newPageData && !isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView]);

  const collectionIds = computed(() =>
    listings.value.reduce((i, v) => {
      const cid = v.origin?.data?.map?.subTypeData?.collectionId;
      if (cid && checkOutpointFormat(cid)) {
        i.push(cid);
      }
      return i;
    }, [] as string[])
  );

  const { data: collectionData } = useQuery({
    queryKey: ["collections", collectionIds.value?.length > 0],
    queryFn: () => getCollectionIds(collectionIds.value),
  });

  const collections = useSignal(collectionData || []);

  return (
    listings && (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {listings.value.map((listing) => {
          const collection = listingCollection(listing, collections);
          const price = `${toBitcoin(listing?.data?.list?.price || "0", true).toString()} BSV`;
          return (
            listing && (
              <div key={`${listing?.txid}-${listing?.vout}-${listing?.height}`} className="grid-item p-4 shadow rounded-lg">
                <div className="artifact-container mb-4">
                  <Artifact
                    classNames={{
                      wrapper: "bg-transparent",
                      media: "rounded bg-[#111] text-center p-0 h-full",
                    }}
                    artifact={listing}
                    size={100}
                    sizes={"100vw"}
                    showFooter={false}
                    priority={false}
                    to={`/outpoint/${listing?.outpoint}`}
                  />
                </div>
                <div className="flex flex-col">
                  <p className="text-lg font-semibold truncate">{listingName(listing)}</p>
                  {collection && (
                    <Link
                      href={`/collection/${listing?.origin?.data?.map?.subTypeData?.collectionId}`}
                      className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      {collection.name} {mintNumber(listing, collection)}
                    </Link>
                  )}
                  <div className="text-sm text-neutral-500 mt-2">{listing?.origin?.num}</div>
                  <div className="text-lg text-neutral-700 font-bold mt-1">{price}</div>
                </div>
              </div>
            )
          );
        })}
        <div ref={ref} className="col-span-full flex justify-center py-4">
          {isFetchingNextPage ? (
            <FiLoader className="animate-spin" />
          ) : hasNextPage ? (
            <button type="button" className="btn btn-primary" onClick={() => fetchNextPage()}>
              Load more
            </button>
          ) : (
            <p>No more items to load</p>
          )}
        </div>
      </div>
    )
  );
  
};

export default GridList;
