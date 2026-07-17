/**
 * Handlers d'API déportés pour YA CONSULTING.
 * Permet de réduire la taille et la complexité de App.jsx.
 */

export const addClient = async (apiFetch, clientData, setClients) => {
  const res = await apiFetch("/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clientData),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erreur lors du géocodage du client.");
  }

  const savedClient = await res.json();
  setClients((prev) => [...prev, savedClient]);
  return savedClient;
};

export const updateClient = async (apiFetch, updatedClient, setClients) => {
  try {
    const res = await apiFetch(`/api/clients/${updatedClient.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedClient),
    });
    const saved = await res.json();
    setClients((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Erreur lors de la mise à jour du client :", err);
  }
};

export const addOperation = async (apiFetch, newOp, setOperations, clients, triggerNotification) => {
  try {
    const res = await apiFetch("/api/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOp),
    });

    const savedOp = await res.json();
    setOperations((prev) => [...prev, savedOp]);

    // Notification automatique de l'employé assigné
    if (savedOp.employeeId) {
      const clientName =
        clients.find((c) => c.id === savedOp.clientId)?.name || "Client";
      triggerNotification({
        title: "Nouvelle mission assignée",
        body: `Nouvelle intervention planifiée chez ${clientName}.`,
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Erreur lors de la création de l'opération :", err);
  }
};

export const addEmployee = async (apiFetch, empData, setEmployees) => {
  const res = await apiFetch("/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(empData),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erreur lors de la création de l'employé.");
  }

  const savedEmp = await res.json();
  setEmployees((prev) => [...prev, savedEmp]);
  return savedEmp;
};

export const updateEmployee = async (apiFetch, empData, setEmployees) => {
  try {
    const res = await apiFetch(`/api/employees/${empData.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(empData),
    });
    const saved = await res.json();
    setEmployees((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Erreur lors de la mise à jour de l'employé :", err);
  }
};

export const deleteEmployee = async (apiFetch, empId, setEmployees) => {
  try {
    await apiFetch(`/api/employees/${empId}`, {
      method: "DELETE",
    });
    setEmployees((prev) => prev.filter((e) => e.id !== empId));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Erreur lors de la suppression de l'employé :", err);
  }
};

export const updateOperationStatus = async (apiFetch, opId, status, setOperations) => {
  try {
    const res = await apiFetch(`/api/operations/${opId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const saved = await res.json();
    setOperations((prev) => prev.map((o) => (o.id === opId ? saved : o)));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      "Erreur lors de la mise à jour du statut d'intervention :",
      err,
    );
  }
};

export const updateEmployeeGps = async (apiFetch, empId, gps, setEmployees) => {
  // Mise à jour optimiste sur le front
  setEmployees((prev) =>
    prev.map((e) => (e.id === empId ? { ...e, gps } : e)),
  );

  try {
    await apiFetch(`/api/employees/${empId}/gps`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gps),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Erreur lors de la mise à jour de la position GPS :", err);
  }
};
