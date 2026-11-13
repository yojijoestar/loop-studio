function lyricSourceUrl(raw){
 const url=new URL(raw.trim());
 if(url.protocol!=='https:'||url.username||url.password)throw Error('Enter a public HTTPS page URL.');
 return url;
}
function extractSourceLyrics(source,contentType){
 if(contentType.includes('text/plain'))return source.trim();
 // Parse in an inert template; never mount remote markup on the page.
 const template=document.createElement('template');template.innerHTML=source;
 const root=template.content;
 const nodes=[...root.querySelectorAll('[data-lyrics-container="true"], [itemprop="lyrics"], #lyrics, .lyrics, .lyric-body, #lyric-body')];
 const blocks=nodes.filter(node=>!nodes.some(other=>other!==node&&other.contains(node)));
 if(!blocks.length)throw Error('No recognizable lyric block was found. Open the source and paste the lyrics.');
 return blocks.map(block=>{
  block.querySelectorAll('script,style,button,iframe,nav,[hidden]').forEach(el=>el.remove());
  block.querySelectorAll('br').forEach(el=>el.replaceWith('\n'));
  block.querySelectorAll('p,div,li').forEach(el=>el.after('\n'));
  return block.textContent.trim();
 }).filter(Boolean).join('\n\n');
}
for(const id of ['bulkKo','bulkRoman','bulkZh','bulkEn']){
 const field=document.getElementById(id),box=document.createElement('div');
 box.className='lyricSource';
 const input=document.createElement('input');input.type='url';input.placeholder='https://…';input.setAttribute('aria-label',field.labels[0].textContent.trim()+' source URL');
 const load=document.createElement('button');load.type='button';load.textContent='Load URL';
 const open=document.createElement('a');open.target='_blank';open.rel='noopener noreferrer';open.textContent='Open source';open.hidden=true;
 const feedback=document.createElement('small');feedback.setAttribute('role','status');
 box.append(input,load,open,feedback);field.closest('label').after(box);
 input.oninput=()=>{open.hidden=true;open.removeAttribute('href');feedback.textContent=''};
 load.onclick=async()=>{
  let url;try{url=lyricSourceUrl(input.value)}catch{feedback.textContent='Enter a valid HTTPS page URL.';return}
  open.href=url.href;open.hidden=false;load.disabled=true;input.disabled=true;
  const previous=field.value;feedback.textContent='Reading page…';
  try{
   let response;
   try{response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(12000)})}catch{throw Error('The page could not be read from this browser. Open the source and paste its lyrics.')}
   if(!response.ok)throw Error('The source returned an error. Open it and paste its lyrics.');
   const type=response.headers.get('content-type')||'';
   if(!/text\/(html|plain)|application\/xhtml\+xml/i.test(type))throw Error('This URL does not point to an HTML or text page.');
   const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,source='';
   for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_000_000){await reader.cancel();throw Error('The page is too large. Paste its lyrics instead.')}source+=decoder.decode(value,{stream:true})}
   const lyrics=extractSourceLyrics(source+decoder.decode(),type);
   if(!lyrics)throw Error('No lyric text was found. Open the source and paste it.');
   if(field.value!==previous)throw Error('The lyrics field changed while loading. Your edits were kept.');
   field.value=lyrics;feedback.textContent='Loaded. Check the text before reviewing matches.';
  }catch(error){feedback.textContent=error.message}
  finally{load.disabled=false;input.disabled=false}
 };
}
