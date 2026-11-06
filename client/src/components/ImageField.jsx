import { useId, useRef } from "react";
import { useObjectUrl } from "../hooks/useObjectUrl";
import Avatar from "./Avatar";

const ImageField = ({ label, file, currentUrl, fallbackName, onSelect, onRemove, error, shape = "round" }) => {
  const id = useId();
  const inputRef = useRef(null);
  const previewUrl = useObjectUrl(file);
  const errorId = error ? `${id}-error` : undefined;

  const handleChange = (event) => {
    const selected = event.target.files?.[0];
    if (selected) onSelect(selected);
    event.target.value = "";
  };

  return (
    <div className="field image-field">
      <span className="field__label" id={`${id}-label`}>
        {label}
      </span>
      <div className="image-field__row">
        <Avatar name={fallbackName} src={previewUrl || currentUrl} size="lg" shape={shape} />
        <div className="image-field__actions">
          <input
            ref={inputRef}
            id={id}
            className="visually-hidden"
            type="file"
            accept="image/*"
            onChange={handleChange}
            aria-labelledby={`${id}-label`}
            aria-describedby={errorId}
          />
          <button type="button" className="button button--secondary button--small" onClick={() => inputRef.current?.click()}>
            {file || currentUrl ? "Cambiar imagen" : "Elegir imagen"}
          </button>
          {file && (
            <button type="button" className="button button--ghost button--small" onClick={onRemove}>
              Quitar
            </button>
          )}
          <p className="field__hint">PNG, JPG o GIF de hasta 5 MB.</p>
        </div>
      </div>
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
};

export default ImageField;
