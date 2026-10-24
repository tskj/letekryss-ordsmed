# Ordsmed

Internal tool for going through the Norwegian word list and deciding which words can be
answers in letekryss. Runs at https://tskj.github.io/letekryss-ordsmed/ and talks to the admin
API in letekryss-generator (`/admin/*`), which needs `ADMIN_TOKEN` from the
`letekryss-generator` service on Railway:

```
cd ~/code/letekryss-generator && railway variables --service letekryss-generator --kv | grep ADMIN_TOKEN
```

## Keys

| Key | |
| --- | --- |
| `F` | fasitord (approve) |
| `J` | ikke fasitverdig (reject) |
| `K` / `D` / `E` / `A` | kanskje / ikke et ord / egennavn / forkortelse |
| space | hopp over |
| `G` | the word is an answer, its inflections that follow aren't |
| `H` | neither the word nor its inflections |
| `Z` or backspace | undo the last decision, again and again, and the words come back |
| `↑` `↓` then a key | change an older decision without undoing the ones after it |
| `O` | look the word up on ordbokene.no |

A second `F` right after one is ignored for 0.6 s, so a double press can't approve the next word
by accident. Every decision is logged on the server (`word_reviews`), so the history survives a
reload, and a decision only applies if the word still has the status the picker saw, so two tabs
can't overwrite each other.

## Development

`npm start`, then open http://localhost:3000/?api=http://localhost:8999 to use a local
letekryss-generator (`ADMIN_TOKEN=dev bun run start`). Pushing to master deploys to GitHub Pages.
