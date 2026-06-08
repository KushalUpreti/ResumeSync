import { Link } from "react-router-dom";
import type { AuthState, AuthView } from "../context/authTypes";

type AppHeaderProps = {
  auth: AuthState;
  onOpenAuthModal: (view: AuthView) => void;
  onSignOut: () => void;
};

function AppHeader({ auth, onOpenAuthModal, onSignOut }: AppHeaderProps) {
  const isLoggedIn = auth.status === "authenticated";
  const userName = isLoggedIn ? auth.user.name || auth.user.email : null;

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand-mark" to="/">
          ResumeSync AI
        </Link>
        <div className="site-header__actions">
          <Link className="site-header__nav-link" to="/architecture">
            Architecture
          </Link>
          {auth.status === "loading" ? (
            <span className="status-badge">Loading session...</span>
          ) : auth.status === "error" ? (
            <span className="status-badge">Auth config issue</span>
          ) : isLoggedIn ? (
            <>
              <Link
                className="button button--ghost site-header__profile"
                to="/profile"
              >
                {userName}
              </Link>
              <button
                className="button button--ghost site-header__signout"
                onClick={onSignOut}
                type="button"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                className="button button--ghost site-header__login"
                onClick={() => onOpenAuthModal("signIn")}
                type="button"
              >
                Login
              </button>
              <Link
                className="button button--primary site-header__primary"
                to="/process"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
