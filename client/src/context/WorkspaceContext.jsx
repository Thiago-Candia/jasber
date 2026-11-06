import { createContext, useCallback, useContext, useMemo } from "react";
import { useResource } from "../hooks/useResource";
import { profileService, workspaceService } from "../services";

const WorkspaceContext = createContext(null);

const loadSessionData = async () => {
  const [workspaces, user] = await Promise.all([workspaceService.getAll(), profileService.get()]);

  return { workspaces, user };
};

export const WorkspaceProvider = ({ children }) => {
  const { status, data, error, reload, setData } = useResource(loadSessionData);

  const addWorkspace = useCallback(
    (workspace) =>
      setData((previous) => {
        if (!previous) return previous;
        const exists = previous.workspaces.some((item) => item.id === workspace.id);

        return {
          ...previous,
          workspaces: exists
            ? previous.workspaces.map((item) => (item.id === workspace.id ? workspace : item))
            : [...previous.workspaces, workspace]
        };
      }),
    [setData]
  );

  const updateUser = useCallback(
    (user) =>
      setData((previous) => {
        if (!previous) return previous;

        return {
          user,
          workspaces: previous.workspaces.map((workspace) => ({
            ...workspace,
            members: workspace.members.map((member) => (member.id === user.id ? user : member))
          }))
        };
      }),
    [setData]
  );

  const value = useMemo(
    () => ({
      status,
      error,
      user: data?.user ?? null,
      workspaces: data?.workspaces ?? [],
      reload,
      addWorkspace,
      updateUser
    }),
    [status, error, data, reload, addWorkspace, updateUser]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspaces = () => useContext(WorkspaceContext);
