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
