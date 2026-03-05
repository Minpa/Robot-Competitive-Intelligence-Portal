/**
 * Re-export from @rcip/shared for backward compatibility.
 * The actual implementation has been moved to packages/shared/src/scoring/positioning-generator.ts
 */
export {
  type PositioningValues,
  generateRfmPositioning,
  generatePocPositioning,
  generateSocPositioning,
  generateAllPositioning,
} from '@rcip/shared';
