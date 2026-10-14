/* MAGERWEB — interactions */
(function(){
  'use strict';

  /* Lucide icons */
  function initIcons(){
    if(window.lucide && typeof window.lucide.createIcons === 'function'){
      window.lucide.createIcons();
    }
  }
  initIcons();
  if(document.fonts && document.fonts.ready){ document.fonts.ready.then(initIcons); }

  /* Navbar scroll state */
  var nav = document.getElementById('nav');
  function onScrollNav(){
    nav.classList.toggle('scrolled', window.scrollY > 30);
  }
  window.addEventListener('scroll', onScrollNav, {passive:true});
  onScrollNav();

  /* Mobile burger */
  var burger = document.getElementById('navBurger');
  var navLinks = document.getElementById('navLinks');
  function closeMenu(){
    burger.classList.remove('open');
    navLinks.classList.remove('open');
    burger.setAttribute('aria-expanded','false');
    document.body.style.overflow = '';
  }
  burger.addEventListener('click', function(){
    var open = navLinks.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  });

  /* Smooth scroll for [data-scroll] + close mobile menu */
  document.querySelectorAll('[data-scroll]').forEach(function(a){
    a.addEventListener('click', function(e){
      var id = a.getAttribute('href');
      if(id && id.charAt(0) === '#'){
        var target = document.querySelector(id);
        if(target){
          e.preventDefault();
          closeMenu();
          target.scrollIntoView({behavior:'smooth', block:'start'});
        }
      }
    });
  });

  /* Scroll reveal */
  var revealEls = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){
          en.target.classList.add('visible');
          io.unobserve(en.target);
        }
      });
    }, {threshold:.12, rootMargin:'0px 0px -6% 0px'});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('visible'); });
  }

  /* Active nav link */
  var sections = ['work','services','about'];
  var navAs = {};
  document.querySelectorAll('.nav-links a[data-scroll]').forEach(function(a){
    navAs[a.getAttribute('href').slice(1)] = a;
  });
  function onScrollSpy(){
    var cur = '';
    sections.forEach(function(id){
      var s = document.getElementById(id);
      if(s && window.scrollY >= s.offsetTop - 200){ cur = id; }
    });
    Object.keys(navAs).forEach(function(id){
      navAs[id].classList.toggle('active', id === cur);
    });
  }
  window.addEventListener('scroll', onScrollSpy, {passive:true});
  onScrollSpy();

  /* FAQ accordion */
  document.querySelectorAll('.faq-item').forEach(function(item){
    var btn = item.querySelector('.faq-q');
    var ans = item.querySelector('.faq-a');
    btn.addEventListener('click', function(){
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function(o){
        o.classList.remove('open');
        o.querySelector('.faq-a').style.maxHeight = null;
        o.querySelector('.faq-q').setAttribute('aria-expanded','false');
      });
      if(!isOpen){
        item.classList.add('open');
        ans.style.maxHeight = ans.scrollHeight + 'px';
        btn.setAttribute('aria-expanded','true');
      }
    });
  });

  /* Subtle hero parallax (desktop, pointer-fine only) */
  var stage = document.getElementById('mockStage');
  if(stage && window.matchMedia('(pointer:fine)').matches){
    var hero = document.querySelector('.hero');
    var raf = null;
    hero.addEventListener('mousemove', function(e){
      if(raf) return;
      raf = requestAnimationFrame(function(){
        var r = hero.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5;
        var y = (e.clientY - r.top) / r.height - .5;
        stage.style.transform = 'translate(' + (x*14) + 'px,' + (y*10) + 'px)';
        raf = null;
      });
    });
    hero.addEventListener('mouseleave', function(){
      stage.style.transform = '';
    });
  }

  /* Escape closes mobile menu */
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){ closeMenu(); }
  });
})();

/* ============================================================
   MAGERWEB — CINEMATIC MOTION (2026-10-14)
   Progressive enhancement: tanpa JS, semua tetap tampil normal.
   ============================================================ */
(function(){
  'use strict';
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var fine = window.matchMedia('(pointer:fine)').matches;

  /* 1. Maskify: pecah headline jadi kata-per-kata dalam mask */
  function maskify(el){
    if(!el || el.classList.contains('masked')) return;
    Array.prototype.slice.call(el.childNodes).forEach(function(node){
      if(node.nodeType===3){
        var frag=document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function(part){
          if(part==='')return;
          if(/^\s+$/.test(part)){frag.appendChild(document.createTextNode(' '));return;}
          var m=document.createElement('span');m.className='mw';
          var w=document.createElement('span');w.className='mwi';w.textContent=part;
          m.appendChild(w);frag.appendChild(m);
        });
        el.replaceChild(frag,node);
      }else if(node.nodeType===1 && node.tagName!=='BR'){
        maskify(node);
      }
    });
    el.classList.add('masked');
  }
  function stagger(el,step,base){
    var ws=el.querySelectorAll('.mwi');
    for(var i=0;i<ws.length;i++){ ws[i].style.transitionDelay=((base||0)+i*(step||0.06)).toFixed(3)+'s'; }
  }

  /* Hero: main segera setelah load */
  var heroTitle=document.querySelector('.hero-title');
  if(heroTitle){
    heroTitle.classList.remove('reveal');
    maskify(heroTitle); stagger(heroTitle,0.055,0.15);
    requestAnimationFrame(function(){requestAnimationFrame(function(){
      heroTitle.classList.add('in');
    });});
  }
  /* Lepas animasi generik hero-visual agar parallax inline bisa jalan */
  var heroVisual=document.querySelector('.hero-visual');
  if(heroVisual){ setTimeout(function(){heroVisual.classList.add('cine-settled');},1900); }

  /* Section titles + CTA: ritme editorial via observer */
  var headIO=new IntersectionObserver(function(es){
    es.forEach(function(en){
      if(en.isIntersecting){
        var head=en.target;
        head.classList.add('in');
        var h=head.querySelector('.sec-title');
        if(h) h.classList.add('in');
        headIO.unobserve(head);
      }
    });
  },{threshold:.3});
  document.querySelectorAll('.sec-title').forEach(function(h){
    maskify(h); stagger(h,0.05,0.12);
    var head=h.closest('.sec-head');
    if(head){
      head.classList.remove('reveal');
      head.classList.add('masked-head');
      headIO.observe(head);
    }else{
      /* tanpa .sec-head: observe headline-nya langsung */
      var soloIO=new IntersectionObserver(function(es){
        es.forEach(function(en){ if(en.isIntersecting){ h.classList.add('in'); soloIO.disconnect(); } });
      },{threshold:.35});
      soloIO.observe(h);
    }
  });
  var ctaTitle=document.querySelector('.cta-title');
  if(ctaTitle){
    maskify(ctaTitle); stagger(ctaTitle,0.05,0.1);
    var ctaIO=new IntersectionObserver(function(es){
      es.forEach(function(en){ if(en.isIntersecting){ctaTitle.classList.add('in');ctaIO.disconnect();} });
    },{threshold:.4});
    ctaIO.observe(ctaTitle);
  }

  /* 2. Curtain wipe untuk portfolio */
  if('IntersectionObserver' in window){
    var cvIO=new IntersectionObserver(function(es){
      es.forEach(function(en){
        if(en.isIntersecting){ en.target.classList.add('in'); cvIO.unobserve(en.target); }
      });
    },{threshold:.18});
    document.querySelectorAll('.work-visual').forEach(function(v){ cvIO.observe(v); });
  }else{
    document.querySelectorAll('.work-visual').forEach(function(v){ v.classList.add('in'); });
  }

  /* 3. Magnetic buttons (desktop pointer halus saja) */
  if(fine){
    document.querySelectorAll('.btn-lime, .btn-dark').forEach(function(btn){
      btn.classList.add('magnetic');
      var str=7;
      btn.addEventListener('mousemove',function(e){
        var r=btn.getBoundingClientRect();
        var x=e.clientX-r.left-r.width/2, y=e.clientY-r.top-r.height/2;
        btn.style.transform='translate('+(x/r.width*str*2).toFixed(1)+'px,'+(y/r.height*str*2).toFixed(1)+'px)';
      });
      btn.addEventListener('mouseleave',function(){ btn.style.transform=''; });
    });
  }

  /* 4. Hero parallax halus saat scroll (transform/opacity saja) */
  var heroCopy=document.querySelector('.hero-copy');
  var ticking=false;
  function cineScroll(){
    var y=window.scrollY, vh=window.innerHeight;
    if(y<vh*1.3){
      if(heroVisual) heroVisual.style.transform='translateY('+(y*0.07).toFixed(1)+'px)';
      if(heroCopy){
        heroCopy.style.transform='translateY('+(y*-0.05).toFixed(1)+'px)';
        heroCopy.style.opacity=Math.max(0,1-y/(vh*0.85)).toFixed(3);
      }
    }
    ticking=false;
  }
  window.addEventListener('scroll',function(){
    if(!ticking){ requestAnimationFrame(cineScroll); ticking=true; }
  },{passive:true});
})();
