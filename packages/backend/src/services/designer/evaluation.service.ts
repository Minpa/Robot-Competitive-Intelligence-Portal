/**
 * Evaluation orchestrator · combines kinematics + statics + FoV.
 *
 * Single entry point used by POST /api/designer/evaluate. The per-domain
 * services (kinematics, statics, fov) stay independently testable.
 */

import type {
  EvaluationRequest,
  EvaluationResult,
  FormFactorSummary,
} from './types.js';
import { formFactorService } from './form-factor.service.js';
import { staticsService } from './statics.service.js';
import { fovService } from './fov.service.js';

class EvaluationService {
  evaluate(request: EvaluationRequest): EvaluationResult {
    const formFactor = formFactorService.getById(request.formFactorId);
    if (!formFactor) {
      throw new Error(`unknown form factor: ${request.formFactorId}`);
    }
    return this.evaluateFormFactor(formFactor, request);
  }

  evaluateFormFactor(
    formFactor: FormFactorSummary,
    request: Omit<EvaluationRequest, 'formFactorId'>
  ): EvaluationResult {
    const payloadKg = request.payloadKg ?? formFactor.defaultPayloadKg;
    const linkLengthScale = request.linkLengthScale ?? {};

    const jointTorques = staticsService.computeJointTorques(
      formFactor,
      payloadKg,
      linkLengthScale
    );
    const payloadLimit = staticsService.computePayloadLimit(formFactor, linkLengthScale);

    const fovCoverage = request.cameras && request.cameras.length > 0
      ? fovService.computeCoverage(fovService.buildCones(formFactor, request.cameras))
      : null;

    const warnings: string[] = [];
    if (payloadKg > payloadLimit.payloadLimitKg) {
      warnings.push(
        `요청 페이로드(${payloadKg}kg)가 추정 한계(${payloadLimit.payloadLimitKg}kg, 제한 관절: ${payloadLimit.limitingJointId})를 초과합니다.`
      );
    }
    if (fovCoverage && fovCoverage.blindSpotAreaM2 > 1.5) {
      warnings.push(
        `사각지대 ${fovCoverage.blindSpotAreaM2.toFixed(2)}m² — 카메라를 추가하거나 위치를 변경하세요.`
      );
    }

    return {
      formFactorId: formFactor.id,
      totalDof: formFactor.totalDof,
      payloadKg,
      jointTorques,
      payloadLimit,
      fovCoverage,
      warnings,
      isMock: true,
    };
  }
}

export const evaluationService = new EvaluationService();
