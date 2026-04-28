/**
 * Sensor catalog service · REQ-2
 */

import { SENSORS } from './mock-data/sensors.js';
import type { SensorSpec, SensorType } from './types.js';

class SensorService {
  list(filter?: { type?: SensorType; minFovDeg?: number }): SensorSpec[] {
    return SENSORS.filter((s) => {
      if (filter?.type && s.type !== filter.type) return false;
      if (filter?.minFovDeg && s.fovHorizontalDeg < filter.minFovDeg) return false;
      return true;
    }) as SensorSpec[];
  }

  getBySku(sku: string): SensorSpec | undefined {
    return SENSORS.find((s) => s.sku === sku);
  }
}

export const sensorService = new SensorService();
