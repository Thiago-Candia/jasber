import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import FormError from "../components/FormError";
import TextField from "../components/TextField";
import { useSubmit } from "../hooks/useSubmit";
import { authService } from "../services";
import {
  MIN_PASSWORD_LENGTH,
  collectErrors,
  validateNewPassword,
  validatePasswordConfirmation
} from "../utils/validation";

const RewritePasswordScreen = () => {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("reset_token");
  const [form, setForm] = useState({ password: "", passwordConfirmation: "" })
  const [fieldErrors, setFieldErrors] = useState({})
  const [done, setDone] = useState(false)
  const { submit, pending, error } = useSubmit(authService.resetPassword)

  const handleChange = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()

    const errors = collectErrors({
      password: validateNewPassword(form.password),
      passwordConfirmation: validatePasswordConfirmation(form.password, form.passwordConfirmation)
    });
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const result = await submit(resetToken, form.password)
    if (result.ok) setDone(true)
  };

  const footer = (
    <p>
      <Link to="/login">Volver a iniciar sesión</Link>
    </p>
  );

  if (!resetToken) {
    return (
      <AuthLayout title="Enlace incompleto" footer={footer}>
        <div className="notice notice--error" role="alert">
          <p>El enlace no tiene el código de recuperación. Pedí uno nuevo.</p>
        </div>
        <Link to="/reset-password" className="button button--primary button--block">
          Pedir un enlace nuevo
        </Link>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Contraseña actualizada">
        <div className="notice notice--success" role="status">
          <p>Ya podés iniciar sesión con tu contraseña nueva.</p>
        </div>
        <Link to="/login" className="button button--primary button--block">
          Iniciar sesión
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Elegí una contraseña nueva" footer={footer}>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Contraseña nueva"
          type="password"
          name="password"
          autoComplete="new-password"
          hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
          value={form.password}
          onChange={handleChange}
          error={fieldErrors.password}
          required
        />
        <TextField
          label="Repetir contraseña"
          type="password"
          name="passwordConfirmation"
          autoComplete="new-password"
          value={form.passwordConfirmation}
          onChange={handleChange}
          error={fieldErrors.passwordConfirmation}
          required
        />
        <FormError error={error} />
        {error && (
          <p className="auth-card__link">
            <Link to="/reset-password">Pedir un enlace nuevo</Link>
          </p>
        )}
        <button type="submit" className="button button--primary button--block" disabled={pending}>
          {pending ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default RewritePasswordScreen;
