"use client";

import OrdinalListings, { OrdViewMode } from "@/components/OrdinalListings";
import TokenListings from "@/components/TokenListings";
import { AssetType } from "@/constants";
import type { BSV20TXO, OrdUtxo } from "@/types/ordinals";
import ListingsTabs from "./tabs";

export interface ListingsPageProps {
  term?: string;
  collections?: OrdUtxo[];
  tokenListingsv2?: BSV20TXO[];
  modelListings?: OrdUtxo[];
  lrc20Listings?: OrdUtxo[];
  lrc20Tokens?: OrdUtxo[];
  selectedAssetType?: AssetType;
  title?: string;
  showTabs?: boolean;
}

const ListingsPage: React.FC<ListingsPageProps> = (props) => {
  const { selectedAssetType } = props;
  let showTabs = props.showTabs;
  // tabs default to showing
  if (props.showTabs === undefined) {
    showTabs = true;
  }

  const Listings = () => {
    switch (selectedAssetType) {
      case AssetType.Ordinals:
        return (
          <OrdinalListings
            term={props.term}
            mode={OrdViewMode.List}
          />
        );
      case AssetType.BSV20:
        return <TokenListings type={AssetType.BSV20} />;
      case AssetType.BSV21:
        return <TokenListings type={AssetType.BSV21} />;
      default:
        return null;
    }
  };

  return (
    // <TracingBeam className="">
    <div className="w-full max-w-5xl mx-auto">
      {props.title && (
        <div className="text-3xl font-bold mb-4">{props.title}</div>
      )}
      {showTabs && (
        <div className="flex">
          <ListingsTabs
            selectedTab={selectedAssetType || AssetType.Ordinals}
          />
        </div>
      )}
      <div className="tab-content block bg-base-100 border-base-200 rounded-box p-2 md:p-6">
        <Listings />
      </div>
    </div>
    // </TracingBeam>
  );
};

export default ListingsPage;
