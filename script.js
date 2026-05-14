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
  dot.addEventListener('click', () => {
    scrollToChapter(i);
    if (audio && audio.paused) tryPlay();
  });
});

if (audio) {
  // Start at 0 volume for a professional orchestral fade-in
  audio.volume = 0;
  audio.preload = 'auto'; // Start downloading immediately to remove delay
  const targetVolume = 0.35;

  let fadeInterval = null; // To store the interval ID
  const audioToggle = document.getElementById('audio-toggle');

  const fadeAudio = (target) => {
    if (fadeInterval) clearInterval(fadeInterval);
    fadeInterval = setInterval(() => {
      const step = 0.015;
      if (Math.abs(audio.volume - target) < step) {
        audio.volume = target;
        clearInterval(fadeInterval);
        fadeInterval = null;
      } else {
        audio.volume += (audio.volume < target) ? step : -step;
      }
    }, 50);
  };

  const tryPlay = async () => {
    try {
      if (audio.paused) {
        await audio.play();
        if (!audio.muted) { // Only start fade-in and animation if not muted
          fadeAudio(targetVolume);
          
          // Only show 'playing' state if enough data is buffered to actually hear it
          if (audio.readyState >= 3) {
            if (audioToggle) audioToggle.classList.add('playing');
          } else {
            audio.addEventListener('canplay', () => {
              if (audioToggle && !audio.muted) audioToggle.classList.add('playing');
            }, { once: true });
          }
        }
      }
    } catch (e) {
      // Autoplay was prevented. The user will need to interact.
    }
  };
  
  if (audioToggle) {
    audioToggle.addEventListener('click', async (e) => { // Make this async
      e.stopPropagation();
      audio.muted = !audio.muted;
      audioToggle.classList.toggle('muted', audio.muted);

      if (audio.muted) {
        audioToggle.classList.remove('playing');
        fadeAudio(0); 
      } else {
        if (audio.paused) {
          await tryPlay();
        } else {
          fadeAudio(targetVolume);
          audioToggle.classList.add('playing');
        }
      }
    });
  }

  // Attempt to play audio immediately on script execution.
  // NOTE: Modern browsers often block autoplay without user interaction.
  // If blocked, the user will need to click the audio toggle to start it.
  tryPlay();

  const initLoader = async () => {
    const images = [...document.querySelectorAll('.layer')];
    const loader = document.querySelector('.preloader');

    const finish = () => {
      if(loader) {
        loader.classList.add('fade-out');
        setTimeout(() => loader.remove(), 1000); // Clean up DOM
      }
    };

    if (images.length === 0) return finish();

    const safetyTimeout = setTimeout(finish, 3500); // Fail-safe fallback

    try {
      // Use the decode API to ensure images are ready to be painted
      await Promise.all(images.map(img => {
        if (img.decode) return img.decode().catch(() => {});
        return new Promise(resolve => {
          if (img.complete) resolve();
          else { img.onload = resolve; img.onerror = resolve; }
        });
      }));
    } catch (e) {}

    finish();
    clearTimeout(safetyTimeout);
  };
  window.addEventListener('load', initLoader);

  // Re-add interaction listeners as a fallback. 
  // If the browser blocks the initial autoplay, the music will start 
  // immediately on the user's first tap or click anywhere on the site.
  document.addEventListener('click', tryPlay, {once:true});
  document.addEventListener('touchstart', tryPlay, {once:true});

  // Handle audio ending (moving inside the if(audio) block to fix scope/null errors)
  audio.addEventListener('ended', () => {
    if (audioToggle) audioToggle.classList.remove('playing');
  });

  // Ensure the audio is set to loop programmatically
  audio.loop = true;
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
  // Normalize distance by screen width for consistent sensitivity
  const dx = (touch.clientX - touchStartX) / window.innerWidth * 100;
  const dy = (touch.clientY - touchStartY) / window.innerHeight * 100;
  
  // Threshold: swipe at least 10% of screen
  if(Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)){
    if(dx < 0){
      scrollToChapter(activeChapter + 1);
    } else {
      scrollToChapter(activeChapter - 1);
    }
    if (audio && audio.paused) tryPlay();
  }
}, {passive:true});

window.addEventListener('wheel', event => { event.preventDefault(); }, {passive:false});
window.addEventListener('touchmove', event => { event.preventDefault(); }, {passive:false});
window.addEventListener('keydown', event => {
  const blockKeys = ['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '];
  if(blockKeys.includes(event.key)) event.preventDefault();
  if(event.key === 'ArrowRight' || event.key === 'ArrowDown') scrollToChapter(activeChapter + 1);
  if(event.key === 'ArrowLeft' || event.key === 'ArrowUp') scrollToChapter(activeChapter - 1);
}, {passive:false});

function update(){
  const vh = window.innerHeight || 1;
  const y = window.scrollY || 0;
  const scrollRatio = y / (document.documentElement.scrollHeight - vh);

  let active = 0, best = -1;
  const lastIndex = chapters.length - 1;

  chapters.forEach((chapter, i) => {
    const stage = stages[i];
    const start = chapter.offsetTop;
    const h = chapter.offsetHeight;
    const local = clamp((y + vh * 0.52 - start) / h, 0, 1); // Adjusted offset for better centering

    const fadeIn = smoothstep(0.12, 0.38, local);
    let a, v;
    if (i === lastIndex) {
      // Keep the last scene visible once reached.
      a = fadeIn;
      v = smoothstep(0.18, 0.36, local);
    } else {
      const fadeOut = 1 - smoothstep(0.62, 0.88, local);
      a = clamp(fadeIn * fadeOut, 0, 1);
      v = smoothstep(0.15, 0.40, local) * (1 - smoothstep(0.60, 0.85, local));
    }

    // Optimization: Only update styles for visible or transitioning stages
    if (a > 0 || stage.style.getPropertyValue('--a') > 0) {
      stage.style.setProperty('--a', clamp(a,0,1).toFixed(4));
      stage.style.setProperty('--v', clamp(v,0,1).toFixed(4));
      stage.style.setProperty('--vis', a > 0.001 ? 'visible' : 'hidden');
    }

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
window.scrollTo(0, 0); // Ensure the page starts at the very top (Scene 1) on load/reload.
