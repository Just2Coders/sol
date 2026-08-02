import type { Metadata } from "next";

import { WorkshopLanding } from "@/components/design/workshop/workshop-landing";
import { getKitComparison } from "@/lib/kits/comparison";
import { getProvinceCoverage } from "@/lib/zones/coverage";

export const metadata: Metadata = {
  title: "B — Taller · exploración de landing",
};

export default async function WorkshopPage() {
  const [kits, coverage] = await Promise.all([
    getKitComparison(),
    getProvinceCoverage(),
  ]);

  return <WorkshopLanding kits={kits} coverage={coverage} />;
}
