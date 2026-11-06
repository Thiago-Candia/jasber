import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import FormError from "../components/FormError";
import TextField from "../components/TextField";
import { useAuth } from "../context/AuthContext";
import { useSubmit } from "../hooks/useSubmit";
import { authService } from "../services";
import {
  MIN_PASSWORD_LENGTH,
  collectErrors,
  validateEmail,
  validateNewPassword,
  validatePasswordConfirmation,
  validateRequired
} from "../utils/validation";

const RegisterScreen = () => {
  const { login } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", passwordConfirmation: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const { submit, pending, error } = useSubmit(authService.register);

  const handleChange = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();

    const errors = collectErrors({
      name: validateRequired(form.name, "Ingresá tu nombre."),
      email: validateEmail(form.email),
      password: validateNewPassword(form.password),
      passwordConfirmation: validatePasswordConfirmation(form.password, form.passwordConfirmation)
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const result = await submit({ name: form.name.trim(), email: form.email.trim(), password: form.password });

    if (result.ok) login(result.data.token);
  };

  return (
    <AuthLayout
      title="Crear una cuenta"
      subtitle="Después vas a poder crear un espacio de trabajo o unirte a uno."
      footer={
        <p>
          ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
        </p>
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Nombre"
          name="name"
          autoComplete="name"
          value={form.name}
          onChange={handleChange}
          error={fieldErrors.name}
          required
        />
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
        <button type="submit" className="button button--primary button--block" disabled={pending}>
          {pending ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default RegisterScreen;
