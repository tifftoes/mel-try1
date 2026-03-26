// ── ABILITY EXPAND TOGGLE ──
function toggleAbility(key) {
  const keys = ['q','w','e','r','passive'];
  keys.forEach(k => {
    const card = document.getElementById('abl-' + k);
    const panel = document.getElementById('panel-' + k);
    if (k === key) {
      const isOpen = panel.classList.contains('open');
      if (isOpen) {
        panel.classList.remove('open');
        card.classList.remove('active');
      } else {
        panel.classList.add('open');
        card.classList.add('active');
        setTimeout(() => {
          panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);
      }
    } else {
      panel.classList.remove('open');
      card.classList.remove('active');
    }
  });
}

// ── SUBNAV SCROLL ──
function subnavScroll(el, targetId) {
  // Update active state within this subnav
  const subnav = el.closest('.page-subnav');
  subnav.querySelectorAll('.subnav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  // Scroll to section
  const target = document.getElementById(targetId);
  if (target) {
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  }
}

// ── LANGUAGE ──
const langLabels = { en:'English',es:'Español',fr:'Français',de:'Deutsch',pt:'Brasileiro',it:'Italiano',ro:'Română',tr:'Türkçe',pl:'Polski',ru:'Русский',ko:'한국어',ja:'日本語' };
let selLangCode = 'en';
function selLang(btn) {
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  selLangCode = btn.dataset.lang;
}
function confirmLang() {
  document.getElementById('lang-overlay').style.display = 'none';
  document.getElementById('lang-label').textContent = langLabels[selLangCode] || 'English';
}
function openLang() { document.getElementById('lang-overlay').style.display = 'flex'; }

// ── NAVIGATION ──
function goPage(pageId, navEl, scrollTo) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Show target
  document.getElementById('page-' + pageId).classList.add('active');
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const target = navEl || document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (target) target.classList.add('active');
  // Scroll to subsection if specified
  if (scrollTo) {
    setTimeout(() => {
      const el = document.getElementById(scrollTo);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // Close mobile sidebar (no-op now, kept for safety)
  const sb = document.getElementById('sidebar');
  if (sb) sb.classList.remove('open');
}

// ── HORIZONTAL NAV DROPDOWNS ──
function toggleNav(navEl, subId) {
  const sub = document.getElementById(subId);
  const pageId = navEl.dataset.page;
  const isOpen = sub.classList.contains('open');

  // Close all dropdowns
  document.querySelectorAll('.nav-sub').forEach(s => s.classList.remove('open'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('open'));

  if (!isOpen) {
    sub.classList.add('open');
    navEl.classList.add('open');
    navEl.classList.add('active');
    goPage(pageId, navEl);
  }
}

// Close dropdowns when clicking outside nav
document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-dropdown-wrapper') && !e.target.closest('.topnav-nav')) {
    document.querySelectorAll('.nav-sub').forEach(s => s.classList.remove('open'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('open'));
  }
});

// ── ACCORDIONS ──
function toggleAccordion(header) {
  const body = header.nextElementSibling;
  const isOpen = header.classList.contains('open');
  header.classList.toggle('open', !isOpen);
  body.classList.toggle('open', !isOpen);
}

// ── TABS ──
function switchTab(btn, id) {
  const sec = btn.closest('section, .page-body, div');
  // Find tab bar parent
  const tabBar = btn.closest('.tab-bar') || btn.parentElement;
  tabBar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  // Find panes — siblings after tab bar
  document.querySelectorAll(`#${id}`).forEach(p => {});
  btn.classList.add('active');
  // Toggle panes in same container
  const container = tabBar.parentElement;
  container.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  container.querySelector('#' + id).classList.add('active');
}

// ── SET ACTIVE NAVIGATION BASED ON CURRENT PAGE ──
document.addEventListener('DOMContentLoaded', function() {
  const currentPath = window.location.pathname;
  const pageName = currentPath.split('/').pop().replace('.html', '');

  // Map page names to nav items
  const navMap = {
    'home': 'Intro / Home',
    'abilities': 'Abilities',
    'laning': 'Laning / Early Game',
    'pregame': 'Pregame',
    'midgame': 'Mid Game',
    'lategame': 'Late Game',
    'matchups': 'Matchups'
  };

  const navText = navMap[pageName];
  if (navText) {
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.textContent.trim() === navText) {
        item.classList.add('active');
      }
    });
  }
});