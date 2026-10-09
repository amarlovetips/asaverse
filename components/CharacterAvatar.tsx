import PixelHero from "./PixelHero";
import { DEFAULT_LOOK, type CharacterLook } from "@/lib/game-types";
export default function CharacterAvatar({large=false,empty=false,onCreate,look=DEFAULT_LOOK}:{
  large?:boolean;empty?:boolean;onCreate?:()=>void;look?:CharacterLook;
}) {
  return <div className={`relative mx-auto ${large?"h-[min(68vh,650px)] w-[min(70vw,480px)]":"aspect-square w-28"}`}>
    <div className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse,#0891b844,transparent_70%)]"/>
    <div className="absolute inset-x-[15%] bottom-[8%] h-2 bg-cyan-300/40 blur-md"/>
    <div className="absolute inset-0 flex items-end justify-center">
      <PixelHero look={look} size={large?420:76}/>
    </div>
    {empty&&<button type="button" onClick={onCreate} className="absolute bottom-10 right-4 grid size-12 place-items-center rounded-full bg-cyan-300 text-3xl text-slate-950">+</button>}
  </div>;
}
