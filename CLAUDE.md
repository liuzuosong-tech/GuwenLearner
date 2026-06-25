# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GuwenLearner is a static front-end web app for middle school classical Chinese (古文) vocabulary study. Given a classical Chinese text, it highlights and lists all matched 实词 (content words) and 虚词 (function words). Clicking a highlighted word shows detailed usage and definitions in the right panel.

## Architecture

Pure front-end, no backend. Must be served over HTTP (not `file://`) due to `fetch()` calls.

```
GuwenLearner/
├── index.html              # Main page
├── style.css               # Styles
├── src/
│   ├── main.js             # Entry: page init, article selection, click handlers
│   └── analyzer.js         # Core: scan text, match 实词/虚词, highlight HTML
├── data/
│   ├── shici.json          # 47 常考实词，结构：{word: {usages: [{desc, examples:[{sentence,source}]}]}}
│   ├── xuci.json           # 18 常考虚词，结构：{word: {usages: [{desc, subs:[{desc,examples}], examples}], compounds:[{term,desc,examples}]}}
│   └── articles.json       # 文章列表，结构：[{title, author, content}]
├── basicWords/             # 原始 Word 文档（实词/虚词词库来源）
│   ├── 120个文言实词用法及其举例.docx
│   └── 18个文言虚词用法及举例.docx
└── articals/               # 原始文章 Word 文档
    └── 郑伯克段于鄢.docx
```

## Dev Server

```bash
npx serve . -p 3456
# then open http://localhost:3456
```

## Deployed

GitHub Pages: https://liuzuosong-tech.github.io/GuwenLearner/
GitHub repo: https://github.com/liuzuosong-tech/GuwenLearner.git

Push to deploy:
```bash
git add -A && git commit -m "..." && git push
```

## Adding a New Article

1. User puts the `.docx` file into `articals/`
2. Run the following Python to extract and append to `data/articles.json`:

```python
import docx, json, re

doc = docx.Document(r'articals/新文章.docx')
paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]

# First line = title, second line = author, rest = content
title = paragraphs[0]
author = paragraphs[1]
content = ''.join(paragraphs[2:])

with open('data/articles.json', encoding='utf-8') as f:
    articles = json.load(f)

articles.append({'title': title, 'author': author, 'period': '春秋', 'content': content})

with open('data/articles.json', 'w', encoding='utf-8') as f:
    json.dump(articles, f, ensure_ascii=False, indent=2)
```

3. Verify in browser at `http://localhost:3456`
4. Push:
```bash
git add data/articles.json articals/新文章.docx
git commit -m "Add article: <title>"
git push
```

## Data JSON Structures

**shici.json**
```json
{
  "爱": {
    "usages": [
      { "desc": "爱护", "examples": [{"sentence": "爱其子，择师而教之。", "source": "师说"}] }
    ]
  }
}
```

**xuci.json**
```json
{
  "而": {
    "usages": [
      {
        "desc": "用作连词。",
        "subs": [{"desc": "表示并列关系。", "examples": ["蟹六跪而二螯…"]}],
        "examples": []
      }
    ],
    "compounds": [{"term": "而已", "desc": "罢了", "examples": ["..."]}]
  }
}
```

**articles.json**
```json
[{"title": "郑伯克段于鄢", "author": "左丘明·先秦", "content": "初，郑武公..."}]
```

## Key Behavior

- Sentence boundary: split on `。？！；`
- Matching is character-level
- Clicking a highlighted word in the text → right panel shows detail view (用法释义 + 本文出现)
- "← 返回列表" button returns to the full word list
