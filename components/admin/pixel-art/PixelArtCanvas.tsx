"use client";

import Image from "next/image";
import PixelArtGrid from "./PixelArtGrid";
import AlignmentGuides from "./AlignmentGuides";
import ReferencePixelCanvas from "./ReferencePixelCanvas";
import type { SelectionBounds } from "./usePixelEditorState";

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
 referencePixels:Record<string,string>;
 referenceOpacity:number;
 selection:SelectionBounds|null;
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
   <ReferencePixelCanvas size={p.size} zoom={p.zoom} pixels={p.referencePixels} opacity={p.referenceOpacity}/>
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
       ? "z-20 cursor-grab active:cursor-grabbing touch-none"
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
   {p.selection&&<div aria-label="Active pixel selection" className="pointer-events-none absolute z-20 border border-dashed border-yellow-200 bg-yellow-200/10 shadow-[0_0_0_1px_#111827]" style={{left:p.selection.x*p.zoom,top:p.selection.y*p.zoom,width:p.selection.width*p.zoom,height:p.selection.height*p.zoom}}/>}
   <AlignmentGuides part={p.part} enabled={p.guide}/>
  </div>
 );
}
