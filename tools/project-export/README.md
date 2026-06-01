# Project Export Tool

This folder contains a maintainer-only utility for exporting GitHub Project data. It is not part of the timer app's runtime, validation, deployment, or implementation.

## What It Does

`export-project.sh` downloads the items from a GitHub Project into a local JSON file using the GitHub CLI.

Current defaults:

- owner: `tobias-zucali`
- project number: `2`
- output file: `project.json`

## When To Use It

Use this tool when you want a local snapshot of the GitHub Project for maintainer workflows such as review, archival, or external analysis.

## Requirements

- `gh` must be installed
- `gh auth login` must already be completed

## Usage

```bash
cd tools/project-export
./export-project.sh
```

The script writes `project.json` into this directory.

## Repo Boundary

This tool stays in the repo as adjacent maintainer tooling only. If it grows beyond a small one-off utility, move it into a separate tooling repo instead of treating it as application code.
