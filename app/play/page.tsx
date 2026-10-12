import { Suspense } from "react";
import PlayerGate from "@/components/PlayerGate";
import LoadingScreen from "@/components/LoadingScreen";
export default function PlayPage(){
  return <Suspense fallback={<LoadingScreen message="Entering AsaVerse..." />}><PlayerGate/></Suspense>;
}
