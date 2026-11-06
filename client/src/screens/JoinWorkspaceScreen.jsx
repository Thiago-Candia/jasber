import { useCallback, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { ErrorState, LoadingState } from "../components/StatusView";
import { useWorkspaces } from "../context/WorkspaceContext";
import { useSubmit } from "../hooks/useSubmit";
import { workspaceService } from "../services";
import { errorMessage } from "../utils/errors";

const describeJoinError = (error) =>

  error?.status === 404 ? "El link de invitación no es válido o ya no existe." : errorMessage(error)

const JoinWorkspaceScreen = () => {
  const { token } = useParams()
  const navigate = useNavigate()
  const { addWorkspace } = useWorkspaces()
  const { submit, error } = useSubmit(workspaceService.join)
  const startedFor = useRef(null)

  const join = useCallback(async () => {
    const result = await submit(token)

    if (result.ok) {
      addWorkspace(result.data)
      navigate(`/workspace/${result.data.id}`, { replace: true })
    }
  }, [submit, token, addWorkspace, navigate])

  useEffect(() => {
    if (startedFor.current === token) return
    startedFor.current = token
    join();
  }, [token, join])

  return (
    <div className="page">
      <AppHeader showCreate={false} />
      <main className="page__main page__main--narrow">
        <section className="panel" aria-labelledby="join-title" aria-live="polite">
          {error ? (
            <>
              <h1 id="join-title" className="panel__title">
                No pudimos unirte al espacio de trabajo
              </h1>
              <ErrorState message={describeJoinError(error)} onRetry={join} />
              <Link to="/home" className="button button--ghost">
                Volver a mis espacios
              </Link>
            </>
          ) : (
            <>
              <h1 id="join-title" className="panel__title">
                Uniéndote al espacio de trabajo
              </h1>
              <LoadingState>Validando la invitación...</LoadingState>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default JoinWorkspaceScreen;
