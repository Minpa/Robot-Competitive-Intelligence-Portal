/**
 * Form-factor service · REQ-1
 *
 * Microservice boundary: this service owns all reads of form-factor catalog
 * data. Cross-module callers MUST go through HTTP (`/api/designer/...`) or
 * the public exports in `./index.ts`. No direct file imports from outside
 * the `services/designer/` namespace.
 */

import { FORM_FACTORS } from './mock-data/form-factors.js';
import type {
  FormFactorId,
  FormFactorListResponse,
  FormFactorSummary,
} from './types.js';

class FormFactorService {
  list(): FormFactorListResponse {
    return {
      formFactors: FORM_FACTORS as FormFactorSummary[],
      isMock: true,
      generatedAt: new Date().toISOString(),
    };
  }

  getById(id: FormFactorId): FormFactorSummary | undefined {
    return FORM_FACTORS.find((f) => f.id === id);
  }

  hasId(id: string): id is FormFactorId {
    return FORM_FACTORS.some((f) => f.id === id);
  }
}

export const formFactorService = new FormFactorService();
