import { BatchScanRunner } from "@/components/batch-scan-runner";
import { getProviderConfig } from "@/lib/env";

export default function BatchScanPage() {
  return <BatchScanRunner providerAvailable={Boolean(getProviderConfig())} />;
}
