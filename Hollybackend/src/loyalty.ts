export type Tier = 'Bronze' | 'Silver' | 'Gold';

export function tierForPoints(points: number): Tier {
  if (points >= 2000) return 'Gold';
  if (points >= 500) return 'Silver';
  return 'Bronze';
}
