# Todo app

A Canvas task list with native input and keyboard controls. Add a task with Enter
or **Add task**, use its checkbox to complete it, and choose **Edit** to rename it.
In the editor, Enter saves and Escape cancels. Empty titles are rejected.

Use **All**, **Active**, and **Done** to filter the list. The checkbox above the
list completes or reopens every task; **Clear completed** removes completed tasks.
The task-list region supports arrow keys, Page Up/Down, Home, and End for scrolling.

Tasks are stored under `piant-todos` in the current browser's local storage when
available. Existing saved tasks are retained. There is no account or cross-device
sync; private browsing or storage restrictions can prevent persistence.

```sh
pnpm --filter @piant/examples-todos dev
pnpm --filter @piant/examples-todos build
pnpm --filter @piant/examples-todos exec tsc --noEmit
pnpm --filter @piant/examples-todos exec vitest run
```

`embedded.html` remains a separate two-Canvas sizing and lifecycle example.

For browser regression, build first and serve `dist` on port 4260:

```sh
python3 -m http.server 4260 --bind 127.0.0.1 --directory examples/todos/dist
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node examples/todos/browser-tests/verify.mjs
```

`TODO_URL` overrides the URL and `TODO_EVIDENCE_DIR` overrides the screenshot and
JSON output directory (default `/tmp/piant-todos`). Chrome must be available.
The composition routing check is synthetic and does not certify a system IME or
VoiceOver.
