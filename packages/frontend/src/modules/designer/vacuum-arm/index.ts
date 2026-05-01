/**
 * ARGOS-Designer · vacuum-arm public surface (Phase 1 PoC v1.2)
 *
 * Module-local: only the workbench is exported. Internals (store, api,
 * components, types) stay private so the module can later be extracted
 * into its own package without untangling cross-module references.
 */

export { DesignerVacuumWorkbench } from './components/DesignerVacuumWorkbench';
export type {
  BaseShape,
  EndEffectorType,
  ArmMountPosition,
  EndEffectorSpec,
  VacuumBaseSpec,
  ManipulatorArmSpec,
  ProductConfig,
} from './types/product';
