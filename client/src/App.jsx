import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute } from "./components/routes";
import ChannelScreen from "./screens/ChannelScreen";
import CreateWorkspaceScreen from "./screens/CreateWorkspaceScreen";
import DirectMessageScreen from "./screens/DirectMessageScreen";
import HomeScreen from "./screens/HomeScreen";
import JoinWorkspaceScreen from "./screens/JoinWorkspaceScreen";
import LoginScreen from "./screens/LoginScreen";
import NotFoundScreen from "./screens/NotFoundScreen";
import RegisterScreen from "./screens/RegisterScreen";
import ResetPasswordScreen from "./screens/ResetPasswordScreen";
import RewritePasswordScreen from "./screens/RewritePasswordScreen";
import WorkspaceScreen from "./screens/WorkspaceScreen";
import WorkspaceWelcome from "./screens/WorkspaceWelcome";

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/home" replace />} />

    <Route element={<PublicOnlyRoute />}>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />
    </Route>
    <Route path="/reset-password" element={<ResetPasswordScreen />} />
    <Route path="/rewrite-password" element={<RewritePasswordScreen />} />

    <Route element={<ProtectedRoute />}>
      <Route path="/home" element={<HomeScreen />} />
      <Route path="/new-workspace" element={<CreateWorkspaceScreen />} />
      <Route path="/join/:token" element={<JoinWorkspaceScreen />} />
      <Route path="/workspace/:workspace_id" element={<WorkspaceScreen />}>
        <Route index element={<WorkspaceWelcome />} />
        <Route path="channel/:channel_id" element={<ChannelScreen />} />
        <Route path="dm/:user_id" element={<DirectMessageScreen />} />
      </Route>
    </Route>

    <Route path="*" element={<NotFoundScreen />} />
  </Routes>
);

export default AppRoutes;
