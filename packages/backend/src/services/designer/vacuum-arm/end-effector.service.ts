/**
 * End-effector catalog service · vacuum-arm REQ-1
 *
 * Read-only catalog. Filters by type and payload requirement.
 */

import { END_EFFECTORS } from './mock-data/end-effectors.js';
import type { EndEffectorSpec } from './types.js';

class EndEffectorService {
  list(filter?: { type?: EndEffectorSpec['type']; minPayloadKg?: number }): EndEffectorSpec[] {
    return END_EFFECTORS.filter((e) => {
      if (filter?.type && e.type !== filter.type) return false;
      if (filter?.minPayloadKg !== undefined && e.maxPayloadKg < filter.minPayloadKg) return false;
      return true;
    }) as EndEffectorSpec[];
  }

  getBySku(sku: string): EndEffectorSpec | undefined {
    return END_EFFECTORS.find((e) => e.sku === sku);
  }
}

export const endEffectorService = new EndEffectorService();
