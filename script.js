const chapters = [...document.querySelectorAll('.chapter')];
const stages = [...document.querySelectorAll('[data-stage]')];
const dots = [...document.querySelectorAll('.dot')];
const prevBtn = document.querySelector('.nav-btn.prev');
const nextBtn = document.querySelector('.nav-btn.next');
const audio = document.getElementById('background-audio');
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
let ticking=false;
let activeChapter = 0;

function scrollToChapter(index){
  const target = clamp(index, 0, chapters.length - 1);
  const top = chapters[target]?.offsetTop || 0;
  window.scrollTo({top, behavior:'smooth'});
}

function updateNavButtons(){
  if(prevBtn){
    const visible = activeChapter > 0;
    prevBtn.style.visibility = visible ? 'visible' : 'hidden';
    prevBtn.style.opacity = visible ? '1' : '0';
    prevBtn.style.pointerEvents = visible ? 'auto' : 'none';
  }
  if(nextBtn){
    const visible = activeChapter < chapters.length - 1;
    nextBtn.style.visibility = visible ? 'visible' : 'hidden';
    nextBtn.style.opacity = visible ? '1' : '0';
    nextBtn.style.pointerEvents = visible ? 'auto' : 'none';
  }
}

if(prevBtn){ prevBtn.addEventListener('click',()=>scrollToChapter(activeChapter-1)); }
if(nextBtn){ nextBtn.addEventListener('click',()=>scrollToChapter(activeChapter+1)); }

dots.forEach((dot, i) => {
  dot.addEventListener('click', () => scrollToChapter(i));
});

if(audio){
  audio.volume = 0.24;
  const tryPlay = () => {
    audio.play().catch(() => {});
  };
  window.addEventListener('load', tryPlay);
  document.addEventListener('click', tryPlay, {once:true});
  document.addEventListener('touchstart', tryPlay, {once:true});
}

let touchStartX = 0;
let touchStartY = 0;

window.addEventListener('touchstart', event => {
  const touch = event.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, {passive:true});

window.addEventListener('touchend', event => {
  if(event.changedTouches.length === 0) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  if(Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)){
    if(dx < 0){
      scrollToChapter(activeChapter + 1);
    } else {
      scrollToChapter(activeChapter - 1);
    }
  }
}, {passive:true});

window.addEventListener('wheel', event => { event.preventDefault(); }, {passive:false});
window.addEventListener('touchmove', event => { if(Math.abs(event.touches[0]?.clientX - touchStartX) > 10) event.preventDefault(); }, {passive:false});
window.addEventListener('keydown', event => {
  const blockKeys = ['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '];
  if(blockKeys.includes(event.key)) event.preventDefault();
}, {passive:false});

function update(){
  const vh = window.innerHeight || 1;
  const y = window.scrollY || 0;
  const back = document.querySelector('.ambient-back');
  const mid = document.querySelector('.ambient-mid');
  const light = document.querySelector('.ambient-light');
  if(back) back.style.transform = `translate3d(0, ${y * -0.045}px, 0) scale(1.08)`;
  if(mid) mid.style.transform = `translate3d(0, ${y * -0.085}px, 0) scale(1.12)`;
  if(light) light.style.transform = `translate3d(0, ${y * -0.02}px, 0)`;

  let active = 0, best = -1;
  const lastIndex = chapters.length - 1;

  chapters.forEach((chapter, i) => {
    const stage = stages[i];
    const start = chapter.offsetTop;
    const h = chapter.offsetHeight;
    const local = clamp((y + vh * 0.5 - start) / h, 0, 1);

    const fadeIn = smoothstep(0.14, 0.32, local);
    let a, v;
    if (i === lastIndex) {
      // Keep the last scene visible once reached.
      a = fadeIn;
      v = smoothstep(0.18, 0.36, local);
    } else {
      const fadeOut = 1 - smoothstep(0.68, 0.86, local);
      a = clamp(fadeIn * fadeOut, 0, 1);
      v = smoothstep(0.18, 0.36, local) * (1 - smoothstep(0.66, 0.88, local));
    }
    const p = (local - 0.5) * 2.0;

    stage.style.setProperty('--a', clamp(a,0,1).toFixed(4));
    stage.style.setProperty('--p', p.toFixed(4));
    stage.style.setProperty('--v', clamp(v,0,1).toFixed(4));
    if(a > best){ best = a; active = i; }
  });
  dots.forEach((dot, i) => dot.classList.toggle('active', i === active));
  activeChapter = active;
  updateNavButtons();
  ticking=false;
}
function onScroll(){ if(!ticking){ ticking=true; requestAnimationFrame(update); } }
window.addEventListener('scroll', onScroll, {passive:true});
window.addEventListener('resize', onScroll);
update();
