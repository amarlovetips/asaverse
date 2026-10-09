import PixelHero from "./PixelHero";
import { DEFAULT_LOOK, type CharacterLook } from "@/lib/game-types";
export default function CharacterAvatar({large=false,empty=false,onCreate,look=DEFAULT_LOOK}:{
  large?:boolean;empty?:boolean;onCreate?:()=>void;look?:CharacterLook;
}) {
  return <div className={`relative mx-auto grid aspect-square ${large?"w-60":"w-28"} place-items-center`}>
    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,#0891b833,transparent_70%)]"/>
    <div className="absolute inset-3 rounded-full border border-dashed border-cyan-300/30"/>
    <PixelHero look={look} size={large?150:76}/>
    {empty&&<button type="button" onClick={onCreate} aria-label="Create character" className="absolute bottom-5 right-2 grid size-12 place-items-center rounded-full border border-cyan-200 bg-cyan-300 text-3xl text-slate-950 shadow-[0_0_25px_#22d3ee99]">+</button>}
  </div>;
}
