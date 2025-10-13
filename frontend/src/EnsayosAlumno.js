import React, { useEffect, useState } from "react";
import "./EnsayosAlumno.css";

// ===== Config =====
const BACKEND_URL = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const DURATION_MIN = 10; // duración del ensayo en minutos

// Construye URL absoluta para imágenes servidas por el backend
const buildImageSrc = (image_url) => {
  if (!image_url) return null;
  if (/^https?:\/\//i.test(image_url)) return image_url;
  const path = image_url.startsWith("/") ? image_url : `/${image_url}`;
  return `${BACKEND_URL}${path}`;
};

export default function EnsayosAlumno({ user, volver }) {
  // ===== Estado: Asignaciones =====
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ===== Estado: Ensayo en curso =====
  const [currentSA, setCurrentSA] = useState(null); // objeto de la asignación actual
  const [preguntas, setPreguntas] = useState([]);
  const [preguntaActual, setPreguntaActual] = useState(0);
  const [respuestas, setRespuestas] = useState({}); // { [question_id]: alternativa }
  const [timeLeft, setTimeLeft] = useState(0); // segundos
  const [timerActive, setTimerActive] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ===== Estado: Resultado =====
  const [resultado, setResultado] = useState(null); // {title, subject, correct, total, score, completedAt}

  // ===== Helpers =====
  const fetchJSON = async (url, options = {}) => {
    const r = await fetch(url, options);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
    return data;
  };

  // ===== Cargar asignaciones =====
  useEffect(() => {
    const load = async () => {
      if (!user?.email) return;
      setLoadingAssignments(true);
      setErrorMsg("");
      try {
        const data = await fetchJSON(
          `${BACKEND_URL}/api/student-assignments/${encodeURIComponent(user.email)}`
        );
        setAssignments(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setErrorMsg("No se pudieron cargar las asignaciones.");
        setAssignments([]);
      } finally {
        setLoadingAssignments(false);
      }
    };
    load();
  }, [user]);

  // ===== Temporizador =====
  useEffect(() => {
    if (!timerActive) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          setTimerActive(false);
          // Auto-envío al acabar el tiempo
          if (!enviado) enviarEnsayo(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerActive, enviado]);

  // ===== Protección: salir/cerrar pestaña → cancelar intento (NO reanudar) =====
  useEffect(() => {
    const cancelInBackground = () => {
      try {
        const id = currentSA?.student_assignment_id;
        if (!id) return;
        const url = `${BACKEND_URL}/api/student-assignments/${id}/cancel`;
        if (navigator.sendBeacon) {
          const blob = new Blob([], { type: "text/plain" });
          navigator.sendBeacon(url, blob);
        }
      } catch {}
    };

    const beforeUnload = (e) => {
      // No cancelar si estamos enviando o ya enviado
      if (submitting || enviado) return;
      if (preguntas.length > 0 && timerActive) {
        cancelInBackground();
        e.preventDefault();
        e.returnValue = ""; // prompt nativo
        return "";
      }
    };

    const onPageHide = () => {
      if (submitting || enviado) return;
      if (preguntas.length > 0 && timerActive) cancelInBackground();
    };

    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [preguntas.length, timerActive, enviado, submitting, currentSA]);

  // ===== Acciones =====
  const startAssignment = async (a) => {
    try {
      if (a.status === "completed") {
        alert("Esta asignación ya fue completada y no se puede volver a realizar.");
        return;
      }
      // Siempre comenzar desde cero (backend limpia selección previa)
      const data = await fetchJSON(
        `${BACKEND_URL}/api/student-assignments/${a.student_assignment_id}/start`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );

      setCurrentSA(a);
      setPreguntas(Array.isArray(data.questions) ? data.questions : []);
      setPreguntaActual(0);
      setRespuestas({});
      setResultado(null);
      setEnviado(false);
      setTimeLeft(DURATION_MIN * 60);
      setTimerActive(true);
    } catch (e) {
      console.error(e);
      alert(e.message || "Error al iniciar la asignación");
    }
  };

  const enviarEnsayo = async (auto = false) => {
    if (submitting || enviado) return;
    if (!currentSA) return; // sanity check
    setSubmitting(true);

    // Cálculo local para feedback inmediato (no limpiamos aún)
    const total = Math.max(1, preguntas.length);
    const correct = preguntas.reduce(
      (acc, p) => acc + (respuestas[p.id] === p.correct_answer ? 1 : 0),
      0
    );
    const score = Math.round((correct / total) * 100);

    // Mostrar panel de resultado y bloquear cancel
    setEnviado(true);
    setTimerActive(false);
    setResultado({
      title: currentSA?.title || "Asignación",
      subject: currentSA?.subject || "",
      correct,
      total,
      score,
      completedAt: new Date().toISOString(),
    });

    try {
      // Enviamos TODAS las preguntas. Si no respondió, mandamos "" (string vacío) para que BD TEXT NOT NULL no falle
      const answers = preguntas.map((p) => ({
        question_id: p.id,
        chosen_answer: (respuestas[p.id] ?? ""),
      }));

      const out = await fetchJSON(
        `${BACKEND_URL}/api/student-assignments/${currentSA.student_assignment_id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        }
      );

      // Sincroniza con datos oficiales si vienen
      if (typeof out?.correct === "number" && typeof out?.total === "number") {
        setResultado((prev) => ({
          ...prev,
          correct: out.correct,
          total: out.total,
          score: typeof out?.score === "number" ? out.score : prev.score,
        }));
      }

      // Refrescar lista (debe quedar en completed)
      try {
        const list = await fetchJSON(
          `${BACKEND_URL}/api/student-assignments/${encodeURIComponent(user.email)}`
        );
        setAssignments(Array.isArray(list) ? list : []);
      } catch {}

      // Limpiar UI de preguntas (evita reintento visual)
      setCurrentSA(null);
      setPreguntas([]);
      setRespuestas({});
    } catch (e) {
      console.error(e);
      // Permitir reintentar: revertimos "enviado"
      setEnviado(false);
      alert(e.message || "Error enviando la asignación");
    } finally {
      setSubmitting(false);
    }
  };

  // Botón Volver → ACEPTAR = continuar; CANCELAR = enviar y salir
  const handleVolverClick = async () => {
    if (preguntas.length > 0 && timerActive && !enviado) {
      const seguir = window.confirm(
        "Tienes un ensayo en curso con posibles preguntas sin responder. ACEPTAR = continuar. CANCELAR = enviar lo respondido y salir."
      );
      if (seguir) return; // se queda
      await enviarEnsayo(false);
      return volver();
    }
    volver();
  };

  // ===== Render =====
  return (
    <div className="ensayos-container">
      <div className="ensayos-header">
        <h2 className="ensayos-titulo">Mis Ensayos</h2>
      </div>

      {/* === Vista de Asignaciones (cuando no hay preguntas cargadas) === */}
      {preguntas.length === 0 && (
        <div className="ensayos-configuracion">
          <h3 className="ensayos-subtitulo">Asignaciones</h3>
          {errorMsg && <div className="ensayos-error">{errorMsg}</div>}
          {loadingAssignments ? (
            <div className="ensayos-mensaje">Cargando asignaciones…</div>
          ) : assignments.length === 0 ? (
            <div className="ensayos-mensaje">No tienes asignaciones por ahora.</div>
          ) : (
            <div className="preguntas-lista" style={{ gap: "1rem" }}>
              {assignments.map((a) => (
                <div key={a.student_assignment_id} className="pregunta-ensayo" style={{ position: "relative" }}>
                  <div className="pregunta-header">
                    <span className="pregunta-numero" style={{ textTransform: "capitalize" }}>
                      {a.subject}
                    </span>
                    <h4 className="pregunta-texto" style={{ marginTop: ".25rem" }}>{a.title}</h4>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ color: "#555" }}>
                      {a.description || "Sin descripción"} · <strong>{a.num_questions}</strong> preguntas
                    </div>
                    <div>
                      {a.status === "completed" ? (
                        <span style={{ background: "#e6ffed", color: "#137333", padding: ".25rem .6rem", borderRadius: "12px", fontWeight: 600, border: "1px solid #c1eac5" }}>
                          Completada · {a.score ?? "—"}% ({a.correct ?? "—"}/{a.total ?? "—"})
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="ensayos-boton-generar"
                          onClick={() => startAssignment(a)}
                          title="Comenzar"
                        >
                          Comenzar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === Temporizador === */}
      {preguntas.length > 0 && (
        <div className={`ensayos-temporizador ${timeLeft < 60 ? "temporizador-urgente" : ""}`}>
          Tiempo restante: {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
        </div>
      )}

      {/* === UI de Preguntas === */}
      {preguntas.length > 0 && (
        <div className="ensayos-preguntas-layout">
          {/* Izquierda */}
          <div className="pregunta-actual-container">
            <div className="pregunta-navegacion">
              <button className="navegacion-boton" onClick={() => setPreguntaActual((i) => Math.max(0, i - 1))} disabled={preguntaActual === 0}>◄ Anterior</button>
              <span className="pregunta-contador">Pregunta {preguntaActual + 1} de {preguntas.length}</span>
              <button className="navegacion-boton" onClick={() => setPreguntaActual((i) => Math.min(preguntas.length - 1, i + 1))} disabled={preguntaActual === preguntas.length - 1}>Siguiente ►</button>
            </div>

            <div className="pregunta-ensayo-actual">
              <div className="pregunta-header"><h4 className="pregunta-texto">{preguntas[preguntaActual]?.question}</h4></div>

              {preguntas[preguntaActual]?.image_url && (
                <div className="pregunta-imagen">
                  <img
                    src={buildImageSrc(preguntas[preguntaActual].image_url)}
                    alt="ilustración de la pregunta"
                    className="imagen-ensayo"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
              )}

              <div className="pregunta-alternativas">
                {preguntas[preguntaActual]?.alternatives?.map((alt, j) => (
                  <label
                    key={j}
                    className={`alternativa-label ${respuestas[preguntas[preguntaActual].id] === alt ? "alternativa-seleccionada" : ""} ${enviado || !timerActive ? "alternativa-deshabilitada" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`pregunta-${preguntaActual}`}
                      value={alt}
                      checked={respuestas[preguntas[preguntaActual].id] === alt}
                      disabled={enviado || !timerActive}
                      onChange={() => setRespuestas((prev) => ({ ...prev, [preguntas[preguntaActual].id]: alt }))}
                      className="alternativa-input"
                    />
                    <span className="alternativa-texto">
                      <span className="alternativa-letra">{String.fromCharCode(65 + j)}</span>
                      {alt}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Derecha */}
          <div className="navegacion-grid-container">
            <div className="navegacion-header">
              <h4>Navegación</h4>
              <div className="estado-leyenda">
                <div className="leyenda-item"><div className="leyenda-color actual"></div><span>Actual</span></div>
                <div className="leyenda-item"><div className="leyenda-color respondida"></div><span>Respondida</span></div>
                <div className="leyenda-item"><div className="leyenda-color no-respondida"></div><span>No respondida</span></div>
              </div>
            </div>

            <div className="preguntas-grid">
              {preguntas.map((p, idx) => {
                const resp = respuestas[p.id];
                const esActual = idx === preguntaActual;
                const respondida = resp !== undefined;
                return (
                  <button
                    key={p.id}
                    className={`grid-item ${esActual ? "grid-actual" : respondida ? "grid-respondida" : "grid-no-respondida"}`}
                    onClick={() => setPreguntaActual(idx)}
                    type="button"
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="navegacion-stats">
              <div className="stat-item"><span className="stat-label">Respondidas:</span><span className="stat-value">{Object.keys(respuestas).length} / {preguntas.length}</span></div>
              <div className="stat-item"><span className="stat-label">Progreso:</span><span className="stat-value">{Math.round((Object.keys(respuestas).length / Math.max(1, preguntas.length)) * 100)}%</span></div>
            </div>
          </div>
        </div>
      )}

      {/* === Acción: Finalizar === */}
      {preguntas.length > 0 && !enviado && (
        <div className="ensayos-acciones">
          <button
            type="button"
            className={`ensayos-boton-enviar ${!timerActive || submitting ? "boton-deshabilitado" : ""}`}
            disabled={!timerActive || submitting}
            onClick={() => enviarEnsayo(false)}
          >
            {submitting ? "Enviando..." : "Finalizar ensayo"}
          </button>
        </div>
      )}

      {/* === Resultado === */}
      {enviado && resultado && (
        <div className="ensayos-resultado-container">
          <div className="resultado-puntaje" style={{ marginBottom: ".5rem" }}>
            <strong>{resultado.title}</strong> — <span style={{ textTransform: "capitalize" }}>{resultado.subject}</span>
          </div>
          <div className="resultado-puntaje">Respuestas correctas: <strong>{resultado.correct} / {resultado.total}</strong></div>
          <div className="resultado-porcentaje">Porcentaje: <strong>{resultado.score}%</strong></div>
          <div style={{ marginTop: ".5rem", color: "#555", fontSize: ".95rem" }}>
            Completado: {resultado.completedAt ? new Date(resultado.completedAt).toLocaleString() : ""}
          </div>
        </div>
      )}

      {/* === Volver === */}
      <div className="ensayos-volver-container">
        <button className="alumnos-boton-volver" disabled={submitting} onClick={handleVolverClick} type="button">Volver</button>
      </div>
    </div>
  );
}
