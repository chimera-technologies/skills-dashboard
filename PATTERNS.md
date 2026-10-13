# Coding patterns

The reusable patterns of this codebase. `sdlc:build-story` reads this file
before planning a story and follows it while building; the PR review checks
changes against it. Each story that creates something reusable adds it here
in the same PR. The generic catalogue these start from is the plugin's
`skills/build-story/reference/patterns.md`.

One entry per pattern: what to use, where it lives, and when.

## Project structure

<!-- Where each kind of code lives (feature folders, layers), and naming. -->

## Errors and validation

<!-- How input is validated at the edges and how errors are returned or shown. -->

## Data access and external calls

<!-- The one module that talks to storage, files or each external service. -->

## UI components

<!-- The UI library (ui_library in .sdlc/build.yaml), the theme or tokens,
     and the shared components built on it. -->

## State and configuration

<!-- Where state lives, how configuration and feature flags are read. -->

## Testing

<!-- Test helpers, fixtures and builders to reuse; how tests are named and laid out. -->
