/**
 * Environment catalog service · vacuum-arm REQ-6
 * Furniture, obstacles, target objects, room presets, scenarios.
 * All read-only mock data.
 */

import { FURNITURE } from './mock-data/furniture.js';
import { OBSTACLES } from './mock-data/obstacles.js';
import { TARGET_OBJECTS } from './mock-data/target-objects.js';
import { ROOM_PRESETS } from './mock-data/room-presets.js';
import { SCENARIOS } from './mock-data/scenarios.js';
import type {
  FurnitureSpec,
  ObstacleSpec,
  TargetObjectSpec,
  RoomPresetSpec,
  ScenarioSpec,
} from './types.js';

class EnvironmentService {
  listFurniture(): FurnitureSpec[] {
    return [...FURNITURE];
  }
  getFurnitureById(id: number): FurnitureSpec | undefined {
    return FURNITURE.find((f) => f.id === id);
  }
  listObstacles(): ObstacleSpec[] {
    return [...OBSTACLES];
  }
  getObstacleById(id: number): ObstacleSpec | undefined {
    return OBSTACLES.find((o) => o.id === id);
  }
  listTargetObjects(): TargetObjectSpec[] {
    return [...TARGET_OBJECTS];
  }
  getTargetObjectById(id: number): TargetObjectSpec | undefined {
    return TARGET_OBJECTS.find((t) => t.id === id);
  }
  listRoomPresets(): RoomPresetSpec[] {
    return [...ROOM_PRESETS];
  }
  getRoomPreset(id: RoomPresetSpec['id']): RoomPresetSpec | undefined {
    return ROOM_PRESETS.find((p) => p.id === id);
  }
  listScenarios(): ScenarioSpec[] {
    return [...SCENARIOS];
  }
  getScenario(id: ScenarioSpec['id']): ScenarioSpec | undefined {
    return SCENARIOS.find((s) => s.id === id);
  }
}

export const environmentService = new EnvironmentService();
