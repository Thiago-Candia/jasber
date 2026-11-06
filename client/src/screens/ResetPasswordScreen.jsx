import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import FormError from "../components/FormError";
import TextField from "../components/TextField";
import { useSubmit } from "../hooks/useSubmit";
import { authService } from "../services";
import { validateEmail } from "../utils/validation";

const ResetPasswordScreen = () => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(null);
  const [sentTo, setSentTo] = useState(null);
  const { submit, pending, error } = useSubmit(authService.requestPasswordReset);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateEmail(email);
    setEmailError(validationError);
    if (validationError) return;

    const result = await submit(email.trim());
    if (result.ok) setSentTo(email.trim());
  };

  return (
    <AuthLayout
      title="Restablecer la contraseña"
      subtitle="Te enviamos un enlace para que elijas una contraseña nueva."
      footer={
        <p>
          <Link to="/login">Volver a iniciar sesión</Link>
        </p>
      }
    >
      {sentTo ? (
        <div className="notice notice--success" role="status">
          <p>
            Si <strong>{sentTo}</strong> está registrado, te enviamos un enlace para restablecer la contraseña.
            Revisá tu bandeja de entrada (el enlace vence en 2 horas).
          </p>
        </div>
      ) : (
        <form className="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="nombre@ejemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={emailError}
            required
          />
          <FormError error={error} />
          <button type="submit" className="button button--primary button--block" disabled={pending}>
            {pending ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPasswordScreen;
