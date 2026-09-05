## Summary

Describe the user-visible or engineering outcome.

## Validation

- [ ] `pnpm check`
- [ ] `pnpm build`
- [ ] `pnpm release:audit`
- [ ] Rust `fmt`, `clippy`, `test`, and `check` with `--locked`
- [ ] Relevant Windows/Tauri behavior verified

## Safety

- [ ] Existing persistence and Tauri command compatibility are preserved
- [ ] No credentials, signing keys, generated output, or unrelated files are included
- [ ] Documentation and acceptance checkboxes reflect only verified results
