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

export type PixelPoint = { x: number; y: number };

export function boundsBetween(start: PixelPoint, end: PixelPoint) {
 const left=Math.min(start.x,end.x),top=Math.min(start.y,end.y);
 return {x:left,y:top,width:Math.abs(end.x-start.x)+1,height:Math.abs(end.y-start.y)+1};
}

export function floodFillPixels(pixels:Record<string,string>,x:number,y:number,size:number,fillColor:string|null,bounds?:{x:number;y:number;width:number;height:number}){
 if(!Number.isInteger(size)||size<1||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=size||y>=size)return pixels;
 const minX=bounds?Math.max(0,bounds.x):0,minY=bounds?Math.max(0,bounds.y):0;
 const maxX=bounds?Math.min(size,bounds.x+bounds.width):size,maxY=bounds?Math.min(size,bounds.y+bounds.height):size;
 if(x<minX||x>=maxX||y<minY||y>=maxY)return pixels;
 const target=pixels[`${x},${y}`];
 const sameColor=(a:string|undefined,b:string|undefined)=>a===b||(a!==undefined&&b!==undefined&&a.toLowerCase()===b.toLowerCase());
 if(sameColor(target,fillColor??undefined))return pixels;

 const area=size*size,visited=new Uint8Array(area),queue=new Int32Array(area);
 let head=0,tail=0;
 const start=y*size+x;
 queue[tail++]=start;visited[start]=1;
 const next={...pixels};
 while(head<tail){
  const index=queue[head++],px=index%size,py=Math.floor(index/size),key=`${px},${py}`;
  if(!sameColor(pixels[key],target))continue;
  if(fillColor===null)delete next[key];else next[key]=fillColor;
  const neighbors=[px>minX?index-1:-1,px+1<maxX?index+1:-1,py>minY?index-size:-1,py+1<maxY?index+size:-1];
  for(const neighbor of neighbors){
   if(neighbor<0||visited[neighbor])continue;
   const nx=neighbor%size,ny=Math.floor(neighbor/size),neighborColor=pixels[`${nx},${ny}`];
   if(!sameColor(neighborColor,target))continue;
   visited[neighbor]=1;queue[tail++]=neighbor;
  }
 }
 return next;
}

export function shapePixels(tool:string,start:PixelPoint,end:PixelPoint,size:number,fillColor:string|null,borderColor:string,filled:boolean){
 const bounds=boundsBetween(start,end),out:Record<string,string>={};
 if(tool==="line"){
  for(const key of linePixels(start.x,start.y,end.x,end.y))out[key]=borderColor;
  return out;
 }
 if(tool==="rectangle"){
  for(let y=bounds.y;y<bounds.y+bounds.height;y++)for(let x=bounds.x;x<bounds.x+bounds.width;x++){
   const edge=x===bounds.x||y===bounds.y||x===bounds.x+bounds.width-1||y===bounds.y+bounds.height-1;
   if(edge)out[`${x},${y}`]=borderColor;else if(filled&&fillColor!==null)out[`${x},${y}`]=fillColor;
  }
  return out;
 }
 if(tool==="circle"){
  const rx=Math.max(0.5,(bounds.width-1)/2),ry=Math.max(0.5,(bounds.height-1)/2);
  const cx=bounds.x+(bounds.width-1)/2,cy=bounds.y+(bounds.height-1)/2;
  for(let y=bounds.y;y<bounds.y+bounds.height;y++)for(let x=bounds.x;x<bounds.x+bounds.width;x++){
   const d=((x-cx)/rx)**2+((y-cy)/ry)**2;
   if(d<=1.12&&(filled||d>=0.55))out[`${x},${y}`]=d>=0.55?borderColor:fillColor??borderColor;
  }
 }
 return out;
}

export function polygonPixels(points:PixelPoint[],fillColor:string,borderColor:string,filled:boolean){
 const out:Record<string,string>={};
 if(points.length<3)return out;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  for(const key of linePixels(a.x,a.y,b.x,b.y))out[key]=borderColor;
 }
 if(!filled)return out;
 const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
 const minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
   const a=points[i],b=points[j];
   if(((a.y>y)!==(b.y>y))&&(x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x))inside=!inside;
  }
  if(inside&&!out[`${x},${y}`])out[`${x},${y}`]=fillColor;
 }
 return out;
}

function rgb(hex:string){return hex.replace("#","").match(/.{2}/g)?.map(v=>parseInt(v,16))||[0,0,0];}
function hex(rgbValues:number[]){return `#${rgbValues.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("")}`;}

export function gradientPixels(start:PixelPoint,end:PixelPoint,size:number,from:string,to:string){
 const a=rgb(from),b=rgb(to),points=linePixels(start.x,start.y,end.x,end.y),out:Record<string,string>={};
 points.forEach((key,index)=>{const t=points.length<2?0:index/(points.length-1);out[key]=hex(a.map((v,i)=>v+(b[i]-v)*t));});
 return out;
}

export function applyColorFilter(pixels:Record<string,string>,filter:string){
 const out:Record<string,string>={};
 for(const [key,color] of Object.entries(pixels)){
  const values=rgb(color);
  if(filter==="grayscale"){const v=0.299*values[0]+0.587*values[1]+0.114*values[2];out[key]=hex([v,v,v]);}
  else if(filter==="invert")out[key]=hex(values.map(v=>255-v));
  else if(filter==="lighten")out[key]=hex(values.map(v=>v+48));
  else if(filter==="darken")out[key]=hex(values.map(v=>v-48));
  else out[key]=color;
 }
 return out;
}

const FONT:Record<string,string[]>={
 A:["01110","10001","10001","11111","10001","10001","10001"],B:["11110","10001","10001","11110","10001","10001","11110"],C:["01111","10000","10000","10000","10000","10000","01111"],D:["11110","10001","10001","10001","10001","10001","11110"],E:["11111","10000","10000","11110","10000","10000","11111"],F:["11111","10000","10000","11110","10000","10000","10000"],G:["01111","10000","10000","10111","10001","10001","01111"],H:["10001","10001","10001","11111","10001","10001","10001"],I:["11111","00100","00100","00100","00100","00100","11111"],J:["00111","00010","00010","00010","10010","10010","01100"],K:["10001","10010","10100","11000","10100","10010","10001"],L:["10000","10000","10000","10000","10000","10000","11111"],M:["10001","11011","10101","10101","10001","10001","10001"],N:["10001","11001","10101","10011","10001","10001","10001"],O:["01110","10001","10001","10001","10001","10001","01110"],P:["11110","10001","10001","11110","10000","10000","10000"],Q:["01110","10001","10001","10001","10101","10010","01101"],R:["11110","10001","10001","11110","10100","10010","10001"],S:["01111","10000","10000","01110","00001","00001","11110"],T:["11111","00100","00100","00100","00100","00100","00100"],U:["10001","10001","10001","10001","10001","10001","01110"],V:["10001","10001","10001","10001","10001","01010","00100"],W:["10001","10001","10001","10101","10101","10101","01010"],X:["10001","10001","01010","00100","01010","10001","10001"],Y:["10001","10001","01010","00100","00100","00100","00100"],Z:["11111","00001","00010","00100","01000","10000","11111"],"0":["01110","10001","10011","10101","11001","10001","01110"],"1":["00100","01100","00100","00100","00100","00100","01110"],"2":["01110","10001","00001","00010","00100","01000","11111"],"3":["11110","00001","00001","01110","00001","00001","11110"],"4":["00010","00110","01010","10010","11111","00010","00010"],"5":["11111","10000","10000","11110","00001","00001","11110"],"6":["01110","10000","10000","11110","10001","10001","01110"],"7":["11111","00001","00010","00100","01000","01000","01000"],"8":["01110","10001","10001","01110","10001","10001","01110"],"9":["01110","10001","10001","01111","00001","00001","01110"]," ":["00000","00000","00000","00000","00000","00000","00000"]
};

export function textPixels(text:string,x:number,y:number,color:string,size:number,scale=1){
 const out:Record<string,string>={};let offset=0;
 for(const char of text.toUpperCase()){
  const glyph=FONT[char]||FONT[" "];
  glyph.forEach((row,dy)=>[...row].forEach((bit,dx)=>{if(bit!=="1")return;for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++){const px=x+offset+dx*scale+sx,py=y+dy*scale+sy;if(px>=0&&py>=0&&px<size&&py<size)out[`${px},${py}`]=color;}}));
  offset+=6*scale;
 }
 return out;
}
