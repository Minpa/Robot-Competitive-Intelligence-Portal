/**
 * Label collision avoidance for scatter/bubble charts.
 * Pre-computes Y offsets so labels don't overlap.
 */

interface Point {
  x: number;
  y: number;
  label: string;
}

interface LabelOffset {
  offsetY: number;
  textAnchor: 'start' | 'middle' | 'end';
  offsetX: number;
}

const LABEL_HEIGHT = 14; // approximate label height in px
const MIN_GAP = 4;       // minimum gap between labels

/**
 * Compute label offsets to avoid overlaps.
 * Points should have pixel-space x, y coordinates.
 */
export function computeLabelOffsets(points: Point[]): LabelOffset[] {
  if (points.length === 0) return [];

  // Each label gets a "slot" — we try 8 positions around the point
  const candidates = [
    { dy: -18, dx: 0, anchor: 'middle' as const },   // top
    { dy: 24, dx: 0, anchor: 'middle' as const },     // bottom
    { dy: -12, dx: 8, anchor: 'start' as const },     // top-right
    { dy: -12, dx: -8, anchor: 'end' as const },      // top-left
    { dy: 20, dx: 8, anchor: 'start' as const },      // bottom-right
    { dy: 20, dx: -8, anchor: 'end' as const },       // bottom-left
    { dy: 4, dx: 20, anchor: 'start' as const },      // right
    { dy: 4, dx: -20, anchor: 'end' as const },       // left
  ];

  const placed: Array<{ x: number; y: number; width: number }> = [];
  const results: LabelOffset[] = [];

  for (const pt of points) {
    const labelWidth = pt.label.length * 5; // rough estimate
    let bestCandidate = candidates[0];
    let bestOverlap = Infinity;

    for (const cand of candidates) {
      const lx = pt.x + cand.dx;
      const ly = pt.y + cand.dy;

      // Calculate overlap with already placed labels
      let totalOverlap = 0;
      for (const p of placed) {
        const xOverlap = Math.max(0, Math.min(lx + labelWidth / 2, p.x + p.width / 2) - Math.max(lx - labelWidth / 2, p.x - p.width / 2));
        const yOverlap = Math.max(0, (LABEL_HEIGHT + MIN_GAP) - Math.abs(ly - p.y));
        totalOverlap += xOverlap * yOverlap;
      }

      // Also check overlap with other data points (bubbles)
      for (const other of points) {
        if (other === pt) continue;
        const dist = Math.sqrt((lx - other.x) ** 2 + (ly - other.y) ** 2);
        if (dist < 20) totalOverlap += (20 - dist) * 5;
      }

      if (totalOverlap < bestOverlap) {
        bestOverlap = totalOverlap;
        bestCandidate = cand;
        if (totalOverlap === 0) break; // perfect placement
      }
    }

    const finalX = pt.x + bestCandidate.dx;
    const finalY = pt.y + bestCandidate.dy;
    placed.push({ x: finalX, y: finalY, width: labelWidth });

    results.push({
      offsetY: bestCandidate.dy,
      offsetX: bestCandidate.dx,
      textAnchor: bestCandidate.anchor,
    });
  }

  return results;
}
