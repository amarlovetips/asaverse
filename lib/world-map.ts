export const WORLD_SIZE = 6200;
type Item = { x:number;y:number;r:number;k:number };
function random(seed:number) {
  return () => ((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
}
const rnd=random(42);
const trees:Item[]=Array.from({length:1250},()=>({x:rnd()*WORLD_SIZE,y:rnd()*WORLD_SIZE,r:18+rnd()*18,k:rnd()*4|0})).filter(t=>Math.hypot(t.x-WORLD_SIZE/2,t.y-WORLD_SIZE/2)>430);
const plants:Item[]=Array.from({length:4200},()=>({x:rnd()*WORLD_SIZE,y:rnd()*WORLD_SIZE,r:2+rnd()*5,k:rnd()*5|0}));
const ponds=[{x:900,y:1100,r:200},{x:4900,y:1500,r:150},{x:4400,y:4800,r:230},{x:1250,y:4600,r:130}];

function tree(c:CanvasRenderingContext2D,t:Item) {
  const {x,y,r,k}=t, greens=["#285337","#346b3b","#447b40","#38653b"];
  c.fillStyle="#172f24aa";c.beginPath();c.ellipse(x+8,y+12,r,r*.55,0,0,7);c.fill();
  c.fillStyle="#745039";c.fillRect(x-5,y-r*.15,10,r*.9);
  c.fillStyle=greens[k];c.beginPath();c.arc(x,y-r*.5,r,0,7);c.fill();
  c.fillStyle=["#4f8849","#5b914b","#367044","#477e43"][k];c.beginPath();c.arc(x-r*.28,y-r*.65,r*.65,0,7);c.fill();
  c.fillStyle="#82a85a99";c.beginPath();c.arc(x-r*.25,y-r*.8,r*.32,0,7);c.fill();
  c.fillStyle="#25472f";c.fillRect(x-r*.5,y-r*.1,5,3);
}
export function drawWorld(c:CanvasRenderingContext2D,w:number,h:number,px:number,py:number) {
  const left=Math.max(0,Math.min(WORLD_SIZE-w,px-w/2));
  const top=Math.max(0,Math.min(WORLD_SIZE-h,py-h/2));
  c.fillStyle="#07131a";c.fillRect(0,0,w,h);c.save();c.translate(-left,-top);
  c.fillStyle="#729b50";c.fillRect(0,0,WORLD_SIZE,WORLD_SIZE);
  for(let x=Math.floor(left/64)*64;x<left+w+64;x+=64)for(let y=Math.floor(top/64)*64;y<top+h+64;y+=64){const n=(Math.imul(x|0,374761393)^Math.imul(y|0,668265263))>>>0;c.fillStyle=["#71994d","#769e51","#6b934b","#7ca255","#6e964d"][(n>>>3)%5];c.fillRect(x,y,64,64);}
  ponds.forEach(p=>{c.fillStyle="#bdad76";c.beginPath();c.ellipse(p.x,p.y,p.r*1.12,p.r*.72,-.3,0,7);c.fill();c.fillStyle="#377f91";c.beginPath();c.ellipse(p.x,p.y,p.r,p.r*.63,-.3,0,7);c.fill();c.fillStyle="#73bac0";c.beginPath();c.ellipse(p.x-p.r*.2,p.y-p.r*.2,p.r*.38,p.r*.1,-.3,0,7);c.fill();});
  c.lineCap="round";c.strokeStyle="#577344";c.lineWidth=116;c.beginPath();c.moveTo(-50,3500);c.quadraticCurveTo(1900,2300,3100,3200);c.quadraticCurveTo(4400,4300,6300,2500);c.stroke();
  c.strokeStyle="#b49a68";c.lineWidth=92;c.stroke();
  plants.forEach(p=>{if(p.x<left-5||p.x>left+w+5||p.y<top-5||p.y>top+h+5)return;c.fillStyle=p.k===0?"#e7d783":p.k===1?"#d8e8a0":p.k===2?"#446d39":"#5a8740";c.beginPath();c.arc(p.x,p.y,p.r,0,7);c.fill();});
  trees.forEach(t=>{if(t.x>left-60&&t.x<left+w+60&&t.y>top-60&&t.y<top+h+60)tree(c,t);});
  c.strokeStyle="#31563b";c.lineWidth=28;c.strokeRect(0,0,WORLD_SIZE,WORLD_SIZE);
  c.restore();return {x:left,y:top};
}
