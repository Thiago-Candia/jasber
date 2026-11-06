import { errorMessage } from "../utils/errors";

const FormError = ({ error }) => {
  if (!error) return null;

  const errors = Array.isArray(error.errors) ? error.errors : [];

  return (
    <div className="form-error" role="alert">
      {errors.length > 1 ? (
        <ul>
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : (
        <p>{typeof error === "string" ? error : errorMessage(error)}</p>
      )}
    </div>
  );
};

export default FormError;
