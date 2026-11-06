import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import FormError from "../components/FormError";
import ImageField from "../components/ImageField";
import TextField from "../components/TextField";
import { useWorkspaces } from "../context/WorkspaceContext";
import { useSubmit } from "../hooks/useSubmit";
import { workspaceService } from "../services";
import { collectErrors, validateImage, validateRequired } from "../utils/validation";

const CreateWorkspaceScreen = () => {
  const navigate = useNavigate();
  const { addWorkspace } = useWorkspaces();
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const { submit, pending, error } = useSubmit(workspaceService.create);

  const handleSelectImage = (file) => {
    const imageError = validateImage(file);
    setFieldErrors((previous) => collectErrors({ ...previous, image: imageError }));
    if (!imageError) setImage(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const errors = collectErrors({ name: validateRequired(name, "Ingresá un nombre para el espacio de trabajo.") });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const formData = new FormData();
    formData.append("name", name.trim());
    if (image) formData.append("image", image);

    const result = await submit(formData);

    if (result.ok) {
      addWorkspace(result.data);
      navigate(`/workspace/${result.data.id}`, { replace: true });
    }
  };

  return (
    <div className="page">
      <AppHeader showCreate={false} />
      <main className="page__main page__main--narrow">
        <section className="panel" aria-labelledby="create-workspace-title">
          <h1 id="create-workspace-title" className="panel__title">
            Crear un espacio de trabajo
          </h1>
          <p className="panel__subtitle">
            Es el lugar donde tu equipo conversa. Se crea con un canal <strong>#general</strong>.
          </p>
          <form className="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Nombre del espacio de trabajo"
              name="name"
              placeholder="Por ejemplo: Equipo de Producto"
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={fieldErrors.name}
              required
            />
            <ImageField
              label="Imagen (opcional)"
              file={image}
              fallbackName={name || "Nuevo espacio"}
              shape="square"
              onSelect={handleSelectImage}
              onRemove={() => setImage(null)}
              error={fieldErrors.image}
            />
            <FormError error={error} />
            <div className="form__actions">
              <Link to="/home" className="button button--ghost">
                Cancelar
              </Link>
              <button type="submit" className="button button--primary" disabled={pending}>
                {pending ? "Creando..." : "Crear espacio de trabajo"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
};

export default CreateWorkspaceScreen;
