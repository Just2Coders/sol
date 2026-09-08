import type { Metadata } from "next";

import { BoisFrancLanding } from "@/components/design/bois-franc/bois-franc-landing";
import { getKitComparison } from "@/lib/kits/comparison";
import { getProvinceCoverage } from "@/lib/zones/coverage";

export const metadata: Metadata = {
  title: "D — Bois-Franc · exploración de landing",
};

export default async function BoisFrancPage() {
  const [kits, coverage] = await Promise.all([
    getKitComparison(),
    getProvinceCoverage(),
  ]);

  return <BoisFrancLanding kits={kits} coverage={coverage} />;
}
