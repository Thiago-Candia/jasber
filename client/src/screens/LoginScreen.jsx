import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import FormError from "../components/FormError";
import TextField from "../components/TextField";
import { useAuth } from "../context/AuthContext";
import { useSubmit } from "../hooks/useSubmit";
import { authService } from "../services";
import { collectErrors, validateEmail, validateRequired } from "../utils/validation";

const LoginScreen = () => {
  const { login, sessionExpired } = useAuth()
  const [form, setForm] = useState({ email: "", password: "" })
  const [fieldErrors, setFieldErrors] = useState({})
  const { submit, pending, error } = useSubmit(authService.login)

  const handleChange = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault();

    const errors = collectErrors({
      email: validateEmail(form.email),
      password: validateRequired(form.password, "Ingresá tu contraseña.")
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return

    const result = await submit({ email: form.email.trim(), password: form.password })

    if (result.ok) login(result.data.token)
  }

  return (
    <AuthLayout
      title="Iniciar sesión"
      subtitle="Te sugerimos que uses el email que usás en el trabajo."
      footer={
        <p>
          ¿Todavía no tenés cuenta? <Link to="/register">Creá una</Link>
        </p>
      }
    >
      {sessionExpired && (
        <p className="notice" role="status">
          Tu sesión venció. Iniciá sesión de nuevo para continuar.
        </p>
      )}
      <form className="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="nombre@ejemplo.com"
          value={form.email}
          onChange={handleChange}
          error={fieldErrors.email}
          required
        />
        <TextField
          label="Contraseña"
          type="password"
          name="password"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          error={fieldErrors.password}
          required
        />
        <FormError error={error} />
        <button type="submit" className="button button--primary button--block" disabled={pending}>
          {pending ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>
      <p className="auth-card__link">
        <Link to="/reset-password">¿Olvidaste tu contraseña?</Link>
      </p>
    </AuthLayout>
  );
};

export default LoginScreen;
