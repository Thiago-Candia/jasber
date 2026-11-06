import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWorkspaces } from "../context/WorkspaceContext";
import { useSubmit } from "../hooks/useSubmit";
import { profileService } from "../services";
import { collectErrors, validateImage, validateRequired } from "../utils/validation";
import FormError from "./FormError";
import ImageField from "./ImageField";
import Modal from "./Modal";
import TextField from "./TextField";

const ProfileModal = ({ onClose }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { user, updateUser } = useWorkspaces();
  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const { submit, pending, error } = useSubmit(profileService.update);

  const handleSelectAvatar = (file) => {
    const avatarError = validateImage(file);
    setFieldErrors((previous) => collectErrors({ ...previous, avatar: avatarError }));
    if (!avatarError) setAvatar(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaved(false);

    const errors = collectErrors({ name: validateRequired(name, "Ingresá tu nombre.") });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const formData = new FormData();
    formData.append("name", name.trim());
    if (avatar) formData.append("avatar", avatar);

    const result = await submit(formData);

    if (result.ok) {
      updateUser(result.data);
      setAvatar(null);
      setSaved(true);
    }
  };

  const handleLogout = () => {
    onClose();
    navigate("/login", { replace: true });
    logout();
  };

  return (
    <Modal title="Tu perfil" onClose={onClose}>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <p className="profile-email">
          <span className="muted">Email:</span> {user?.email}
        </p>
        <TextField
          label="Nombre"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={fieldErrors.name}
          required
        />
        <ImageField
          label="Foto de perfil"
          file={avatar}
          currentUrl={user?.avatar_url}
          fallbackName={name || user?.name}
          onSelect={handleSelectAvatar}
          onRemove={() => setAvatar(null)}
          error={fieldErrors.avatar}
        />
        <FormError error={error} />
        {saved && (
          <p className="form-success" role="status">
            Perfil actualizado.
          </p>
        )}
        <div className="form__actions">
          <button type="button" className="button button--ghost" onClick={handleLogout}>
            Cerrar sesión
          </button>
          <button type="submit" className="button button--primary" disabled={pending}>
            {pending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ProfileModal;
