/**
 * Utilitaires pour gérer l'abonnement et le désabonnement aux notifications Push PWA
 */

export const subscribeToPushNotifications = async (apiFetch) => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }

  try {
    const keyRes = await apiFetch("/api/push/key");
    const { publicKey } = await keyRes.json();
    if (!publicKey) return;

    const registration = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return;
    }

    const urlBase64ToUint8Array = (base64String) => {
      const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    };

    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    };

    const subscription =
      await registration.pushManager.subscribe(subscribeOptions);

    await apiFetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription }),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      "Erreur lors de l'abonnement aux notifications Push :",
      err,
    );
  }
};

export const unsubscribeFromPushNotifications = async (apiFetch) => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await apiFetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => {});

      await subscription.unsubscribe();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Erreur lors du désabonnement Push:", err);
  }
};
