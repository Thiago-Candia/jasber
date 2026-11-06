import { useState } from "react";
import { useWorkspaces } from "../context/WorkspaceContext";
import Avatar from "./Avatar";
import ProfileModal from "./ProfileModal";

const UserButton = () => {
  const { user } = useWorkspaces();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        className="user-button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Abrir perfil de ${user.name}`}
      >
        <Avatar name={user.name} src={user.avatar_url} size="sm" />
        <span className="user-button__name">{user.name}</span>
      </button>
      {isOpen && <ProfileModal onClose={() => setIsOpen(false)} />}
    </>
  );
};

export default UserButton;
