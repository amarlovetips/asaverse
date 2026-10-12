export function linePixels(ax:number,ay:number,bx:number,by:number){
 const points:string[]=[];
 const dx=Math.abs(bx-ax),sx=ax<bx?1:-1;
 const dy=-Math.abs(by-ay),sy=ay<by?1:-1;
 let err=dx+dy;
 while(true){
  points.push(`${ax},${ay}`);
  if(ax===bx&&ay===by)break;
  const e=2*err;
  if(e>=dy){err+=dy;ax+=sx;}
  if(e<=dx){err+=dx;ay+=sy;}
 }
 return points;
}
