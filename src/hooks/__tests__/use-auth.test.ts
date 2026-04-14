import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../use-auth";

// --- Mocks ---

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

// Import mocked modules after vi.mock declarations
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

// Typed mock helpers
const mockSignIn = vi.mocked(signInAction);
const mockSignUp = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

// --- Test helpers ---

const anonWork = {
  messages: [{ id: "1", role: "user", content: "Hello" }],
  fileSystemData: { "/App.jsx": { type: "file", content: "export default () => <div/>" } },
};

const existingProject = { id: "proj-abc", name: "My Design", createdAt: new Date(), updatedAt: new Date() };
const createdProject = { id: "proj-new", name: "New Design #12345", createdAt: new Date(), updatedAt: new Date(), userId: "u1", messages: "[]", data: "{}" };

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no anon work, no existing projects, createProject returns a new project
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue(createdProject as any);
});

// -------------------------------------------------------------------
// Initial state
// -------------------------------------------------------------------
describe("initial state", () => {
  test("isLoading starts as false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn and signUp functions", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
  });
});

// -------------------------------------------------------------------
// signIn — happy paths
// -------------------------------------------------------------------
describe("signIn", () => {
  describe("with anonymous work (messages.length > 0)", () => {
    beforeEach(() => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
    });

    test("creates a project with the anon work data", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Design from /),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
    });

    test("clears anonymous work after creating the project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(mockClearAnonWork).toHaveBeenCalledOnce();
    });

    test("navigates to the newly created project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(mockPush).toHaveBeenCalledWith(`/${createdProject.id}`);
    });

    test("does not call getProjects when anon work exists", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(mockGetProjects).not.toHaveBeenCalled();
    });
  });

  describe("without anonymous work, with existing projects", () => {
    beforeEach(() => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([existingProject]);
    });

    test("navigates to the most recent project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(mockPush).toHaveBeenCalledWith(`/${existingProject.id}`);
    });

    test("does not create a new project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(mockCreateProject).not.toHaveBeenCalled();
    });
  });

  describe("without anonymous work and no existing projects", () => {
    beforeEach(() => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
    });

    test("creates a new empty project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #/),
        messages: [],
        data: {},
      });
    });

    test("navigates to the new project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(mockPush).toHaveBeenCalledWith(`/${createdProject.id}`);
    });
  });

  describe("isLoading state", () => {
    test("is true while signIn is in progress", async () => {
      let resolveSignIn!: (v: any) => void;
      mockSignIn.mockReturnValue(new Promise((r) => { resolveSignIn = r; }));

      const { result } = renderHook(() => useAuth());

      act(() => { result.current.signIn("user@test.com", "password123"); });
      expect(result.current.isLoading).toBe(true);

      await act(async () => { resolveSignIn({ success: false, error: "bad" }); });
      expect(result.current.isLoading).toBe(false);
    });

    test("resets to false after successful signIn", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useAuth());

      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("failure / error states", () => {
    test("returns the error result from the action", async () => {
      const errorResult = { success: false, error: "Invalid credentials" };
      mockSignIn.mockResolvedValue(errorResult);

      const { result } = renderHook(() => useAuth());
      let returnValue: any;
      await act(async () => { returnValue = await result.current.signIn("user@test.com", "wrong"); });

      expect(returnValue).toEqual(errorResult);
    });

    test("does not navigate on failure", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "wrong"));

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading even when the action rejects", async () => {
      mockSignIn.mockRejectedValue(new Error("Network failure"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        try { await result.current.signIn("user@test.com", "password123"); } catch { /* expected */ }
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("passes email and password to the signIn action", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "err" });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("alice@example.com", "s3cret!"));

      expect(mockSignIn).toHaveBeenCalledWith("alice@example.com", "s3cret!");
    });
  });
});

// -------------------------------------------------------------------
// signUp — happy paths
// -------------------------------------------------------------------
describe("signUp", () => {
  describe("with anonymous work (messages.length > 0)", () => {
    beforeEach(() => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
    });

    test("creates a project with the anon work data", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("new@test.com", "password123"));

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Design from /),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
    });

    test("clears anonymous work after creating the project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("new@test.com", "password123"));

      expect(mockClearAnonWork).toHaveBeenCalledOnce();
    });

    test("navigates to the newly created project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("new@test.com", "password123"));

      expect(mockPush).toHaveBeenCalledWith(`/${createdProject.id}`);
    });
  });

  describe("without anonymous work, with existing projects", () => {
    beforeEach(() => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([existingProject]);
    });

    test("navigates to the most recent project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("new@test.com", "password123"));

      expect(mockPush).toHaveBeenCalledWith(`/${existingProject.id}`);
    });

    test("does not create a new project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("new@test.com", "password123"));

      expect(mockCreateProject).not.toHaveBeenCalled();
    });
  });

  describe("without anonymous work and no existing projects", () => {
    beforeEach(() => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
    });

    test("creates a new empty project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("new@test.com", "password123"));

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #/),
        messages: [],
        data: {},
      });
    });

    test("navigates to the new project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("new@test.com", "password123"));

      expect(mockPush).toHaveBeenCalledWith(`/${createdProject.id}`);
    });
  });

  describe("isLoading state", () => {
    test("is true while signUp is in progress", async () => {
      let resolveSignUp!: (v: any) => void;
      mockSignUp.mockReturnValue(new Promise((r) => { resolveSignUp = r; }));

      const { result } = renderHook(() => useAuth());

      act(() => { result.current.signUp("new@test.com", "password123"); });
      expect(result.current.isLoading).toBe(true);

      await act(async () => { resolveSignUp({ success: false, error: "bad" }); });
      expect(result.current.isLoading).toBe(false);
    });

    test("resets to false after successful signUp", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useAuth());

      await act(() => result.current.signUp("new@test.com", "password123"));

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("failure / error states", () => {
    test("returns the error result from the action", async () => {
      const errorResult = { success: false, error: "Email already registered" };
      mockSignUp.mockResolvedValue(errorResult);

      const { result } = renderHook(() => useAuth());
      let returnValue: any;
      await act(async () => { returnValue = await result.current.signUp("taken@test.com", "password123"); });

      expect(returnValue).toEqual(errorResult);
    });

    test("does not navigate on failure", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("taken@test.com", "password123"));

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading even when the action rejects", async () => {
      mockSignUp.mockRejectedValue(new Error("Network failure"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        try { await result.current.signUp("new@test.com", "password123"); } catch { /* expected */ }
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("passes email and password to the signUp action", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "err" });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("bob@example.com", "mypassword"));

      expect(mockSignUp).toHaveBeenCalledWith("bob@example.com", "mypassword");
    });
  });
});

// -------------------------------------------------------------------
// Edge cases
// -------------------------------------------------------------------
describe("edge cases", () => {
  test("anon work with zero messages falls through to getProjects", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
    mockGetProjects.mockResolvedValue([existingProject]);

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("user@test.com", "password123"));

    // Empty messages means we skip the anon-work branch
    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(`/${existingProject.id}`);
  });

  test("navigates to first (most-recent) project when multiple exist", async () => {
    const older = { id: "proj-old", name: "Old Design", createdAt: new Date(), updatedAt: new Date() };
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([existingProject, older]);

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("user@test.com", "password123"));

    expect(mockPush).toHaveBeenCalledWith(`/${existingProject.id}`);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  test("new project name contains a random numeric suffix", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("user@test.com", "password123"));

    const [callArg] = mockCreateProject.mock.calls[0];
    expect(callArg.name).toMatch(/^New Design #\d+$/);
  });
});
