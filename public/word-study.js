// Phrase glosses for the built-in lesson. Other words can show line context.
const wordGlosses = {
 '넌':['you (topic)','你（主題）'],'널':['you (object)','你（受詞）'],
 '너무':['so; very','非常；太'],'아름다워':['are beautiful','很美'],
 '잊을':['to forget','忘記'],'수가 없어':["can't; there's no way to",'無法；沒辦法'],
 '눈빛이':['the look in your eyes','你的眼神'],'아직':['still','仍然'],
 '나를':['me (object)','我（受詞）'],'이렇게':['like this; this much','這樣；這麼'],
 '설레게 해':['makes my heart flutter','讓我心動'],'오직':['only','只；唯有'],
 '너와':['with you','和你'],'같이':['together','一起'],'하고파':['want to do','想做'],
 '낮에도':['even during the day','白天也'],'밤에도':['even at night','晚上也'],
 '원해':['want','想要'],'매일':['every day','每天'],'모든':['all','所有'],
 '남자들이':['the guys (subject)','男生們（主詞）'],'대부분이':['most of them','他們之中的大多數'],
 '착각':['mistaken impression','錯覺；誤以為'],'맘을':['heart (object)','心（受詞）'],
 '심장을':['heart (object)','心臟（受詞）'],'보여봐':['show me','給我看看'],
 '나지막이':['softly; quietly','輕聲地'],'불러줘':['sing for me','唱給我聽'],
 '귓가에':['by my ear','在耳邊'],'휘파람처럼':['like a whistle','像口哨一樣'],
 '이대로':['just like this','就這樣'],'지나치지 마요':["don't pass me by",'別擦身而過'],
 '나처럼':['like me','像我一樣'],'향한':['directed toward','朝向；對著'],
 '마음은':['feelings; heart (topic)','心意（主題）'],'빠르게':['quickly','快速地'],
 '점점':['gradually; more and more','漸漸；越來越'],'가까이':['close; nearer','靠近'],
 '휘파람':['whistle','口哨'],'휘파라-파라-파라-밤':['playful whistle sounds','俏皮的口哨擬聲'],
 '아무 말 하지마':["don't say anything",'什麼都別說'],'소리가':['sound (subject)','聲音（主詞）'],
 '지금':['now','現在'],'생각은':['thinking (topic)','思考（主題）'],'지루해':['is boring','很無聊'],
 '곁에만':['only by my side','只在我身邊'],'있어줘':['please stay','請留下來'],
 '언제나':['always','總是'],'앞에선':['in front of; around','在……面前'],
 '그만':['stop; enough','別再；夠了'],'내게':['to me','向我；給我'],
 '이젠':['now; from now on','現在；從現在起'],'게임은':['the game (topic)','遊戲（主題）'],
 '택해':['choose','選擇'],'안아줘':['hold me','抱抱我'],'더 세게':['more tightly','更緊一點'],
 '가기 전에':['before going','在離開之前'],'바람처럼':['like the wind','像風一樣'],
 '스쳐 가는':['passing by','擦身而過'],'인연이':['connection; bond (subject)','緣分（主詞）'],
 '필요 없어':["don't need",'不需要'],'데려가줘':['take me with you','帶我走']
};

function studyGloss(line, at){
 let best=null;
 for(const [phrase,meaning] of Object.entries(wordGlosses)){
  for(let pos=line.indexOf(phrase);pos>=0;pos=line.indexOf(phrase,pos+1)){
   if(pos<=at&&at<pos+phrase.length&&!/[가-힣]/.test(line[pos-1]||'')&&!/[가-힣]/.test(line[pos+phrase.length]||'')&&(!best||phrase.length>best.phrase.length)){
    best={phrase,start:pos,end:pos+phrase.length,meaning};
   }
  }
 }
 return best;
}

function romanSoundRange(line,roman,at){
 const words=[...line.matchAll(/\S+/g)], sounds=[...roman.matchAll(/\S+/g)];
 const i=words.findIndex(w=>w.index<=at&&at<w.index+w[0].length);
 if(i<0||words.length!==sounds.length)return null;
 const word=words[i], sound=sounds[i];
 const letters=[...sound[0].matchAll(/[a-z0-9]/gi)];
 const syllables=[...word[0]].map(c=>romanizeLyric(c));
 const position=at-word.index, lens=syllables.map(s=>s.length);
 if(syllables.join('')!==normalizeLyric(sound[0])){
  // Find the closest split without losing the spelling used in the lyric.
  const r=normalizeLyric(sound[0]), memo=new Map();
  function split(j,k){
   if(j===syllables.length)return k===r.length?{score:0,lens:[]}:null;
   const key=j+':'+k;if(memo.has(key))return memo.get(key);
   let best=null;
   for(let n=syllables[j]?1:0;n<=Math.min(syllables[j]?5:0,r.length-k);n++){
    const tail=split(j+1,k+n);if(!tail)continue;
    const score=tail.score+(n?similarity(syllables[j],r.slice(k,k+n)):0)-.04*Math.abs(n-lens[j]);
    if(!best||score>best.score)best={score,lens:[n,...tail.lens]};
   }
   memo.set(key,best);return best;
  }
  const best=split(0,0);
  if(!best||best.score<syllables.filter(Boolean).length*.45)return [sound.index,sound.index+sound[0].length];
  lens.splice(0,lens.length,...best.lens);
 }
 const before=lens.slice(0,position).reduce((a,b)=>a+b,0);
 const first=letters[before],last=letters[before+lens[position]-1];
 return first&&last?[sound.index+first.index,sound.index+last.index+1]:null;
}
