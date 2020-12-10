export default function (): string {
  const h = Math.floor(Math.random() * 360);
  const s = 80 + Math.round(20 * Math.random());
  const l = 80;// + Math.round(30 * Math.random());
  return `hsl(${h}, ${s}%, ${l}%)`;
}
