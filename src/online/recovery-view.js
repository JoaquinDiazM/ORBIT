export function showRetainedProgress(context, recoveries, { documentRef = document, urlApi = URL } = {}) {
  if (!recoveries.length) return;
  const panel = documentRef.createElement("details");
  panel.className = "online-recovery";
  const summary = documentRef.createElement("summary");
  summary.textContent = "Copias anteriores conservadas";
  const message = documentRef.createElement("p");
  message.textContent = "El servidor cambió la generación de tu cuenta o restauró un respaldo. Estos avances anteriores no se mezclan con el actual. Puedes exportarlos y pedir al docente que los revise.";
  panel.append(summary, message);
  for (const recovery of recoveries) {
    const button = documentRef.createElement("button");
    button.type = "button";
    button.textContent = `Exportar copia anterior (${recovery.progress.completedLocations?.length ?? 0} finalizaciones)`;
    button.addEventListener("click", () => {
      const data = {
        kind: "orbit-retained-progress",
        serverId: context.session.serverId,
        userId: context.session.user.id,
        courseId: context.course.id,
        generation: recovery.generation,
        revision: recovery.revision,
        completedLocations: recovery.progress.completedLocations ?? [],
      };
      const url = urlApi.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = documentRef.createElement("a");
      link.href = url;
      link.download = "orbit-avance-anterior.json";
      link.click();
      urlApi.revokeObjectURL(url);
    });
    panel.append(button);
  }
  (documentRef.querySelector("#orbit-online-session") ?? documentRef.body).append(panel);
}
