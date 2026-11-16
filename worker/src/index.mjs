// Wrangler entry point. The release pipeline generates the JSON imported below;
// see RELEASE-BUNDLE-INTERFACE.md for the exact contract.
import bundle from '../generated/released-guidance.json';
import { createGuidanceIndex, createMcpHandler } from './worker.mjs';

const index = createGuidanceIndex(bundle); // fail fast on an invalid release bundle

export default { fetch: createMcpHandler({ index }) };
