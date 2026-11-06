import Brand from "./Brand";

const AuthLayout = ({ title, subtitle, children, footer }) => (
  <div className="auth-page">
    <header className="auth-page__header">
      <Brand to="/login" />
    </header>
    <main className="auth-page__main">
      <section className="auth-card" aria-labelledby="auth-title">
        <h1 id="auth-title" className="auth-card__title">
          {title}
        </h1>
        {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
        {children}
      </section>
      {footer && <div className="auth-page__footer">{footer}</div>}
    </main>
  </div>
);

export default AuthLayout;
