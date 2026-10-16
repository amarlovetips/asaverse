type Props = { size: number; height: number; zoom: number; pixelKeys: string[] };

export default function MagicWandSelectionOverlay({ size, height, zoom, pixelKeys }: Props) {
  return <svg aria-label="Magic Wand pixel selection" className="pointer-events-none absolute inset-0 z-20"
    width={size * zoom} height={height * zoom} viewBox={`0 0 ${size} ${height}`} preserveAspectRatio="none">
    {pixelKeys.map(key => {
      const [x, y] = key.split(",").map(Number);
      return <rect key={key} x={x} y={y} width="1" height="1" fill="rgba(253,224,71,.3)" stroke="#fde047" strokeWidth=".12"/>;
    })}
  </svg>;
}
