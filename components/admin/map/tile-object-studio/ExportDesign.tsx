"use client";
type Props={name:string;part:string;size:number;height?:number;pixels:Record<string,string>;palette:string[]};
export default function ExportDesign({name,part,size,height=size,pixels,palette}:Props){
 function exportJson(){
  const data={name,part,width:size,height,pixels,palette};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
  const a=document.createElement("a");
  a.href=url;a.download=`${name.trim()||"asaverse-design"}.json`;
  a.click();URL.revokeObjectURL(url);
 }
 return <button onClick={exportJson} className="w-full rounded bg-slate-800 p-2 text-xs">Export JSON</button>;
}



