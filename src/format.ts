export function formatTime(ms: number) {
  const total = Math.round(ms / 1000), hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60, seconds = String(total % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}
