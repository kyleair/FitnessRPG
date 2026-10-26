import Svg, { Circle, Path, Rect, G } from 'react-native-svg';
export type IconName = 'running' | 'strength' | 'cycling' | 'swimming' | 'quest';
export function Emblem({ name, color = '#e8c765', size = 32 }: { name: IconName; color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    {name === 'running' && <><Circle cx={39} cy={10} r={6} /><Path d="M31 20l11 8-7 10 12 8M35 37L22 51M42 28l13 2M28 24l-12 8" /></>}
    {name === 'strength' && <Path d="M13 25v14M20 19v26M27 26h10M44 19v26M51 25v14M20 32h24" />}
    {name === 'cycling' && <><Circle cx={18} cy={46} r={10} /><Circle cx={48} cy={46} r={10} /><Path d="M18 46l12-24 8 24M30 22h12M30 22h-8M30 22l18 24M25 32h17" /></>}
    {name === 'swimming' && <><Circle cx={21} cy={15} r={5} /><Path d="M14 24c5-6 10 6 15 0s10 6 15 0 8 2 8 2M12 39c5-5 10 5 15 0s10 5 15 0 8 2 10 2M13 50c5-5 10 5 15 0s10 5 15 0 8 2 10 2" /></>}
    {name === 'quest' && <Path d="M20 16h24l5 9-17 27-17-27 5-9ZM15 25h34M32 16v36" />}
  </Svg>;
}
export function Adventurer() {
  return <Svg width={84} height={100} viewBox="0 0 84 100">
    <Circle cx={42} cy={47} r={37} fill="#72512f" opacity={0.35} />
    <Path d="M23 48L11 79h61L59 48Z" fill="#3e7651" stroke="#233c32" strokeWidth={3} />
    <G strokeWidth={3} stroke="#51342a">
      <Rect x={28} y={31} width={28} height={27} rx={9} fill="#e9a878" />
      <Path d="M27 35V23h32v20H49V33H34v8Z" fill="#3a2926" />
      <Rect x={24} y={56} width={35} height={28} rx={4} fill="#eee3c8" />
      <Path d="M26 76h31" stroke="#8d5c32" strokeWidth={6} />
      <Rect x={26} y={84} width={13} height={11} rx={2} fill="#3f7655" />
      <Rect x={45} y={84} width={13} height={11} rx={2} fill="#3f7655" />
      <Path d="M66 50l-4 38" stroke="#a37748" strokeWidth={6} />
    </G>
    <Circle cx={37} cy={45} r={1.8} fill="#3a2926" /><Circle cx={49} cy={45} r={1.8} fill="#3a2926" />
  </Svg>;
}
