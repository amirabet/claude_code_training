import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationDisplay } from "../ToolInvocationDisplay";
import { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: "call" | "partial-call" | "result" = "call"
): ToolInvocation {
  if (state === "result") {
    return { toolCallId: "1", toolName, args, state, result: "ok" } as ToolInvocation;
  }
  return { toolCallId: "1", toolName, args, state } as ToolInvocation;
}

// --- str_replace_editor commands ---

test("str_replace_editor / create: shows 'Creating' and file name", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" })}
    />
  );
  expect(screen.getByText("Creating")).toBeDefined();
  expect(screen.getByText("App.jsx")).toBeDefined();
});

test("str_replace_editor / str_replace: shows 'Editing' and file name", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={makeInvocation("str_replace_editor", { command: "str_replace", path: "/components/Button.tsx" })}
    />
  );
  expect(screen.getByText("Editing")).toBeDefined();
  expect(screen.getByText("Button.tsx")).toBeDefined();
});

test("str_replace_editor / view: shows 'Viewing' and file name", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={makeInvocation("str_replace_editor", { command: "view", path: "/utils/helpers.ts" })}
    />
  );
  expect(screen.getByText("Viewing")).toBeDefined();
  expect(screen.getByText("helpers.ts")).toBeDefined();
});

test("str_replace_editor / insert: shows 'Inserting into' and file name", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={makeInvocation("str_replace_editor", { command: "insert", path: "/App.jsx" })}
    />
  );
  expect(screen.getByText("Inserting into")).toBeDefined();
  expect(screen.getByText("App.jsx")).toBeDefined();
});

test("str_replace_editor / undo_edit: shows 'Undoing edit in' and file name", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={makeInvocation("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })}
    />
  );
  expect(screen.getByText("Undoing edit in")).toBeDefined();
  expect(screen.getByText("App.jsx")).toBeDefined();
});

// --- file_manager commands ---

test("file_manager / rename: shows 'Renaming', old and new file names", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={makeInvocation("file_manager", {
        command: "rename",
        path: "/components/OldName.tsx",
        new_path: "/components/NewName.tsx",
      })}
    />
  );
  expect(screen.getByText("Renaming")).toBeDefined();
  expect(screen.getByText(/OldName\.tsx/)).toBeDefined();
  expect(screen.getByText(/NewName\.tsx/)).toBeDefined();
});

test("file_manager / delete: shows 'Deleting' and file name", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={makeInvocation("file_manager", { command: "delete", path: "/components/Card.tsx" })}
    />
  );
  expect(screen.getByText("Deleting")).toBeDefined();
  expect(screen.getByText("Card.tsx")).toBeDefined();
});

// --- basename extraction ---

test("displays only the basename of a deeply nested path", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "view",
        path: "/src/components/ui/Button.tsx",
      })}
    />
  );
  expect(screen.getByText("Button.tsx")).toBeDefined();
  expect(screen.queryByText("/src/components/ui/Button.tsx")).toBeNull();
});

// --- status indicators ---

test("pending state shows spinner", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "call")}
    />
  );
  const svg = container.querySelector("svg");
  expect(svg).not.toBeNull();
  expect(svg?.classList.toString()).toContain("animate-spin");
});

test("result state shows green dot, no spinner", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "result")}
    />
  );
  const dot = container.querySelector(".bg-emerald-500");
  expect(dot).not.toBeNull();
  const spinner = container.querySelector(".animate-spin");
  expect(spinner).toBeNull();
});

// --- fallback ---

test("unknown tool renders without crashing and shows tool name", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={makeInvocation("some_unknown_tool", {})}
    />
  );
  expect(screen.getByText("Running some_unknown_tool")).toBeDefined();
});
