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
  issues: read
safe-outputs:
  add-comment:
    max: 1
tools:
  sh: {}
---

# Feature Changelog Generator

## Goal

Compare the base branch with the branch provided in the input: ${{ github.event.inputs.feature_branch }}.

## Instructions

1. **Identify Branch:** The branch to analyze is: ${{ github.event.inputs.feature_branch }}.
2. **Setup Git:** Use `sh: {}` to run:
   - `git fetch origin main`
   - `git fetch origin ${{ github.event.inputs.feature_branch }}`
3. **Generate Log:** Use `sh: {}` to run `git log origin/main..origin/${{ github.event.inputs.feature_branch }} --oneline`.
4. **Summarize:** Based on those commits, write a brief changelog with ✨ Features and 🐞 Fixes.
5. **Post:** Use `add-comment` to post the result.
