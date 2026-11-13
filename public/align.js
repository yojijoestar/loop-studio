// Keep verse order, allowing gaps and groups on either side.
const lyricLines=text=>text.split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!/^\[[^\]]+\]$/.test(s));
const normalizeLyric=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
function romanizeLyric(s){
 const initials='g kk n d tt r m b pp s ss _ j jj ch k t p h'.split(' ');
 const vowels='a ae ya yae eo e yeo ye o wa wae oe yo u wo we wi yu eu ui i'.split(' ');
 const finals='_ k k k n n n t l k m p l l p l m p p t t ng t t k t p t'.split(' ');
 return normalizeLyric([...s].map(c=>{const n=c.charCodeAt(0)-44032;return n>=0&&n<11172?initials[Math.floor(n/588)]+vowels[Math.floor(n/28)%21]+finals[n%28]:c}).join(''));
}
function similarity(a,b){
 if(!a||!b)return 0;
 let prev=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]!==b[j-1]));prev=next}
 return 1-prev[b.length]/Math.max(a.length,b.length);
}
function alignLyrics(original,target,kind){
 const n=original.length,m=target.length;
 const result=Array.from({length:n},()=>({text:'',review:false}));
 if(!m)return result;
 const weight=s=>Math.max(1,s.replace(/[\s\p{P}]/gu,'').length);
 const prefix=lines=>lines.reduce((out,s)=>(out.push(out.at(-1)+weight(s)),out),[0]);
 const x=prefix(original),y=prefix(target),scale=y[m]/x[n],width=m+1;
 const score=new Float64Array((n+1)*width).fill(Infinity),path=new Array(score.length);score[0]=0;
 const groups=(lines,transform)=>lines.map((_,i)=>[1,2,3].map(k=>transform(lines.slice(i,i+k).join(' '))));
 const a=groups(original,romanizeLyric),b=groups(target,normalizeLyric);
 const moves=[[1,1],[1,2],[2,1],[1,3],[3,1],[2,2],[1,0],[0,1]];
 for(let i=0;i<=n;i++)for(let j=0;j<=m;j++)for(const [di,dj] of moves){
  if(i+di>n||j+dj>m)continue;
  let cost=1.35;
  if(di&&dj){
   const ratio=(y[j+dj]-y[j])/((x[i+di]-x[i])*scale);
   cost=.3*Math.min(2,Math.abs(Math.log(ratio)))+.38*(di+dj-2)+.18*Math.abs((i+di)/n-(j+dj)/m);
   if(kind==='roman')cost+=2*(1-similarity(a[i][di-1],b[j][dj-1]));
   if(target.slice(j,j+dj).includes('-')&&(di!==1||dj!==1))cost+=3;
  }
  const from=i*width+j,to=(i+di)*width+j+dj;
  if(score[from]+cost<score[to]){score[to]=score[from]+cost;path[to]=[di,dj]}
 }
 const steps=[];let i=n,j=m;
 while(i||j){const [di,dj]=path[i*width+j];i-=di;j-=dj;steps.push([i,j,di,dj])}
 for(const [i,j,di,dj] of steps.reverse()){
  const text=target.slice(j,j+dj).filter(s=>s!=='-').join(' ');
  if(!di){const row=result[Math.max(0,i-1)];row.text=[row.text,text].filter(Boolean).join(' ');row.review=true;continue}
  for(let k=0;k<di;k++){const row=result[i+k];row.text=[row.text,text].filter(Boolean).join(' ');row.review||=di!==1||dj!==1||(kind==='roman'?similarity(a[i][0],b[j]?.[0])<.65:n!==m)}
 }
 return result;
}
