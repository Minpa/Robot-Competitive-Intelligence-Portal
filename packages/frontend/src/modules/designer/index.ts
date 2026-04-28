/**
 * ARGOS-Designer · public module surface
 *
 * Microservice-friendly: this is the ONLY entry point other parts of the
 * frontend should import. Internal pieces (store, api client, types) stay
 * private to this module so we can later extract it into its own package
 * without untangling cross-module references.
 */

export { DesignerWorkbench } from './components/DesignerWorkbench';
export type {
  FormFactorId,
  FormFactorSummary,
  FormFactorListResponse,
  SkeletonNode,
  SkeletonShape,
} from './types/robot';
