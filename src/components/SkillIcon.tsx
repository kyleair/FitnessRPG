import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type SkillIconKind = 'speed' | 'endurance' | 'climbing' | 'push' | 'pull' | 'legs' | 'volume';

export function SkillIcon({ kind, color = '#e8c765', size = 52 }: { kind: SkillIconKind; color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    {kind === 'speed' && <><Path d="M12 39a20 20 0 1 1 40 0" /><Path d="M32 39 43 22M18 47h28" /><Circle cx="32" cy="39" r="3" fill={color} /></>}
    {kind === 'endurance' && <><Circle cx="32" cy="32" r="22" /><Path d="M32 17v15l10 7M22 50h20" /></>}
    {kind === 'climbing' && <><Path d="m14 50 13-23 8 12 8-16 8 27" /><Path d="M12 50h42M24 17h16M32 17v7" /></>}
    {kind === 'push' && <><Path d="M14 34h36M20 27v14M44 27v14M27 30h10" /><Path d="M9 30v8M55 30v8" /></>}
    {kind === 'pull' && <><Path d="M14 14h36M18 14v10M46 14v10M18 48v-8c0-8 5-13 14-13s14 5 14 13v8M25 48h14" /></>}
    {kind === 'legs' && <><Path d="M25 13v19l-8 20M39 13v19l8 20M21 13h22M18 52h14M32 52h14" /></>}
    {kind === 'volume' && <><Rect x="14" y="32" width="8" height="18" /><Rect x="28" y="22" width="8" height="28" /><Rect x="42" y="12" width="8" height="38" /><Path d="M10 52h44" /></>}
  </Svg>;
}
