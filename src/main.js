import { analyze, highlightText } from './analyzer.js';

let shiciData = {};
let xuciData = {};
let articles = [];
let currentShiciMatches = {};
let currentXuciMatches = {};

async function loadData() {
  const [s, x, a] = await Promise.all([
    fetch('./data/shici.json').then(r => r.json()),
    fetch('./data/xuci.json').then(r => r.json()),
    fetch('./data/articles.json').then(r => r.json()),
  ]);
  shiciData = s;
  xuciData = x;
  articles = a;
}

function buildUsagesHtml(word, type, wordData) {
  if (!wordData || !wordData.usages) return '';
  let html = '';

  if (type === 'xuci') {
    wordData.usages.forEach((u, idx) => {
      html += `<div class="usage-block">
        <div class="usage-main"><span class="usage-num">${idx + 1}</span>${u.desc}</div>`;
      if (u.subs && u.subs.length > 0) {
        u.subs.forEach(sub => {
          html += `<div class="usage-sub"><div class="sub-desc">◆ ${sub.desc}</div>`;
          if (sub.examples && sub.examples.length > 0) {
            html += `<ul class="ex-list">` + sub.examples.map(e => `<li>${e}</li>`).join('') + `</ul>`;
          }
          html += `</div>`;
        });
      }
      if (u.examples && u.examples.length > 0) {
        html += `<ul class="ex-list">` + u.examples.map(e => `<li>${e}</li>`).join('') + `</ul>`;
      }
      html += `</div>`;
    });
    if (wordData.compounds && wordData.compounds.length > 0) {
      html += `<div class="compounds-section"><div class="detail-section-title">复合词</div>`;
      wordData.compounds.forEach(c => {
        html += `<div class="compound-block">
          <span class="compound-term">【${c.term}】</span>
          <span class="compound-desc">${c.desc}</span>`;
        if (c.examples && c.examples.length > 0) {
          html += `<ul class="ex-list">` + c.examples.map(e => `<li>${e}</li>`).join('') + `</ul>`;
        }
        html += `</div>`;
      });
      html += `</div>`;
    }
  } else {
    wordData.usages.forEach((u, idx) => {
      const keyBadge = u.key ? `<span class="key-badge">重点</span>` : '';
      html += `<div class="usage-block${u.key ? ' usage-key' : ''}">
        <div class="usage-main"><span class="usage-num">${idx + 1}</span>${u.desc}${keyBadge}</div>`;
      if (u.examples && u.examples.length > 0) {
        html += `<ul class="ex-list">` +
          u.examples.map(e => `<li>${e.sentence}${e.source ? `<span class="ex-source">《${e.source}》</span>` : ''}</li>`).join('') +
          `</ul>`;
      }
      html += `</div>`;
    });
  }
  return html;
}

function showWordModal(word) {
  const shiciMatch = currentShiciMatches[word];
  const xuciMatch = currentXuciMatches[word];
  const match = shiciMatch || xuciMatch;
  if (!match) return;

  const type = shiciMatch ? 'shici' : 'xuci';
  const typeLabel = type === 'shici' ? '实词' : '虚词';
  const wordData = type === 'shici' ? shiciData[word] : xuciData[word];
  const isKey = wordData && wordData.usages && wordData.usages.some(u => u.key);

  const usagesHtml = buildUsagesHtml(word, type, wordData);

  const sentences = match.occurrences.map(s => {
    const hl = s.replace(new RegExp(word, 'g'), `<em>${word}</em>`);
    return `<li class="sentence">${hl}</li>`;
  }).join('');

  const tagClass = isKey ? 'key-tag' : `${type}-tag`;

  document.getElementById('word-drawer-content').innerHTML = `
    <div class="detail-header">
      <span class="word-tag ${tagClass} detail-word">${word}</span>
      <span class="detail-type-badge ${type}-title">${typeLabel}${isKey ? ' · 重点' : ''}</span>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">用法释义</div>
      ${usagesHtml}
    </div>
    <div class="detail-section">
      <div class="detail-section-title">本文出现（${match.occurrences.length}处）</div>
      <ul class="occurrences">${sentences}</ul>
    </div>
  `;

  document.getElementById('word-drawer').classList.add('open');
}

function hideWordModal() {
  document.getElementById('word-drawer').classList.remove('open');
}

function runAnalysis(article) {
  const text = article.content;
  currentShiciMatches = analyze(text, shiciData);
  currentXuciMatches = analyze(text, xuciData);

  document.getElementById('text-display').innerHTML =
    highlightText(text, currentShiciMatches, currentXuciMatches, article.keyPhrases || [], article.annotations || []);

  document.getElementById('article-title').textContent =
    `${article.title}（${article.author}）`;

  const bgToggle = document.getElementById('bg-toggle');
  const bgDrawer = document.getElementById('bg-drawer');

  if (article.background) {
    bgToggle.style.display = '';
    bgToggle.onclick = () => {
      const paragraphs = article.background.split('\n\n')
        .map(p => `<p>${p}</p>`).join('');
      document.getElementById('bg-drawer-content').innerHTML =
        `<h3>${article.title} · 背景</h3>${paragraphs}`;
      bgDrawer.classList.add('open');
    };
  } else {
    bgToggle.style.display = 'none';
    bgDrawer.classList.remove('open');
  }

  document.getElementById('text-display').querySelectorAll('mark[data-word]').forEach(mark => {
    mark.addEventListener('click', () => showWordModal(mark.dataset.word));
  });
}

async function init() {
  await loadData();

  document.getElementById('word-drawer-close').addEventListener('click', hideWordModal);
  document.getElementById('bg-drawer-close').addEventListener('click', () => {
    document.getElementById('bg-drawer').classList.remove('open');
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') {
    hideWordModal();
    document.getElementById('bg-drawer').classList.remove('open');
  }});
  document.addEventListener('click', (e) => {
    if (!e.target.closest('mark') && !e.target.closest('#word-drawer')) hideWordModal();
  });

  // Nav toggle
  const layout = document.querySelector('.layout');
  document.getElementById('nav-toggle').addEventListener('click', () => {
    layout.classList.toggle('nav-hidden');
  });

  const nav = document.getElementById('article-nav');
  let currentIdx = 0;

  function selectArticle(i) {
    currentIdx = i;
    nav.querySelectorAll('.nav-article-item').forEach(el => {
      el.classList.toggle('active', +el.dataset.idx === i);
    });
    runAnalysis(articles[i]);
  }

  // Build nav: period → category (collapsible) → group → articles
  const periodMap = {};
  articles.forEach((a, i) => {
    const period = a.period || '其他';
    const category = a.category || '其他';
    const group = a.group || '其他';
    if (!periodMap[period]) periodMap[period] = {};
    if (!periodMap[period][category]) periodMap[period][category] = {};
    if (!periodMap[period][category][group]) periodMap[period][category][group] = [];
    periodMap[period][category][group].push({ a, i });
  });

  let globalNum = 1;
  Object.entries(periodMap).forEach(([period, categories]) => {
    const periodEl = document.createElement('div');
    periodEl.className = 'nav-period';

    const periodHeader = document.createElement('div');
    periodHeader.className = 'nav-period-header';
    periodHeader.textContent = period;
    periodEl.appendChild(periodHeader);

    Object.entries(categories).forEach(([category, groups]) => {
      const catEl = document.createElement('div');
      catEl.className = 'nav-category';

      const catHeader = document.createElement('div');
      catHeader.className = 'nav-category-header';
      catHeader.innerHTML = `<span>${category}</span><span class="nav-cat-arrow">▾</span>`;
      catEl.appendChild(catHeader);

      const catBody = document.createElement('div');
      catBody.className = 'nav-category-body';

      catHeader.addEventListener('click', () => catEl.classList.toggle('collapsed'));

      Object.entries(groups).forEach(([group, items]) => {
        const groupEl = document.createElement('div');
        groupEl.className = 'nav-group';

        const groupHeader = document.createElement('div');
        groupHeader.className = 'nav-group-header';
        groupHeader.textContent = group;
        groupEl.appendChild(groupHeader);

        items.forEach(({ a, i }) => {
          const item = document.createElement('div');
          item.className = 'nav-article-item';
          item.dataset.idx = i;
          item.innerHTML = `<span class="nav-num">${globalNum++}</span>${a.title}`;
          item.addEventListener('click', () => selectArticle(i));
          groupEl.appendChild(item);
        });

        catBody.appendChild(groupEl);
      });

      catEl.appendChild(catBody);
      periodEl.appendChild(catEl);
    });

    nav.appendChild(periodEl);
  });

  selectArticle(0);
}

init();
