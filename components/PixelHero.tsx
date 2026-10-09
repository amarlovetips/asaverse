export default function PixelHero({ size=160 }: {
  look?: import("@/lib/game-types").CharacterLook; size?: number;
}) {
  return <img src="/assets/character.png" alt="AsaVerse Character"
    width={size} height={size*1.3}
    className="object-contain"
    style={{imageRendering:"pixelated"}} />;
}
