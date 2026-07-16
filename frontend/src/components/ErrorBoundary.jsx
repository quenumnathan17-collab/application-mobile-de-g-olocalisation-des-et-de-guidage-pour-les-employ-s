import React from "react";

/**
 * React Error Boundary — catches rendering errors and displays
 * a user-friendly fallback instead of a blank screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            padding: "2rem",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            background: "#0b0f19",
            color: "#f8fafc",
          }}
        >
          <div
            style={{
              background: "#151c2c",
              padding: "3rem",
              borderRadius: "24px",
              textAlign: "center",
              maxWidth: "480px",
              border: "1px solid #2e3b4e",
            }}
          >
            <div
              style={{
                fontSize: "4rem",
                marginBottom: "1rem",
              }}
            >
              ⚠️
            </div>
            <h2
              style={{
                margin: "0 0 0.75rem 0",
                fontSize: "1.5rem",
                fontWeight: 700,
              }}
            >
              Une erreur est survenue
            </h2>
            <p
              style={{
                color: "#94a3b8",
                margin: "0 0 1.5rem 0",
                fontSize: "0.95rem",
                lineHeight: 1.6,
              }}
            >
              L&apos;application a rencontré un problème inattendu. Veuillez
              recharger la page.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: "linear-gradient(135deg, #4f46e5, #0ea5e9)",
                color: "#fff",
                border: "none",
                padding: "0.75rem 2rem",
                borderRadius: "12px",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
