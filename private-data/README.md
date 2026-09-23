# Private purchased data

GitHub Pages is **static**. Anything you commit and push is downloadable, even behind the password screen.

- Do **not** commit purchased Professor Messer PDFs, JSON, or explanations
- If you later build `messer-questions.json`, keep it gitignored
- Use `private-data/examples/messer-questions.json` for the expected shape only
- `type: "multiple-select"` uses `correctAnswers` (or `correct_answers`) as 0-based index arrays. Ordering PBQs score per position.
- Until a real local file exists, the app uses in-repo **fake placeholders**

The password gate is not secure storage.
