---
on:
  workflow_dispatch:
    inputs:
      feature_branch:
        description: "The name of your feature branch"
        required: true
        default: "feature-branch"
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

Summarize the differences between the `main` branch and the feature branch provided in the workflow input.

## Instructions

1. **Identify Target:** The feature branch name is provided in the workflow inputs as `feature_branch`.
2. **Fetch Context:** Use the `sh` tool to run the following commands:
   - `git fetch origin main`
   - `git fetch origin {{ inputs.feature_branch }}`
   - `git log origin/main..origin/{{ inputs.feature_branch }} --oneline`
3. **Analyze Changes:** Use `git diff origin/main..origin/{{ inputs.feature_branch }}` for code context.
4. **Summarize:** Write a clear, bulleted summary categorized by ✨ New Capabilities, 🔧 Under-the-hood Changes, and ⚠️ Potential Risks.
5. **Post Result:** Use `add-comment` to post this summary.
