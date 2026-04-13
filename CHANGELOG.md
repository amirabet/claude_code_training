# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-04-13

### Added

- `ToolInvocationDisplay` component (`src/components/chat/ToolInvocationDisplay.tsx`) that replaces the raw tool-name pill in the chat UI with a human-readable description: action label (e.g. "Creating", "Editing", "Renaming"), matching icon, and the affected file's basename.
- For `rename` operations the pill shows `OldFile.tsx → NewFile.tsx`.
- 11 unit tests covering all tool commands, basename extraction, pending/result status states, and the unknown-tool fallback.

## [0.1.0] - 2026-04-13

### Added

- Initial release: AI-powered React component generator with live preview, virtual file system, chat interface, Monaco editor, and SQLite-backed project persistence.
