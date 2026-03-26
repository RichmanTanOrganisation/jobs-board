---
on:
  workflow_dispatch:
    inputs:
      feature_branch:
        description: "Exact name of your feature branch"
        required: true
        default: "main"
permissions:
  contents: read
safe-outputs:
  # We are removing add-comment entirely to avoid the "No Context" error
  noop:
    max: 1
tools:
  sh: {}
---

# Feature Changelog Generator

## Goal

Compare the `main` branch with `${{ github.event.inputs.feature_branch }}` and generate a summary.

## Instructions

1. **Prepare Git:** Use `sh: {}` to run `git fetch origin main ${{ github.event.inputs.feature_branch }}`.
2. **Generate Log:** Use `sh: {}` to run `git log origin/main..origin/${{ github.event.inputs.feature_branch }} --oneline`.
3. **Analyze:** Look at those specific commits. Ignore merge commits or "typo" fixes.
4. **Final Report:** Write a structured summary (✨ Features / 🐞 Fixes) directly into your final response. This will appear in the **GitHub Actions Step Summary** once the run is complete.
