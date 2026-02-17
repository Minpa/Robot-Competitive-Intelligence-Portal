/**
 * ValidationRulesEngine - 데이터 무결성 검증 규칙 엔진
 * 
 * 연도, SoC TOPS, 액추에이터 토크 범위 체크
 * 휴머노이드 필수 필드(locomotion_type, hand_type) 경고
 * errors/warnings 분리 반환
 */

export interface ValidationIssue {
  field: string;
  value: unknown;
  rule: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export type EntityData = Record<string, unknown>;

export class ValidationRulesEngine {
  /**
   * 엔티티 타입에 따라 검증 수행
   */
  validate(entityType: string, data: EntityData): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    switch (entityType) {
      case 'humanoid_robot':
        this.validateHumanoidRobot(data, errors, warnings);
        break;
      case 'component':
        this.validateComponent(data, errors, warnings);
        break;
      case 'company':
        this.validateCompany(data, errors, warnings);
        break;
      case 'application_case':
        this.validateApplicationCase(data, errors, warnings);
        break;
      default:
        // 알 수 없는 타입은 경고만
        console.warn(`[ValidationRulesEngine] Unknown entity type: ${entityType}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 연도 범위 검증 (1990~2035)
   */
  validateYear(value: number): ValidationIssue | null {
    if (value < 1990 || value > 2035) {
      return {
        field: 'year',
        value,
        rule: 'year_range',
        message: `연도는 1990~2035 범위여야 합니다. (입력값: ${value})`,
      };
    }
    return null;
  }

  /**
   * SoC TOPS 범위 검증 (0.1~10000)
   */
  validateTops(value: number): ValidationIssue | null {
    if (value < 0.1 || value > 10000) {
      return {
        field: 'tops',
        value,
        rule: 'tops_range',
        message: `TOPS 값은 0.1~10000 범위여야 합니다. (입력값: ${value})`,
      };
    }
    return null;
  }

  /**
   * 액추에이터 토크 범위 검증 (0.01~5000 Nm)
   */
  validateTorque(value: number): ValidationIssue | null {
    if (value < 0.01 || value > 5000) {
      return {
        field: 'torque',
        value,
        rule: 'torque_range',
        message: `토크 값은 0.01~5000 Nm 범위여야 합니다. (입력값: ${value})`,
      };
    }
    return null;
  }

  /**
   * 휴머노이드 필수 필드 검증
   */
  validateHumanoidCompleteness(data: EntityData): ValidationIssue[] {
    const warnings: ValidationIssue[] = [];

    if (!data.locomotion_type && !data.locomotionType) {
      warnings.push({
        field: 'locomotion_type',
        value: null,
        rule: 'humanoid_locomotion_required',
        message: '휴머노이드 로봇의 이동 방식(locomotion_type)이 지정되지 않았습니다.',
      });
    }

    if (!data.hand_type && !data.handType) {
      warnings.push({
        field: 'hand_type',
        value: null,
        rule: 'humanoid_hand_required',
        message: '휴머노이드 로봇의 손 타입(hand_type)이 지정되지 않았습니다.',
      });
    }

    return warnings;
  }

  // ---- Private validation methods ----

  private validateHumanoidRobot(data: EntityData, errors: ValidationIssue[], warnings: ValidationIssue[]) {
    // 연도 검증
    const year = data.announcement_year ?? data.announcementYear;
    if (typeof year === 'number') {
      const issue = this.validateYear(year);
      if (issue) errors.push(issue);
    }

    // 필수 필드 경고
    warnings.push(...this.validateHumanoidCompleteness(data));

    // 이름 필수
    if (!data.name) {
      errors.push({
        field: 'name',
        value: data.name,
        rule: 'name_required',
        message: '로봇 이름은 필수입니다.',
      });
    }
  }

  private validateComponent(data: EntityData, errors: ValidationIssue[], warnings: ValidationIssue[]) {
    // SoC TOPS 검증
    const tops = data.tops ?? data.topsMin ?? data.topsMax;
    if (typeof tops === 'number') {
      const issue = this.validateTops(tops);
      if (issue) errors.push(issue);
    }

    // 액추에이터 토크 검증
    const torque = data.ratedTorqueNm ?? data.maxTorqueNm ?? data.torque;
    if (typeof torque === 'number') {
      const issue = this.validateTorque(torque);
      if (issue) errors.push(issue);
    }

    // 이름 필수
    if (!data.name) {
      errors.push({
        field: 'name',
        value: data.name,
        rule: 'name_required',
        message: '부품 이름은 필수입니다.',
      });
    }

    // 타입 필수
    if (!data.type) {
      warnings.push({
        field: 'type',
        value: data.type,
        rule: 'type_recommended',
        message: '부품 타입(actuator, soc, sensor, power)을 지정하는 것이 좋습니다.',
      });
    }
  }

  private validateCompany(data: EntityData, errors: ValidationIssue[], warnings: ValidationIssue[]) {
    if (!data.name) {
      errors.push({
        field: 'name',
        value: data.name,
        rule: 'name_required',
        message: '회사 이름은 필수입니다.',
      });
    }

    const year = data.founding_year ?? data.foundingYear;
    if (typeof year === 'number') {
      const issue = this.validateYear(year);
      if (issue) errors.push(issue);
    }

    if (!data.country) {
      warnings.push({
        field: 'country',
        value: null,
        rule: 'country_recommended',
        message: '회사 국가를 지정하는 것이 좋습니다.',
      });
    }
  }

  private validateApplicationCase(data: EntityData, errors: ValidationIssue[], warnings: ValidationIssue[]) {
    if (!data.robot_id && !data.robotId) {
      errors.push({
        field: 'robot_id',
        value: null,
        rule: 'robot_id_required',
        message: '적용 사례에는 로봇 ID가 필수입니다.',
      });
    }

    if (!data.environment_type && !data.environmentType) {
      warnings.push({
        field: 'environment_type',
        value: null,
        rule: 'environment_recommended',
        message: '적용 환경 타입을 지정하는 것이 좋습니다.',
      });
    }

    if (!data.task_type && !data.taskType) {
      warnings.push({
        field: 'task_type',
        value: null,
        rule: 'task_recommended',
        message: '작업 타입을 지정하는 것이 좋습니다.',
      });
    }
  }
}

export const validationRulesEngine = new ValidationRulesEngine();
