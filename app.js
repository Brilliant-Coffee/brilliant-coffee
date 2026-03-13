// app.js - intro timeline (smooth) + simple SPA nav + profile hydrate demo
const INTRO_KEY = 'bc_seen_intro_final';
const INTRO_MS = 3200;
const STAGGER_MS = 120;
const LOTTIE_PATH = 'assets/mascot_lottie.json';
const LOTTIE_FALLBACK = 'assets/mascot_fallback.png';

function $id(id){ return document.getElementById(id); }
function toast(msg, ms=2600){ const t=document.createElement('div'); t.className='toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(()=> t.remove(), ms); }

async function mountLottie(){
  const container = $id('lottieContainer');
  if(!container) return false;
  try{
    const res = await fetch(LOTTIE_PATH, {cache:'no-cache'});
    if(!res.ok) throw new Error('no-lottie');
    const json = await res.json();
    if(window.lottie && json){
      window.lottie.loadAnimation({ container, renderer:'svg', loop:false, autoplay:true, animationData: json });
      return true;
    }
    throw new Error('lottie lib missing');
  }catch(e){
    container.innerHTML = `<img src="${LOTTIE_FALLBACK}" alt="mascot" style="width:100%;height:100%;object-fit:cover;border-radius:12px"/>`;
    return false;
  }
}

function revealMenu(){
  const items = Array.from(document.querySelectorAll('.menuItem'));
  items.forEach((el,i)=>{
    setTimeout(()=> el.classList.remove('hidden'), i * STAGGER_MS);
    setTimeout(()=> el.classList.add('visible'), i * STAGGER_MS + 20);
  });
}

async function runIntro(){
  const overlay = $id('introOverlay');
  const progress = $id('progressFill');
  const introTitle = $id('brilliantText');
  const heroTitle = $id('heroTitle');

  if(!overlay) return;

  if(localStorage.getItem(INTRO_KEY)){
    overlay.style.display = 'none';
    if(heroTitle) heroTitle.classList.add('heroVisible');
    revealMenu();
    return;
  }

  await mountLottie();

  const start = performance.now();
  function frame(now){
    const pct = Math.min(1, (now - start) / INTRO_MS);
    progress.style.width = Math.round(pct * 100) + '%';
    if(pct > 0.55 && !introTitle.classList.contains('appear')) introTitle.classList.add('appear');
    if(pct >= 1){
      introTitle.classList.remove('appear');
      setTimeout(()=> introTitle.classList.add('moveUp'), 140);
      setTimeout(()=> {
        overlay.style.display = 'none';
        if(heroTitle) heroTitle.classList.add('heroVisible');
        localStorage.setItem(INTRO_KEY, '1');
        revealMenu();
      }, 1250);
      return;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* SPA nav */
function showSection(section){
  const sections = ['home','menu','info','contact','crew'];
  sections.forEach(s => {
    const el = $id('section_' + s);
    if(!el) return;
    if(s === section) el.classList.remove('hidden'); else el.classList.add('hidden');
  });
  const card = $id('contentCard');
  if(card){ card.tabIndex = -1; card.focus(); }
}

function bindUI(){
  if($id('year')) $id('year').textContent = new Date().getFullYear();
  if($id('loginLink')) $id('loginLink').addEventListener('click', ()=> window.location.href = 'login.html');
  if($id('signupLink')) $id('signupLink').addEventListener('click', ()=> window.location.href = 'signup.html');

  document.querySelectorAll('.menuItem').forEach(item=>{
    item.addEventListener('click', ()=>{
      showSection(item.dataset.section);
      const mainTitle = $id('mainTitle');
      if(mainTitle) mainTitle.style.transform = 'translateY(-6px)';
    });
    item.addEventListener('keydown', (e)=> { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); } });
  });

  if($id('openMenuBtn')) $id('openMenuBtn').addEventListener('click', ()=> showSection('menu'));
  if($id('openCrewBtn')) $id('openCrewBtn').addEventListener('click', ()=> showSection('crew'));
}

/* hydrate profile demo */
function hydrateProfile(){
  const email = localStorage.getItem('bc_user_email');
  if(email){
    const nm = email.split('@')[0];
    if($id('display_name')) $id('display_name').textContent = nm;
    if($id('display_email')) $id('display_email').textContent = email;
    if($id('loginLink')){ $id('loginLink').textContent = 'Profile'; $id('loginLink').addEventListener('click', ()=> alert('Dashboard (demo)')); }
    if($id('signupLink')){ $id('signupLink').textContent = 'Logout'; $id('signupLink').addEventListener('click', ()=> { localStorage.removeItem('bc_user_email'); location.reload(); }); }
  }
}

/* init */
document.addEventListener('DOMContentLoaded', ()=>{
  bindUI();
  hydrateProfile();
  runIntro();
});