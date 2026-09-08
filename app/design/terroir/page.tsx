import type { Metadata } from "next";

import { TerroirLanding } from "@/components/design/terroir/terroir-landing";
import { getKitComparison } from "@/lib/kits/comparison";
import { getProvinceCoverage } from "@/lib/zones/coverage";

export const metadata: Metadata = {
  title: "A — Terroir · exploración de landing",
};

export default async function TerroirPage() {
  const [kits, coverage] = await Promise.all([
    getKitComparison(),
    getProvinceCoverage(),
  ]);

  return <TerroirLanding kits={kits} coverage={coverage} />;
}
