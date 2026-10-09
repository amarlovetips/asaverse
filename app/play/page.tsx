import { Suspense } from "react";
import PlayerGate from "@/components/PlayerGate";
export default function PlayPage(){
  return <Suspense fallback={<main className="min-h-screen bg-[#070b17]"/>}><PlayerGate/></Suspense>;
}
