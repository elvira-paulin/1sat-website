import FeaturedCollections from "@/components/Collections/featured";
import OrdinalListings, { OrdViewMode } from "@/components/OrdinalListings";
import { AssetType } from "@/constants";
import type { BSV20TXO, OrdUtxo } from "@/types/ordinals";
import { Noto_Serif } from "next/font/google";
import "slick-carousel/slick/slick-theme.css";
import "slick-carousel/slick/slick.css";
import TokenMarket from "../TokenMarket";
import MarketTabs from "./tabs";

export interface MarketPageProps {
  // imageListings?: OrdUtxo[];
  collections?: OrdUtxo[];
  tokenListingsv2?: BSV20TXO[];
  modelListings?: OrdUtxo[];
  lrc20Listings?: OrdUtxo[];
  lrc20Tokens?: OrdUtxo[];
  selectedAssetType?: AssetType;
  title?: string;
  showTabs?: boolean;
  id?: string;
  term?: string;
}

const notoSerif = Noto_Serif({
  style: "italic",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const MarketPage: React.FC<MarketPageProps> = (props) => {
  const { selectedAssetType } = props;
  let showTabs = props.showTabs;
  // tabs default to showing
  if (props.showTabs === undefined) {
    showTabs = true;
  }



  const Listings = ({ id, term }: { id?: string, term?: string }) => {
    switch (selectedAssetType) {
      case AssetType.Ordinals:
        return (
          <>
            <OrdinalListings
              // listings={props.imageListings!}
              mode={OrdViewMode.List}
              term={term}
            />
          </>
        );
      case AssetType.BSV20:
        return <TokenMarket type={AssetType.BSV20} id={props.id} term={props.term} />;
      case AssetType.BSV21:
        return <TokenMarket type={AssetType.BSV21} id={props.id} term={props.term} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-2 md:p-0">
      {props.title && (
        <div className="text-3xl font-bold mb-4">{props.title}</div>
      )}
      {selectedAssetType === AssetType.Ordinals && <h1 className={`text-2xl mb-4 ${notoSerif.className}`}>Featured Collections</h1>}

      {selectedAssetType === AssetType.Ordinals && <FeaturedCollections />}
      {showTabs && (
        <div className="flex">
          <MarketTabs
            selectedTab={selectedAssetType || AssetType.Ordinals}
          />
        </div>
      )}
      <div className="tab-content block bg-base-100 border-base-200 rounded-box">
        <Listings id={props.id} term={props.term} />
      </div>
    </div>
  );
};

export default MarketPage;
