"use client";

import Image from "next/image";
import PixelArtGrid from "./PixelArtGrid";
import AlignmentGuides from "./AlignmentGuides";

type Props = {
 size:number;
 zoom:number;
 pixels:Record<string,string>;
 part:string;
 guide:boolean;
 empty:string;
 imageUrl:string|null;
 imageOpacity:number;
 imageVisible:boolean;
 imageScale:number;
 imageX:number;
 imageY:number;
 imageToolActive:boolean;
 onImagePointerDown:(e:React.PointerEvent<HTMLImageElement>)=>void;
 onImagePointerMove:(e:React.PointerEvent<HTMLImageElement>)=>void;
 onImagePointerUp:(e:React.PointerEvent<HTMLImageElement>)=>void;
 onPointerDown:(e:React.PointerEvent<HTMLDivElement>)=>void;
 onPointerMove:(e:React.PointerEvent<HTMLDivElement>)=>void;
 onPointerUp:()=>void;
};

export default function PixelArtCanvas(p:Props) {
 const extent=p.size*p.zoom;

 return (
  <div
   className="relative shrink-0 overflow-hidden border border-slate-600"
   style={{width:extent,height:extent,backgroundColor:"#252b35"}}
  >
   {p.imageUrl&&p.imageVisible&&(
    <Image src={p.imageUrl} width={extent} height={extent} unoptimized
     alt="Image layer"
     draggable={false}
     onPointerDown={p.onImagePointerDown}
     onPointerMove={p.onImagePointerMove}
     onPointerUp={p.onImagePointerUp}
     onPointerCancel={p.onImagePointerUp}
     className={`absolute inset-0 h-full w-full object-fill select-none ${
      p.imageToolActive
       ? "z-10 cursor-grab active:cursor-grabbing touch-none"
       : "pointer-events-none"
     }`}
     style={{
      opacity:p.imageOpacity,
      transform:`translate(${p.imageX*p.zoom}px, ${p.imageY*p.zoom}px) scale(${p.imageScale})`,
      transformOrigin:"center center"
     }}
    />
   )}
   <PixelArtGrid
    size={p.size}
    zoom={p.zoom}
    pixels={p.pixels}
    empty={p.empty}
    onPointerDown={p.onPointerDown}
    onPointerMove={p.onPointerMove}
    onPointerUp={p.onPointerUp}
   />
   <AlignmentGuides part={p.part} enabled={p.guide}/>
  </div>
 );
}
