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

function showDetail(word) {
  const shiciMatch = currentShiciMatches[word];
  const xuciMatch = currentXuciMatches[word];
  const match = shiciMatch || xuciMatch;
  if (!match) return;

  const type = shiciMatch ? 'shici' : 'xuci';
  const typeLabel = type === 'shici' ? '实词' : '虚词';
  const wordData = type === 'shici' ? shiciData[word] : xuciData[word];

  // Build usages HTML
  let usagesHtml = '';
  if (wordData && wordData.usages && wordData.usages.length > 0) {
    if (type === 'xuci') {
      // 虚词：大类 → 细分 → 例句
      wordData.usages.forEach((u, idx) => {
        usagesHtml += `<div class="usage-block">
          <div class="usage-main"><span class="usage-num">${idx + 1}</span>${u.desc}</div>`;
        if (u.subs && u.subs.length > 0) {
          u.subs.forEach(sub => {
            usagesHtml += `<div class="usage-sub">
              <div class="sub-desc">◆ ${sub.desc}</div>`;
            if (sub.examples && sub.examples.length > 0) {
              usagesHtml += `<ul class="ex-list">` +
                sub.examples.map(e => `<li>${e}</li>`).join('') +
                `</ul>`;
            }
            usagesHtml += `</div>`;
          });
        }
        if (u.examples && u.examples.length > 0) {
          usagesHtml += `<ul class="ex-list">` +
            u.examples.map(e => `<li>${e}</li>`).join('') +
            `</ul>`;
        }
        usagesHtml += `</div>`;
      });
      // 复合词
      if (wordData.compounds && wordData.compounds.length > 0) {
        usagesHtml += `<div class="compounds-section"><div class="detail-section-title">复合词</div>`;
        wordData.compounds.forEach(c => {
          usagesHtml += `<div class="compound-block">
            <span class="compound-term">【${c.term}】</span>
            <span class="compound-desc">${c.desc}</span>`;
          if (c.examples && c.examples.length > 0) {
            usagesHtml += `<ul class="ex-list">` +
              c.examples.map(e => `<li>${e}</li>`).join('') +
              `</ul>`;
          }
          usagesHtml += `</div>`;
        });
        usagesHtml += `</div>`;
      }
    } else {
      // 实词：义项列表
      wordData.usages.forEach((u, idx) => {
        usagesHtml += `<div class="usage-block">
          <div class="usage-main"><span class="usage-num">${idx + 1}</span>${u.desc}</div>`;
        if (u.examples && u.examples.length > 0) {
          usagesHtml += `<ul class="ex-list">` +
            u.examples.map(e => `<li>${e.sentence}${e.source ? `<span class="ex-source">《${e.source}》</span>` : ''}</li>`).join('') +
            `</ul>`;
        }
        usagesHtml += `</div>`;
      });
    }
  }

  // Build occurrences in this article
  const sentences = match.occurrences
    .map(s => {
      const hl = s.replace(new RegExp(word, 'g'), `<em>${word}</em>`);
      return `<li class="sentence">${hl}</li>`;
    }).join('');

  document.getElementById('detail-content').innerHTML = `
    <div class="detail-header">
      <span class="word-tag ${type}-tag detail-word">${word}</span>
      <span class="detail-type-badge ${type}-title">${typeLabel}</span>
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

  document.getElementById('word-detail').classList.remove('hidden');
  document.getElementById('results').classList.add('hidden');
}

function showList() {
  document.getElementById('word-detail').classList.add('hidden');
  document.getElementById('results').classList.remove('hidden');
}

function buildResultSection(title, matches, cssClass, wordData) {
  const entries = Object.entries(matches);
  if (entries.length === 0) return '';

  let html = `<div class="result-group">
    <h3 class="group-title ${cssClass}-title">${title} <span class="count">${entries.length}个</span></h3>
    <ul class="word-list">`;

  for (const [word, { occurrences }] of entries) {
    const data = wordData[word];
    const summary = data && data.usages
      ? data.usages.slice(0, 3).map(u => u.desc).join('；') + (data.usages.length > 3 ? '…' : '')
      : '';
    html += `<li class="word-item" id="word-${word}" data-word="${word}">
      <div class="word-header">
        <span class="word-tag ${cssClass}-tag">${word}</span>
        <span class="meanings">${summary}</span>
      </div>
      <div class="occurrence-count">${occurrences.length}处</div>
    </li>`;
  }

  html += `</ul></div>`;
  return html;
}

function runAnalysis(article) {
  const text = article.content;
  currentShiciMatches = analyze(text, shiciData);
  currentXuciMatches = analyze(text, xuciData);

  document.getElementById('text-display').innerHTML =
    highlightText(text, currentShiciMatches, currentXuciMatches);

  document.getElementById('results').innerHTML =
    buildResultSection('实词', currentShiciMatches, 'shici', shiciData) +
    buildResultSection('虚词', currentXuciMatches, 'xuci', xuciData);

  document.getElementById('article-title').textContent =
    `${article.title}（${article.author}）`;

  showList();

  // 点击左侧高亮词 → 显示详情
  document.getElementById('text-display').querySelectorAll('mark[data-word]').forEach(mark => {
    mark.addEventListener('click', () => showDetail(mark.dataset.word));
  });

  // 点击右侧词条 → 显示详情
  document.getElementById('results').querySelectorAll('.word-item').forEach(item => {
    item.addEventListener('click', () => showDetail(item.dataset.word));
  });
}

async function init() {
  await loadData();

  document.getElementById('detail-back').addEventListener('click', showList);

  const trigger = document.getElementById('article-select-trigger');
  const dropdown = document.getElementById('article-select-dropdown');
  const periodFilters = document.getElementById('period-filters');

  let activePeriod = null;

  // Build period filter buttons
  const periods = [...new Set(articles.map(a => a.period).filter(Boolean))];
  if (periods.length > 0) {
    periods.forEach(period => {
      const btn = document.createElement('button');
      btn.className = 'period-btn';
      btn.textContent = period;
      btn.dataset.period = period;
      btn.addEventListener('click', () => {
        if (activePeriod === period) {
          activePeriod = null;
          btn.classList.remove('active');
        } else {
          activePeriod = period;
          periodFilters.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
        rebuildDropdown();
      });
      periodFilters.appendChild(btn);
    });
  }

  function getFilteredArticles() {
    return activePeriod ? articles.filter(a => a.period === activePeriod) : articles;
  }

  function rebuildDropdown() {
    dropdown.innerHTML = '';
    const filtered = getFilteredArticles();
    filtered.forEach((a) => {
      const idx = articles.indexOf(a);
      const num = articles.indexOf(a) + 1;
      const li = document.createElement('li');
      li.textContent = `${num}. ${a.title}`;
      li.addEventListener('click', () => selectArticle(idx));
      dropdown.appendChild(li);
    });
    // Auto-select first of filtered list
    if (filtered.length > 0) selectArticle(articles.indexOf(filtered[0]));
  }

  function selectArticle(i) {
    const num = i + 1;
    trigger.textContent = `${num}. ${articles[i].title}`;
    dropdown.querySelectorAll('li').forEach((li) => li.classList.remove('selected'));
    dropdown.classList.remove('open');
    runAnalysis(articles[i]);
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => dropdown.classList.remove('open'));

  rebuildDropdown();
}

init();
