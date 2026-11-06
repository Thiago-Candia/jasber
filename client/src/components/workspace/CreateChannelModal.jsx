import { useState } from "react";
import { useSubmit } from "../../hooks/useSubmit";
import { channelService } from "../../services";
import FormError from "../FormError";
import Modal from "../Modal";
import TextField from "../TextField";

const normalizeChannelName = (value) => value.trim().toLowerCase().replace(/^#+/, "").replace(/\s+/g, "-");

const CreateChannelModal = ({ workspaceId, onCreated, onClose }) => {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState(null);
  const { submit, pending, error } = useSubmit(channelService.create);
  const normalized = normalizeChannelName(name);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = normalized ? null : "Ingresá un nombre para el canal.";
    setNameError(validationError);
    if (validationError) return;

    const result = await submit(workspaceId, normalized);
    if (result.ok) onCreated(result.data);
  };

  return (
    <Modal title="Crear un canal" onClose={onClose}>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Nombre del canal"
          name="name"
          placeholder="por ejemplo: proyecto-final"
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          hint={normalized ? `Se va a crear como #${normalized}` : "Los canales son donde tu equipo conversa sobre un tema."}
          error={nameError}
          required
        />
        <FormError error={error} />
        <div className="form__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="button button--primary" disabled={pending}>
            {pending ? "Creando..." : "Crear canal"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateChannelModal;
