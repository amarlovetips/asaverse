import PixelArtEditor from "./PixelArtEditor";
export default function AdminWorkspace({active}:{active:string}){
 const editor=active==="Pixel Art Studio"||active==="Appearance Editor";
 return <main className="h-[calc(100vh-56px)] min-w-0 flex-1 overflow-hidden p-1">
 {editor?<PixelArtEditor/>:<div className="p-6 text-slate-300"><p className="text-xs text-slate-500">Admin Studio / {active}</p><h2 className="mt-2 text-xl font-semibold">{active}</h2><p className="mt-4">Workspace ready for {active}.</p></div>}
 </main>;
}
