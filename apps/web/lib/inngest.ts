import { Inngest } from "inngest";
import { serve } from "inngest/next";
import { env } from "./env";
import { executeArtifactJob, executeScanJob } from "./jobs";

export const inngest = new Inngest({
  id: "aeo-hosted-app",
});

export const runScanFunction = inngest.createFunction(
  { id: "run-scan" },
  { event: "scan/run" },
  async ({ event }) => executeScanJob(event.data.scanId as string)
);

export const generateArtifactsFunction = inngest.createFunction(
  { id: "generate-artifacts" },
  { event: "scan/remediate" },
  async ({ event }) => executeArtifactJob(event.data.scanId as string, event.data.artifactKinds as string[] | undefined)
);

export const inngestRoute = serve({
  client: inngest,
  functions: [runScanFunction, generateArtifactsFunction],
});

export async function triggerScan(scanId: string) {
  if (env.INNGEST_EVENT_KEY) {
    await inngest.send({
      name: "scan/run",
      data: { scanId },
    });
    return;
  }

  await executeScanJob(scanId);
}

export async function triggerArtifacts(scanId: string, artifactKinds?: string[]) {
  if (env.INNGEST_EVENT_KEY) {
    await inngest.send({
      name: "scan/remediate",
      data: { scanId, artifactKinds },
    });
    return;
  }

  await executeArtifactJob(scanId, artifactKinds);
}
