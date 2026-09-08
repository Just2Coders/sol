import type { Metadata } from "next";

import { MediaLanding } from "@/components/design/media/media-landing";
import { getKitComparison } from "@/lib/kits/comparison";
import { getProvinceCoverage } from "@/lib/zones/coverage";

export const metadata: Metadata = {
  title: "C — Media · exploración de landing",
};

export default async function MediaPage() {
  const [kits, coverage] = await Promise.all([
    getKitComparison(),
    getProvinceCoverage(),
  ]);

  return <MediaLanding kits={kits} coverage={coverage} />;
}
