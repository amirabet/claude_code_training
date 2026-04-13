import { ToolInvocation } from "ai";
import {
  Loader2,
  FilePlus,
  Pencil,
  Eye,
  FileEdit,
  Undo2,
  FileSymlink,
  Trash2,
  Terminal,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionMeta {
  label: string;
  Icon: LucideIcon;
}

const STR_REPLACE_ACTIONS: Record<string, ActionMeta> = {
  create:      { label: "Creating",         Icon: FilePlus },
  str_replace: { label: "Editing",          Icon: Pencil },
  view:        { label: "Viewing",          Icon: Eye },
  insert:      { label: "Inserting into",   Icon: FileEdit },
  undo_edit:   { label: "Undoing edit in",  Icon: Undo2 },
};

const FILE_MANAGER_ACTIONS: Record<string, ActionMeta> = {
  rename: { label: "Renaming", Icon: FileSymlink },
  delete: { label: "Deleting", Icon: Trash2 },
};

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

function resolve(toolName: string, args: Record<string, unknown>): ActionMeta {
  const command = args.command as string | undefined;
  if (toolName === "str_replace_editor" && command && STR_REPLACE_ACTIONS[command]) {
    return STR_REPLACE_ACTIONS[command];
  }
  if (toolName === "file_manager" && command && FILE_MANAGER_ACTIONS[command]) {
    return FILE_MANAGER_ACTIONS[command];
  }
  return { label: `Running ${toolName}`, Icon: Terminal };
}

interface ToolInvocationDisplayProps {
  toolInvocation: ToolInvocation;
}

export function ToolInvocationDisplay({ toolInvocation }: ToolInvocationDisplayProps) {
  const { toolName, state, args } = toolInvocation;
  const typedArgs = args as Record<string, unknown>;
  const { label, Icon } = resolve(toolName, typedArgs);

  const path = typedArgs.path as string | undefined;
  const newPath = typedArgs.new_path as string | undefined;
  const isDone = state === "result";
  const isRename =
    toolName === "file_manager" && typedArgs.command === "rename" && newPath;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 mt-2 px-3 py-1.5",
        "bg-neutral-50 rounded-lg text-xs border border-neutral-200 font-mono"
      )}
    >
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600 flex-shrink-0" />
      )}

      <Icon className="w-3 h-3 text-neutral-500 flex-shrink-0" />

      <span className="text-neutral-600">{label}</span>

      {path && isRename ? (
        <span className="text-neutral-800">
          {basename(path)}
          <span className="text-neutral-400 mx-1">→</span>
          {basename(newPath as string)}
        </span>
      ) : path ? (
        <span className="text-neutral-800">{basename(path)}</span>
      ) : null}
    </div>
  );
}
