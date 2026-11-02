# 鯉 Koi Pond Portfolio

A koi-themed portfolio for an aspiring red teamer. Animated koi swim behind
the page, lily pads drift at the edges, and clicking the open water drops food
that the koi chase.

No frameworks and no build step: just HTML, CSS, and vanilla JS.

```
.
├── index.html     # all content: edit this first
├── css/style.css  # theme colors live in :root at the top
└── js/koi.js      # the pond animation
```

## Customizing

Search `index.html` for `TODO` and `[` placeholders:

| Placeholder | Where |
|---|---|
| `[Your Name]` | title, nav, hero, about, footer |
| `[your-handle]` | the terminal `whoami` |
| `your-username` | GitHub links |
| `[Project Name]` / descriptions | Projects section (copy an `<article class="card project">` to add more) |
| `--progress: 40` | Learning progress bars (0–100) |
| LinkedIn | Contact section |

In the Learning lists, add `class="done"` to a `<li>` to fill in its koi-scale bullet.

**Colors:** change the variables at the top of `css/style.css`.
**Koi:** edit `VARIETIES` in `js/koi.js` to change which patterns appear (kohaku, sanke, showa, tancho…).

## Preview locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a repo named **`your-username.github.io`**.
2. Push these files to it:
   ```bash
   git init
   git add .
   git commit -m "Koi pond portfolio"
   git branch -M main
   git remote add origin https://github.com/your-username/your-username.github.io.git
   git push -u origin main
   ```
3. In the repo, open **Settings → Pages** and set the source to `main` / root.
4. Your site will be live at `https://your-username.github.io`.
