# Local purchased working copies

GitHub Pages is **static**. Anything you commit and push is downloadable, even behind the password screen.

- Keep purchased PDFs and scratch copies in this folder (gitignored)
- The deployed Messer bank is `data/messer-questions.json`
- Use `private-data/examples/messer-questions.json` for the expected shape only
- `type: "multiple-select"` uses `correctAnswers` (or `correct_answers`) as 0-based index arrays. Ordering PBQs score per position.

The password gate is not secure storage.
