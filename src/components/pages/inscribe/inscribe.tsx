
"use client"

import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useMemo } from "react";
import InscribeBsv20 from "./bsv20";
import InscribeBsv21 from "./bsv21";
import InscribeCollection from "./collection";
import InscribeHtml from "./html";
import InscribeImage from "./image";
import InscriptionTabs, { InscriptionTab } from "./tabs";
import InscribeText from "./text";

type InscribeProps = {
  className?: string;
  tab: InscriptionTab;
  generated?: boolean;
};

const Inscribe: React.FC<InscribeProps> = ({ className, tab, generated }) => {
  const router = useRouter()

  const selectedTab = useMemo(() => {
    if (tab) {
      return tab as InscriptionTab;
    }
    return InscriptionTab.Image;
  }, [tab]);

  const inscribedCallback = useCallback(() => {
    router.push("/preview");
  }, [router]);

  return (
    <div
      className={`${className ? className : ""
        } flex flex-col w-full mx-auto p-4`}
    >
      <InscriptionTabs currentTab={selectedTab || InscriptionTab.Image} />
      <div className="w-full">
        {selectedTab === InscriptionTab.Text && (
          <InscribeText inscribedCallback={inscribedCallback} />
        )}
        {selectedTab === InscriptionTab.HTML && (
          <InscribeHtml inscribedCallback={inscribedCallback} />
        )}
        {selectedTab === InscriptionTab.Image && (
          <InscribeImage inscribedCallback={inscribedCallback} generated={generated} />
        )}
        {selectedTab === InscriptionTab.BSV20 && (
          <InscribeBsv20 inscribedCallback={inscribedCallback} />
        )}
        {selectedTab === InscriptionTab.BSV21 && (
          <InscribeBsv21 inscribedCallback={inscribedCallback} />
        )}
        {selectedTab === InscriptionTab.Collection && (
          <InscribeCollection inscribedCallback={inscribedCallback} />
        )}
      </div>
    </div>
  );
};

export default Inscribe;
