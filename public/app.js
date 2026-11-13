const $=id=>document.getElementById(id);
let phrases=[],index=0,playing=false,mode='phrase',audio=null,timer=null,epoch=0,url=null,source='youtube',player=null,ytReady=false,waiting=false,resumeAt=null;
let timing=false, pendingMark=null, awaitingPlayback=false;
const timed=p=>Number.isFinite(p.start)&&Number.isFinite(p.end)&&p.start>=0&&p.end>p.start;
const range=p=>timed(p)?`${p.start.toFixed(1)}–${p.end.toFixed(1)}s`:"Needs timing";
const key=()=>source==='youtube'?'klinguo-whistle-studio-v1':'klinguo-local-'+$('songTitle').textContent;
function restoreWhistle(){try{const saved=JSON.parse(localStorage.getItem('klinguo-whistle-studio-v1')||'null');if(saved&&Array.isArray(saved.phrases)&&saved.phrases.some(p=>p.ko)&&saved.phrases.every(p=>timed(p)||(p.start===null&&p.end===null))){phrases=saved.phrases;if((saved.timingRevision||0)<3){phrases=resetStudioTimings(phrases);save()}return}}catch{}phrases=newStudioLesson()}
function save(){try{localStorage.setItem(key(),JSON.stringify({phrases,timingRevision:3}))}catch{status('Browser storage is unavailable. Keep this tab open to retain progress.')}}
function status(s){$('status').textContent=s}
function state(v){playing=v;$('play').textContent=v?'Ⅱ':'▶';$('play').setAttribute('aria-label',v?'Pause playback':'Play sentence');document.body.classList.toggle('playing',v)}
function duration(){return source==='youtube'?(ytReady?player.getDuration():0):(audio?.duration||0)}
function currentTime(){return source==='youtube'?(ytReady?player.getCurrentTime():0):(audio?.currentTime||0)}
function pauseMedia(){if(source==='youtube'){if(ytReady)player.pauseVideo()}else audio?.pause()}
function stop(){awaitingPlayback=false;epoch++;clearTimeout(timer);waiting=false;state(false);pauseMedia();resumeAt=null}
function pause(){const t=currentTime();const wasWaiting=waiting;stop();if(!wasWaiting)resumeAt=t;status('Paused. Continue whenever you’re ready.')}
function select(i){stop();index=Math.max(0,Math.min(phrases.length-1,i));render()}
let lastFollowedLine;
function followActiveLine(){
 const list=$('lines'),active=list.querySelector('.active');
 if(!active)return;
 const initial=lastFollowedLine===undefined;
 if(!initial&&lastFollowedLine===index)return;
 lastFollowedLine=index;
 const top=list.scrollTop+active.getBoundingClientRect().top-list.getBoundingClientRect().top-(list.clientHeight-active.offsetHeight)/2;
 list.scrollTo({top:Math.max(0,top),behavior:initial||matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function render(){const p=phrases[index];$('lines').replaceChildren();phrases.forEach((p,i)=>{const b=document.createElement('button');b.className='line'+(i===index?' active':'');b.setAttribute('aria-current',String(i===index));const n=document.createElement('span'),t=document.createElement('span'),k=document.createElement('strong'),r=document.createElement('small'),c=document.createElement('span');n.className='number';n.textContent=String(i+1).padStart(2,'0');k.textContent=($('hideRoman').checked?p.ko:p.roman||p.ko)||`Practice window ${i+1} · add sentence`;k.lang=p.roman?'ko-Latn':p.ko?'ko':'en';r.textContent=range(p);c.className='check';c.textContent=i===index?'↗':'';t.append(k,r);for(const [label,text,lang] of [['English',p.meaning,'en'],['Original',p.ko,'ko'],['中文',p.zh,'zh-Hant']]){const tr=document.createElement('small');tr.lang=lang;tr.textContent=label+': '+(text||'—');t.append(tr)}b.append(n,t,c);b.onclick=()=>select(i);$('lines').append(b)});renderHangul(p.ko);pendingMark=null;$('captureLine').textContent='Mark line start';$('romanText').textContent=p.roman||p.ko||'Listen. Repeat. Sing.';$('timingIntro').hidden=timing||source!=='youtube'||timed(p);$('timingLine').textContent=`Timing line ${index+1} of ${phrases.length}: ${p.roman||p.ko}`;$('phraseNumber').textContent=`SENTENCE ${index+1} / ${phrases.length}`;$('loop').disabled=mode==='song';$('gap').disabled=mode==='song';$('phraseMode').classList.toggle('selected',mode==='phrase');$('songMode').classList.toggle('selected',mode==='song');$('sectionStart').value=p.start;$('sectionEnd').value=p.end;$('sectionKo').value=p.ko;$('sectionRoman').value=p.roman;$('sectionMeaning').value=p.meaning;$('sectionChinese').value=p.zh||'';$('videoArea').hidden=source!=='youtube';$('elapsed').textContent=range(p);followActiveLine();}
function rate(){return Number($('speed').value)}
function updateRate(){if(source==='youtube'&&ytReady){const rates=player.getAvailablePlaybackRates();const wanted=rate();const supported=rates.includes(wanted)?wanted:rates.reduce((a,b)=>Math.abs(b-wanted)<Math.abs(a-wanted)?b:a,rates[0]||1);player.setPlaybackRate(supported);$('speed').value=supported}else if(audio)audio.playbackRate=rate();$('speedLabel').textContent=rate().toFixed(2).replace(/0$/,'')+'×'}
function cycle(token){
 if(token!==epoch||!playing||waiting||awaitingPlayback)return;
 clearTimeout(timer);
 if($('loop').checked){
  waiting=true;
  pauseMedia();
  timer=setTimeout(()=>{if(token===epoch)start(false)},Number($('gap').value));
  return;
 }
 const next=phrases.findIndex((p,i)=>i>index&&p.ko&&timed(p));
 if(next<0){stop();status('');return}
 index=next;render();start(false);
}
async function start(resume=true){if(!phrases[index].ko||!timed(phrases[index])){status('Add a sentence and its video timestamps, or import timed lyrics, before practicing.');return}if(source==='youtube'&&!ytReady){status('The video is loading. If it stays unavailable, use the YouTube link or add a local audio file.');return}const at=resume&&resumeAt!==null?resumeAt:phrases[index].start;stop();const token=epoch;state(true);updateRate();if(source==='youtube'){awaitingPlayback=true;player.loadVideoById({videoId:'4lQvwoiIXPQ',startSeconds:at,endSeconds:phrases[index].end});player.setPlaybackRate(rate());status('')}else if(audio){audio.currentTime=at;audio.preservesPitch=true;try{await audio.play();if(token!==epoch){if(!playing)audio.pause();return}status('Listen, echo, repeat.');tick(token)}catch{stop();status('Audio could not play. Try a supported MP3, WAV, or M4A file.')}}}
function tick(token){if(token!==epoch||!playing||waiting)return;const t=currentTime(),d=duration();$('elapsed').textContent=`${t.toFixed(1)}s / ${d.toFixed(1)}s`;if(mode==='phrase'&&t>=phrases[index].end){cycle(token);return}if(mode==='song'){const i=phrases.findIndex(p=>t>=p.start&&t<p.end);if(i>=0&&i!==index){index=i;render()}}if(d>0&&t>=d-.05){cycle(token);return}timer=setTimeout(()=>tick(token),50)}
window.onYouTubeIframeAPIReady=()=>{player=new YT.Player('youtubePlayer',{width:'100%',height:'270',videoId:'4lQvwoiIXPQ',playerVars:{start:Math.floor(phrases[0].start??0),playsinline:1,origin:location.origin,rel:0},events:{onReady:()=>{ytReady=true;player.getIframe().title='BLACKPINK — WHISTLE studio recording';if(source==='youtube'){updateRate();player.cueVideoById({videoId:'4lQvwoiIXPQ',startSeconds:phrases.find(timed)?.start??0});status(phrases[0].ko?'Choose a sentence to start playback.':'Import your lyrics with sentence timestamps to begin at the vocals.')}},onStateChange:e=>{if(source!=='youtube')return;if(timing)return;if(e.data===1){if(!timed(phrases[index])){timing=true;$('timingTools').hidden=false;$('timingIntro').hidden=true;$('timingToggle').textContent='Exit timing mode';$('timingToggle').setAttribute('aria-pressed','true');$('timingFeedback').textContent='Mark start when you hear the selected line begin.';return}if(waiting){pauseMedia();return}if(awaitingPlayback||!playing){awaitingPlayback=false;state(true);clearTimeout(timer);tick(epoch)}}else if(e.data===0){if(playing&&!waiting)cycle(epoch)}else if(e.data===2&&playing&&!waiting&&!awaitingPlayback){const t=currentTime();if(mode==='phrase'&&t>=phrases[index].end-.1)return;resumeAt=t;epoch++;clearTimeout(timer);state(false)}},onPlaybackRateChange:e=>{if(source==='youtube'){$('speed').value=e.data;$('speedLabel').textContent=e.data+'×'}},onError:()=>{stop();status('YouTube cannot play this video here. Open the studio recording using the link above, or add a local audio file.')}}})};
const ytScript=document.createElement('script');ytScript.src='https://www.youtube.com/iframe_api';ytScript.onerror=()=>status('YouTube could not load. Use the studio recording link or add local audio.');document.head.append(ytScript);
function beginTiming(){
 setTiming(true);
 $('timingTools').scrollIntoView({block:'nearest'});
 $('timingPlay').focus({preventScroll:true});
}
$('beginTiming').onclick=beginTiming;
$('play').onclick=()=>{
 if(source==='youtube'&&!timing&&!timed(phrases[index])){beginTiming();$('timingPlay').click();return}
 if(timing){$('timingPlay').click();return}
 if(playing)pause();else start();
};$('prev').onclick=()=>select(index-1);$('next').onclick=()=>select(index+1);$('roman').onchange=render;$('speed').oninput=updateRate;for(const m of ['phrase','song'])$(m+'Mode').onclick=()=>{stop();mode='phrase';render();status('Playback advances unless Repeat is on.')};
$('wave').innerHTML=Array.from({length:64},(_,i)=>`<i style="height:${8+Math.abs(Math.sin(i*1.7)*Math.cos(i*.24))*39}px"></i>`).join('');
$('sectionForm').onsubmit=e=>{e.preventDefault();const start=$('sectionStart').value===''?NaN:Number($('sectionStart').value),end=Number($('sectionEnd').value),d=duration();$('sectionError').textContent='';if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||(d>0&&end>d)){$('sectionError').textContent='Choose a start before the end, within the song’s duration.';return}if(phrases.some((p,i)=>i!==index&&timed(p)&&start<p.end&&end>p.start)){$('sectionError').textContent='This section overlaps another. Adjust the start or end.';return}if(!timing)stop();const item={start,end,ko:$('sectionKo').value.trim(),roman:$('sectionRoman').value.trim(),meaning:$('sectionMeaning').value.trim(),zh:$('sectionChinese').value.trim()};phrases[index]=item;index=phrases.indexOf(item);save();render();status('Sentence saved. Press play to practice.');if(timing){const next=index+1;if(next<phrases.length){index=next;render();if(!timed(phrases[next]))$('sectionStart').value=item.end.toFixed(1);$('timingFeedback').textContent='Timing saved. Press Mark line start when you hear the next line begin.'}else $('timingFeedback').textContent='Timing saved. Exit timing mode to practice.'}};
$('addSection').onclick=()=>{const end=Math.max(...phrases.map(p=>p.end)),d=duration();if(d&&end>=d){status('You’ve reached the end of the song. Edit an existing section to make room.');return}stop();phrases.push({start:end,end:d?Math.min(end+10,d):end+10,ko:'',roman:'',meaning:'',zh:''});index=phrases.length-1;save();render();$('sectionStart').focus()};
$('markStart').onclick=()=>{$('sectionStart').value=currentTime().toFixed(1)};$('markEnd').onclick=()=>{$('sectionEnd').value=currentTime().toFixed(1)};
$('whistle').onclick=()=>{setTiming(false);stop();source='youtube';index=0;mode='phrase';restoreWhistle();$('songTitle').textContent='WHISTLE';$('songSubtitle').textContent='BLACKPINK · SQUARE ONE · Studio recording';document.querySelector('.pill').textContent='OFFICIAL VIDEO';render();updateRate();status('WHISTLE selected. Your saved sections are ready.')};
$('import').onclick=()=>$('dialog').showModal();$('close').onclick=()=>$('dialog').close();
$('songForm').onsubmit=async e=>{e.preventDefault();$('importError').textContent='';try{const data=$('lyricsInput').value.trim().split('\n').map((line,i)=>{const a=line.split('|').map(s=>s.trim());if(a.length<4||!a[0]||!a[1]||!a[2]||!a[3]||!Number.isFinite(+a[0])||!Number.isFinite(+a[1])||+a[0]<0||+a[1]<=+a[0])throw Error(`Check line ${i+1}: provide start, end, Korean and romanization.`);return{start:+a[0],end:+a[1],ko:a[2],roman:a[3],meaning:a[4]||''}});for(let i=1;i<data.length;i++)if(data[i].start<data[i-1].end)throw Error('Phrase timings must be in order and must not overlap.');const f=$('audioFile').files[0];if(!f)throw Error('Choose an audio file.');const nextUrl=URL.createObjectURL(f),candidate=new Audio(nextUrl);try{await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Audio took too long to load. Try another file.')),10000);candidate.onloadedmetadata=()=>{clearTimeout(timeout);resolve()};candidate.onerror=()=>{clearTimeout(timeout);reject(Error('This audio format could not be read. Try MP3 or WAV.'))}});if(!Number.isFinite(candidate.duration)||data.some(p=>p.end>candidate.duration))throw Error('Phrase end times must fit within the audio duration.')}catch(err){URL.revokeObjectURL(nextUrl);throw err}stop();if(url)URL.revokeObjectURL(url);url=nextUrl;audio=candidate;source='local';setTiming(false);phrases=data;index=0;mode='phrase';$('songTitle').textContent=$('titleInput').value;$('songSubtitle').textContent=`Your audio · ${phrases.length} phrases`;document.querySelector('.pill').textContent='YOUR SONG';$('dialog').close();render();status('Song loaded. Re-add local audio after a reload.')}catch(err){$('importError').textContent=err.message}};
restoreWhistle();render();

function parseSentenceTime(value){
 const text=value.trim();
 if(/^\d+(?:\.\d+)?$/.test(text))return Number(text);
 const m=/^(\d+):([0-5]\d(?:\.\d+)?)$/.exec(text);
 if(m)return Number(m[1])*60+Number(m[2]);
 throw Error('Use seconds or mm:ss.s for each timestamp.');
}
$('importSentences').onclick=()=>$('sentenceDialog').showModal();
$('closeSentences').onclick=()=>$('sentenceDialog').close();
$('sentenceImportForm').onsubmit=e=>{
 e.preventDefault();$('sentenceImportError').textContent='';
 try{
  if(source!=='youtube')throw Error('Select WHISTLE before importing video timestamps.');
  const data=$('sentenceInput').value.trim().split('\n').filter(l=>l.trim()).map((line,i)=>{
   const a=line.split('|').map(s=>s.trim());
   if(a.length!==6||a.slice(2).some(x=>!x))throw Error(`Line ${i+1}: add all four language fields and both timestamps.`);
   const start=parseSentenceTime(a[0]),end=parseSentenceTime(a[1]);
   if(end<=start||duration()>0&&end>duration())throw Error(`Line ${i+1}: the end must follow the start and fit within the video.`);
   return{start,end,ko:a[2],roman:a[3],zh:a[4],meaning:a[5]};
  });
  if(!data.length)throw Error('Add at least one sentence.');
  for(let i=1;i<data.length;i++)if(data[i].start<data[i-1].end)throw Error(`Line ${i+1}: times must be in order without overlapping.`);
  setTiming(false);stop();phrases=data;index=0;mode='phrase';$('loop').checked=false;save();render();
  if(ytReady)player.cueVideoById({videoId:'4lQvwoiIXPQ',startSeconds:data[0].start});
  $('sentenceDialog').close();status('Lyrics loaded. Play starts at the first sentence and advances unless Repeat is on.');
 }catch(error){$('sentenceImportError').textContent=error.message}
};

function setTiming(enabled){
 stop(); timing=enabled;if(enabled)$('videoArea').open=true;pendingMark=null;$('captureLine').textContent='Mark line start';
 $('timingTools').hidden=!enabled; $('studioTiming').hidden=!enabled||!isWhistleLesson();$('timingIntro').hidden=enabled||source!=='youtube'||timed(phrases[index]);
 $('timingToggle').textContent=enabled?'Exit timing mode':'Match video timing';
 $('timingToggle').setAttribute('aria-pressed',String(enabled));
 $('timingFeedback').textContent=enabled?'Play the video, then press Mark line start when you hear the first sound.':'';
 if(enabled&&ytReady)player.seekTo(phrases[index].start??phrases.slice(0,index).reverse().find(timed)?.end??0,true);
}
$('doneTiming').onclick=()=>setTiming(false);
$('timingToggle').onclick=()=>{if(source!=='youtube'){status('Select WHISTLE to match lyrics to the video.');return}setTiming(!timing)};
let reviewedLyrics=[];
function showBulkReview(show){
 $('bulkForm').hidden=show;$('bulkReview').hidden=!show;
}
$('bulkOpen').onclick=()=>{if(source!=='youtube'){status('Select WHISTLE to add video lyrics.');return}stop();showBulkReview(false);$('bulkError').textContent='';$('bulkDialog').showModal()};
$('bulkClose').onclick=()=>$('bulkDialog').close();
$('bulkBack').onclick=()=>showBulkReview(false);
$('bulkForm').onsubmit=e=>{
 e.preventDefault();
 const ko=lyricLines($('bulkKo').value);
 if(!ko.length||ko.includes('-')){$('bulkError').textContent='Enter the original lyric on every row.';return}
 const tracks=[['roman','Romanization','bulkRoman'],['zh','Chinese','bulkZh'],['meaning','English','bulkEn']].map(([key,label,id])=>({key,label,rows:alignLyrics(ko,lyricLines($(id).value),key)}));
 $('reviewRows').replaceChildren();
 reviewedLyrics=ko.map((line,i)=>{
  const item={ko:line,roman:'',zh:'',meaning:'',start:null,end:null};
  const row=document.createElement('fieldset'),title=document.createElement('legend');
  title.textContent=`${i+1}. ${line}`;row.append(title);
  for(const {key,label,rows} of tracks){
   const field=document.createElement('label'),input=document.createElement('textarea');
   field.textContent=label+(rows[i].review?' · check match':'');input.rows=2;
   input.value=item[key]=rows[i].text;
   input.oninput=()=>{item[key]=input.value.trim()};field.append(input);row.append(field);
  }
  $('reviewRows').append(row);return item;
 });
 showBulkReview(true);$('bulkBack').focus({preventScroll:true});$('bulkDialog').scrollTop=0;
};
$('bulkConfirm').onclick=()=>{
 stop();phrases=reviewedLyrics;index=0;save();render();$('bulkDialog').close();setTiming(true);
 $('timingTools').scrollIntoView({block:'nearest'});$('timingPlay').focus({preventScroll:true});
 status(`Imported ${phrases.length} sentences. Mark the first vocal’s start to skip the intro in practice.`);
};
function withTimingPlayer(action){
 if(!ytReady){$('timingFeedback').textContent='The video is still loading.';return}
 action();
}
$('timingPlay').onclick=()=>withTimingPlayer(()=>player.getPlayerState()===1?player.pauseVideo():player.playVideo());
for(const [id,delta] of [['backSecond',-1],['forwardSecond',1]])$(id).onclick=()=>withTimingPlayer(()=>player.seekTo(Math.max(0,Math.min(duration()||Infinity,currentTime()+delta)),true));
$('captureLine').onclick=()=>withTimingPlayer(()=>{
 const now=Number(currentTime().toFixed(1));
 if(pendingMark===null){
  pendingMark=now;$('sectionStart').value=now;
  $('captureLine').textContent='Mark end & next';
  $('timingFeedback').textContent=`Start marked at ${now.toFixed(1)}s. Press at the boundary to end this line and start the next.`;
  return;
 }
 $('sectionStart').value=pendingMark;$('sectionEnd').value=now;
 if(now<=pendingMark){$('timingFeedback').textContent='Mark the end after the start.';return}
 const previousIndex=index;
 const form=$('sectionForm');
 if(!form.checkValidity()){$('timingFeedback').textContent='Check the start and end times before marking this boundary.';return}
 form.requestSubmit();
 if($('sectionError').textContent){$('timingFeedback').textContent=$('sectionError').textContent;return}
 if(index!==previousIndex){
  pendingMark=now;
  $('sectionStart').value=now;
  $('captureLine').textContent='Mark end & next';
  $('timingFeedback').textContent=`Next line starts at ${now.toFixed(1)}s. Press at its end.`;
 }else{
  pendingMark=null;$('captureLine').textContent='Mark line start';
 }
});
setInterval(()=>{if(timing&&ytReady)$('timingClock').textContent=`Video time · ${currentTime().toFixed(1)}s`},100);

$('builtIn').onclick=()=>{
 if(source!=='youtube'){status('Select WHISTLE to load its built-in lyrics.');return}
 stop();phrases=newStudioLesson();index=0;setTiming(false);save();render();
 status('Add your lyrics with the import tools to start practicing.');
};

function renderHangul(line){
 const target=$('korean');
 target.replaceChildren();$('hangulLetters').querySelectorAll('.letterMatch').forEach(b=>b.classList.remove('letterMatch'));$('letterInfo').textContent='Select a letter for its approximate sound.';
 $('hangulFeedback').textContent='';
 $('wordStudy').hidden=true;
 for(const [position,ch] of [...(line||'')].entries()){
  if(!/[가-힣]/.test(ch)){target.append(document.createTextNode(ch));continue}
  const button=document.createElement('button');
  button.type='button';button.className='hangulSound';button.textContent=ch;button.dataset.position=position;
  button.setAttribute('aria-label','Hear '+ch);
  button.onclick=()=>{
   showWordStudy(phrases[index],[...(line||'')].slice(0,position).join('').length,button);highlightLetters(ch);speakHangul(ch,button);
   $('hangulChart').open=true;
   requestAnimationFrame(()=>{
    const info=$('letterInfo'),panel=info.closest('.practiceContent');
    if(panel.scrollHeight>panel.clientHeight){
     panel.scrollTop+=info.getBoundingClientRect().bottom-panel.getBoundingClientRect().bottom+12;
    }else if(info.getBoundingClientRect().bottom>innerHeight){
     window.scrollBy(0,info.getBoundingClientRect().bottom-innerHeight+12);
    }
   });
  };
  target.append(button);
 }
 $('romanText').hidden=$('hideRoman').checked;
}
function speakHangul(ch,button){
 const feedback=$('hangulFeedback'),speech=window.speechSynthesis;
 feedback.textContent='';
 if(!speech||!window.SpeechSynthesisUtterance){feedback.textContent='Korean speech is unavailable in this browser.';return}
 const rank=v=>/natural|neural|premium|enhanced/i.test(v.name)?3:/google/i.test(v.name)?2:/yuna|sunhi|injoon/i.test(v.name)?1:0;
 const voice=speech.getVoices().filter(v=>/^ko(?:[-_]|$)/i.test(v.lang)).sort((a,b)=>rank(b)-rank(a))[0];
 if(!voice)return
 stop();speech.cancel();
 const utterance=new SpeechSynthesisUtterance(ch);utterance.lang='ko-KR';utterance.voice=voice;utterance.rate=.9;
 utterance.onend=()=>{
  let count=1;
  try{const key='klinguo-hangul-'+ch;count=Number(localStorage.getItem(key)||0)+1;localStorage.setItem(key,String(count))}catch{}
  button.classList.toggle('familiar',count>=3);
 };
 utterance.onerror=e=>{if(e.error!=='interrupted'&&e.error!=='canceled')feedback.textContent='Could not play the Korean voice.'};
 speech.speak(utterance);
}
$('hideRoman').onchange=()=>{ $('romanText').hidden=$('hideRoman').checked;document.body.classList.toggle('hangulReading',$('hideRoman').checked);render() };

const chartGroups=[
 ['Consonants','ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ ㅇ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ','g/k n d/t r/l m b/p s silent/ng j ch k t p h'],
 ['Vowels','ㅏ ㅑ ㅓ ㅕ ㅗ ㅛ ㅜ ㅠ ㅡ ㅣ','a ya eo yeo o yo u yu eu i'],
 ['Double consonants','ㄲ ㄸ ㅃ ㅆ ㅉ','kk tt pp ss jj'],
 ['Other vowels','ㅐ ㅒ ㅔ ㅖ ㅘ ㅙ ㅚ ㅝ ㅞ ㅟ ㅢ','ae yae e ye wa wae oe wo we wi ui']
];
for(const [title,letters,sounds] of chartGroups){
 const group=document.createElement('div'), heading=document.createElement('strong');
 heading.textContent=title;group.append(heading);
 letters.split(' ').forEach((letter,i)=>{
  const button=document.createElement('button'),hint=document.createElement('small');
  const sound=sounds.split(' ')[i];
  button.type='button';button.dataset.letter=letter;button.textContent=letter;
  hint.textContent=sound;button.append(hint);
  button.onclick=()=>{$('letterInfo').textContent=letter+' · '+sound+(letter==='ㅇ'?' · silent at the start, ng at the end':' · approximate sound; pronunciation can change in words')};
  group.append(button);
 });
 $('hangulLetters').append(group);
}
function highlightLetters(ch){
 const letters=[...ch.normalize('NFKD')].map(c=>{
  const i=c.charCodeAt(0);
  return i>=0x1100&&i<=0x1112?'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'[i-0x1100]:
   i>=0x1161&&i<=0x1175?'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'[i-0x1161]:
   'ㄱㄲㄱㅅ|ㄴ|ㄴㅈ|ㄴㅎ|ㄷ|ㄹ|ㄹㄱ|ㄹㅁ|ㄹㅂ|ㄹㅅ|ㄹㅌ|ㄹㅍ|ㄹㅎ|ㅁ|ㅂ|ㅂㅅ|ㅅ|ㅆ|ㅇ|ㅈ|ㅊ|ㅋ|ㅌ|ㅍ|ㅎ'.replace('ㄱㄲㄱㅅ','ㄱ|ㄲ|ㄱㅅ').split('|')[i-0x11a8];
 }).filter(Boolean);
 $('hangulLetters').querySelectorAll('button').forEach(b=>b.classList.toggle('letterMatch',letters.join('').includes(b.dataset.letter)));
 $('letterInfo').textContent=ch+' → '+letters.join(' + ');
}

function isWhistleLesson(){return false}


function showWordStudy(line,at,button){
 const ko=line.ko,roman=line.roman||ko;
 const gloss=studyGloss(ko,at);
 const word=[...ko.matchAll(/\S+/g)].find(m=>m.index<=at&&at<m.index+m[0].length);
 const start=gloss?.start??word.index,end=gloss?.end??(word.index+word[0].length);
 $('korean').querySelectorAll('button').forEach((b,i)=>{
  const pos=[...ko].slice(0,Number(b.dataset.position)).join('').length;
  b.classList.toggle('wordMatch',pos>=start&&pos<end);
  b.classList.toggle('syllableMatch',b===button);
 });
 const range=romanSoundRange(ko,roman,at),target=$('romanText');
 target.textContent=roman;
 if(range){
  const [a,b]=range,mark=document.createElement('mark');
  mark.textContent=roman.slice(a,b);
  target.replaceChildren(roman.slice(0,a),mark,roman.slice(b));
 }
 $('studyPhrase').textContent=gloss?.phrase??word[0]+' · line context';
 $('studyEnglish').textContent=gloss?.meaning[0]??line.meaning??'';
 $('studyChinese').textContent=gloss?.meaning[1]??line.zh??'';
 $('wordStudy').hidden=false;
}
