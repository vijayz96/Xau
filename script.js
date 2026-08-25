const observer = new IntersectionObserver((entries)=>{entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')})},{threshold:.12});
document.querySelectorAll('.story, .craft, .uses, .shop, .catalogue, .contact, .timeline article, .product, .cat').forEach(el=>el.classList.add('reveal'));
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

const hero = document.querySelector('.hero-visual');
if (hero && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  hero.addEventListener('mousemove',(e)=>{
    const r=hero.getBoundingClientRect(), x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
    hero.querySelector('.saffron-art').style.transform=`translate(${x*12}px,${y*12}px)`;
    hero.querySelector('.halo').style.transform=`translate(${x*-8}px,${y*-8}px)`;
  });
  hero.addEventListener('mouseleave',()=>{
    hero.querySelector('.saffron-art').style.transform='';
    hero.querySelector('.halo').style.transform='';
  });
}

document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
  const target=document.querySelector(a.getAttribute('href'));
  if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth'})}
}));
