# Reading and maintaining the handoff

Open [PRODUCTION_HANDOFF.html](PRODUCTION_HANDOFF.html) in a browser for the offline snapshot. It includes search, status/priority filters, section navigation and print/PDF styling. Printing uses the current filters; reset them to print every tracked item.

`PRODUCTION_HANDOFF.md` is the source of truth. Update its evidence and status date when work is verified. Do not edit the generated HTML directly or treat a page refresh as new verification evidence.

From the repository root, start the live view:

```sh
python3 scripts/handoff.py --serve
```

Bookmark http://127.0.0.1:8765/docs/PRODUCTION_HANDOFF.html. While this command runs, the page checks for Markdown changes every five seconds and reloads automatically. Restart the command after restarting your computer. The server listens only on your computer's loopback interface. Use `--port 8766` if 8765 is occupied.

To regenerate only the standalone HTML:

```sh
python3 scripts/handoff.py
```

Whenever updating the production handoff, regenerate and include `docs/PRODUCTION_HANDOFF.html` in the same change. Preserve the original report's status date unless its evidence has actually been updated. Supporting document links remain relative to `docs/`, so keep the HTML in that directory. Styling and browser behavior live in `scripts/handoff-template.html`; the generator requires only Python 3's standard library.

## Required update for every task

For every implementation, fix or verification task, update the affected rows in `PRODUCTION_HANDOFF.md` before reporting completion. Record the actual status, concrete changes, tests run and remaining blockers or acceptance checks; link supporting evidence. Update the report summary/date when new evidence warrants it, without implying unrelated features were revalidated. Keep live-provider and signed-device acceptance separate from mocked tests and JavaScript exports. Regenerate `PRODUCTION_HANDOFF.html` with `python3 scripts/handoff.py` in the same task, including when work remains blocked.
