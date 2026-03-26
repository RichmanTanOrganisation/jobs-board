---
on:
  issues:
    types: [opened]
permissions:
  contents: read
  issues: read
safe-outputs:
  add-comment:
    max: 1
  add-labels:
    max: 3
---

# Issue Triage & Routing Assistant

## Goal

Analyze newly opened issues to provide immediate value to maintainers by categorizing work and identifying the right owner.

## Instructions

1. **Analyze the Issue:** Read the new issue #${{ github.event.issue.number }}.
2. **Scan Codebase:** Search the repository to identify which files or modules are most relevant to this issue.
3. **Categorize:** - Use `add-labels` to apply a `bug`, `feature`, or `question` label.
   - Use `add-labels` to apply a priority label (`high`, `medium`, `low`).
4. **Suggest an Owner:**
   - Look at the git history of the relevant files.
   - Suggest 1-2 team members who have contributed to those files.
5. **Comment:** Use `add-comment` to post a single summary of your findings.
