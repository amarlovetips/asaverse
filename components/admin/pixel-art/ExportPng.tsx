"use client";
type Props={name:string;size:number;height?:number;pixels:Record<string,string>;empty:string};
export default function ExportPng({name,size,height=size,pixels}:Props){
 function exportPng(){
  const canvas=document.createElement("canvas");
  canvas.width=size;canvas.height=height;
  const ctx=canvas.getContext("2d");
  if(!ctx)return;
  ctx.clearRect(0,0,size,height);
  for(const [key,color] of Object.entries(pixels)){
   const [x,y]=key.split(",").map(Number);
   if(x>=0&&x<size&&y>=0&&y<height){
    ctx.fillStyle=color;ctx.fillRect(x,y,1,1);
   }
  }
  const a=document.createElement("a");
  a.download=`${name.trim()||"asaverse-design"}.png`;
  a.href=canvas.toDataURL("image/png");a.click();
 }
 return <button onClick={exportPng} className="w-full rounded bg-cyan-800 p-2 text-xs">Export Transparent PNG</button>;
}
