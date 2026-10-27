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
| `↑` `↓` then a key | move back along the belt to an earlier word and change it, without undoing the ones after it |
| `O` | look the word up on ordbokene.no |

The words go by on a belt: the ones you've decided above with what they got, the next ones below,
and the forms of the word in focus that `G` and `H` decide along with it marked with ↳.

"bare ugjennomgåtte" shows only the words nobody has decided on in the picker. With "fasitord" that's
the answers approved before the picker existed, and `F` on one of those keeps it approved and marks it
reviewed.

A second `F` right after one is ignored for 0.6 s, so a double press can't approve the next word
by accident. Every decision is logged on the server (`word_reviews`), so the history survives a
reload, and a decision only applies if the word still has the status the picker saw, so two tabs
can't overwrite each other.

## Development

`npm start`, then open http://localhost:3000/?api=http://localhost:8999 to use a local
letekryss-generator (`ADMIN_TOKEN=dev bun run start`). Pushing to master deploys to GitHub Pages.
