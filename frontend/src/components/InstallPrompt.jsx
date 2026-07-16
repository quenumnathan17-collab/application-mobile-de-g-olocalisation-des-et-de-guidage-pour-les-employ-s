/**
 * InstallPrompt — Bandeau d'invitation à installer l'app sur l'appareil
 * Apparaît automatiquement selon les règles du navigateur (Android/Chrome)
 * Sur iOS, affiche un guide manuel "Partager → Ajouter à l'écran d'accueil"
 */
import { useState, useEffect } from "react";
import { Download, X, Smartphone, Share } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Déjà installée ? (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Détection iOS (Safari ne supporte pas beforeinstallprompt)
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // Sur iOS : afficher le guide seulement si pas encore vu
    if (ios) {
      const dismissed = localStorage.getItem("pwa_ios_dismissed");
      if (!dismissed) {
        // délai pour ne pas bloquer au démarrage
        setTimeout(() => setShowBanner(true), 3000);
      }
      return;
    }

    // Android / Chrome / Edge — écouter l'événement natif
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem("pwa_install_dismissed");
      if (!dismissed) setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setShowBanner(false);
      setIsInstalled(true);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(
      isIOS ? "pwa_ios_dismissed" : "pwa_install_dismissed",
      "1",
    );
  };

  if (!showBanner || isInstalled) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(420px, calc(100vw - 2rem))",
        background: "linear-gradient(135deg, #1a2244 0%, #2d3a6d 100%)",
        borderRadius: "20px",
        padding: "1rem 1.25rem",
        boxShadow:
          "0 20px 60px rgba(0,0,0,0.4), " +
          "0 0 0 1px rgba(105,180,245,0.15) inset",
        display: "flex",
        alignItems: "flex-start",
        gap: "0.875rem",
        zIndex: 9999,
        animation: "slideUpIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        color: "white",
      }}
    >
      <style>{`
        @keyframes slideUpIn {
          from { transform: translateX(-50%) translateY(100%); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* Icône */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "12px",
          flexShrink: 0,
          background: "rgba(105,180,245,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(105,180,245,0.25)",
        }}
      >
        <Smartphone size={22} color="#69b4f5" />
      </div>

      {/* Texte */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: "0.9rem",
            marginBottom: "0.2rem",
          }}
        >
          Installer YA Nav
        </div>
        {isIOS ? (
          <div
            style={{
              fontSize: "0.78rem",
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.5,
            }}
          >
            Appuyez sur{" "}
            <strong style={{ color: "#69b4f5" }}>
              <Share
                size={11}
                style={{ display: "inline", verticalAlign: "middle" }}
              />{" "}
              Partager
            </strong>{" "}
            puis{" "}
            <strong style={{ color: "#69b4f5" }}>
              « Ajouter à l'écran d'accueil »
            </strong>
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: "0.78rem",
                color: "rgba(255,255,255,0.75)",
                marginBottom: "0.625rem",
              }}
            >
              Installez l'app sur votre appareil pour un accès rapide, même hors
              ligne.
            </div>
            <button
              type="button"
              onClick={handleInstall}
              style={{
                background: "linear-gradient(135deg, #3b5edb, #69b4f5)",
                border: "none",
                borderRadius: "10px",
                color: "white",
                fontWeight: 700,
                fontSize: "0.8rem",
                padding: "0.45rem 1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                transition: "transform 0.15s, box-shadow 0.15s",
                boxShadow: "0 4px 12px rgba(59,94,219,0.4)",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 6px 16px rgba(59,94,219,0.5)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "";
                e.target.style.boxShadow = "0 4px 12px rgba(59,94,219,0.4)";
              }}
            >
              <Download size={14} /> Installer maintenant
            </button>
          </>
        )}
      </div>

      {/* Bouton fermer */}
      <button
        type="button"
        onClick={handleDismiss}
        style={{
          background: "rgba(255,255,255,0.1)",
          border: "none",
          borderRadius: "50%",
          width: 28,
          height: 28,
          cursor: "pointer",
          color: "rgba(255,255,255,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) =>
          (e.target.style.background = "rgba(255,255,255,0.2)")
        }
        onMouseLeave={(e) =>
          (e.target.style.background = "rgba(255,255,255,0.1)")
        }
        title="Fermer"
      >
        <X size={14} />
      </button>
    </div>
  );
}
