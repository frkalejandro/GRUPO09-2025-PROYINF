import React, { useState, useEffect } from "react";
import "./EnsayosAlumno.css";

const BACKEND_URL = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const buildImageSrc = (image_url) => {
  if (!image_url) return null;
  // Si ya es absoluta (http/https), úsala tal cual
  if (/^https?:\/\//i.test(image_url)) return image_url;
  // Asegura que comience con '/'
  const path = image_url.startsWith("/") ? image_url : `/${image_url}`;
  return `${BACKEND_URL}${path}`;
};

export default function EnsayosAlumno({ user, volver }) {
  const [materia, setMateria] = useState("matematica");
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [resultado, setResultado] = useState(null);
  const [enviado, setEnviado] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // en segundos
  const [timerActive, setTimerActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const DURATION_MIN = 10; //  Cambiar aqui la duracion (minutos)

  const generarEnsayo = async () => {
    const res = await fetch(`http://localhost:5000/api/questions/${materia}`);
    const data = await res.json();
    setPreguntas(data);
    setRespuestas({});
    setResultado(null);
    // reiniciar temporizador
    setTimeLeft(DURATION_MIN * 60);
    setTimerActive(true);
    setEnviado(false);
  };

  // Tick del temporizador
  React.useEffect(() => {
    if (!timerActive) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          setTimerActive(false);
          // tiempo agotado → auto-enviar si no se envió
          if (!enviado) enviarEnsayo(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerActive]); // eslint-disable-line

  /*const handleChange = (qId, value) => {
    setRespuestas({ ...respuestas, [qId]: value });
  };*/

  const [correctCount, setCorrectCount] = useState(0);

  const enviarEnsayo = async (auto = false) => {
    if (submitting || enviado) return;
    setSubmitting(true);

    let correct = 0;
    preguntas.forEach((p) => {
      if (respuestas[p.id] === p.correct_answer) correct++;
    });
    setCorrectCount(correct);
    setEnviado(true);
    setTimerActive(false);
    if (!user || !user.email) {
      alert("Usuario no identificado. Vuelve a iniciar sesión.");
      setSubmitting(false);
      return;
    }

    // Construir detalle de cada pregunta (para análisis por etiquetas)
    const details = preguntas.map(p => ({
      question_id: p.id,
      chosen_answer: respuestas[p.id],
      correct_answer: p.correct_answer,
      tags: Array.isArray(p.tags) ? p.tags : []
    }));

    // Guardar en backend (con detalle completo)
    await fetch("http://localhost:5000/api/submit-essay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_email: user.email,
        subject: materia,
        correct,
        total: preguntas.length,
        details, // se manda el detalle
      }),
    });

    // También guardar en student_exams para vista de desempeño
    const score = Math.round((correct / preguntas.length) * 100);
    await fetch("http://localhost:5000/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_email: user.email,
        subject: materia,
        score,
      }),
    });

    if (auto) {
      // feedback discreto en auto-envío por tiempo agotado
      // (mostrar un modal/toast)
    }
    setSubmitting(false);
  };

  // Agregar estos estados al componente
  const [preguntaActual, setPreguntaActual] = useState(0);

  return (
    <div className="ensayos-container">
      <div className="ensayos-header">
        <h2 className="ensayos-titulo">Generar Ensayo</h2>
      </div>

      <div className="ensayos-configuracion">
        <div className="configuracion-grupo">
          <select
            className="form-select"
            value={materia}
            onChange={(e) => setMateria(e.target.value)}
          >
            <option value="matematica">Matemática</option>
            <option value="historia">Historia</option>
            <option value="ciencias">Ciencias</option>
            <option value="lenguaje">Lenguaje</option>
          </select>

          <button className="ensayos-boton-generar" onClick={generarEnsayo}>
            Generar ensayo
          </button>
        </div>
      </div>

      {preguntas.length > 0 && (
        <div
          className={`ensayos-temporizador ${
            timeLeft < 60 ? "temporizador-urgente" : ""
          }`}
        >
          Tiempo restante: {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
          {String(timeLeft % 60).padStart(2, "0")}
        </div>
      )}

      {preguntas.length > 0 && (
        <div className="ensayos-preguntas-layout">
          {/* Sección izquierda - Pregunta actual */}
          <div className="pregunta-actual-container">
            <div className="pregunta-navegacion">
              <button
                className="navegacion-boton"
                onClick={() =>
                  setPreguntaActual((prev) => Math.max(0, prev - 1))
                }
                disabled={preguntaActual === 0}
              >
                ◄ Anterior
              </button>

              <span className="pregunta-contador">
                Pregunta {preguntaActual + 1} de {preguntas.length}
              </span>

              <button
                className="navegacion-boton"
                onClick={() =>
                  setPreguntaActual((prev) =>
                    Math.min(preguntas.length - 1, prev + 1)
                  )
                }
                disabled={preguntaActual === preguntas.length - 1}
              >
                Siguiente ►
              </button>
            </div>

            <div className="pregunta-ensayo-actual">
              <div className="pregunta-header">
                <h4 className="pregunta-texto">
                  {preguntas[preguntaActual]?.question}
                </h4>
              </div>

              {preguntas[preguntaActual]?.image_url && (
                <div className="pregunta-imagen">
                  <img
                    src={buildImageSrc(preguntas[preguntaActual].image_url)}
                    alt="ilustración de la pregunta"
                    className="imagen-ensayo"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      console.warn(
                        "No se pudo cargar la imagen de la pregunta:",
                        preguntas[preguntaActual].image_url
                      );
                    }}
                  />
                </div>
              )}

              <div className="pregunta-alternativas">
                {preguntas[preguntaActual]?.alternatives.map((a, j) => (
                  <label
                    key={j}
                    className={`alternativa-label ${
                      respuestas[preguntas[preguntaActual].id] === a
                        ? "alternativa-seleccionada"
                        : ""
                    } ${
                      enviado || !timerActive ? "alternativa-deshabilitada" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name={`pregunta-${preguntaActual}`}
                      value={a}
                      checked={respuestas[preguntas[preguntaActual].id] === a}
                      disabled={enviado || !timerActive}
                      onChange={() =>
                        setRespuestas({
                          ...respuestas,
                          [preguntas[preguntaActual].id]: a,
                        })
                      }
                      className="alternativa-input"
                    />
                    <span className="alternativa-texto">
                      <span className="alternativa-letra">
                        {String.fromCharCode(65 + j)}
                      </span>
                      {a}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Sección derecha - Navegación y estado */}
          <div className="navegacion-grid-container">
            <div className="navegacion-header">
              <h4>Navegación</h4>
              <div className="estado-leyenda">
                <div className="leyenda-item">
                  <div className="leyenda-color actual"></div>
                  <span>Actual</span>
                </div>
                <div className="leyenda-item">
                  <div className="leyenda-color respondida"></div>
                  <span>Respondida</span>
                </div>
                <div className="leyenda-item">
                  <div className="leyenda-color no-respondida"></div>
                  <span>No respondida</span>
                </div>
              </div>
            </div>

            <div className="preguntas-grid">
              {preguntas.map((p, index) => {
                const estaRespondida = respuestas[p.id] !== undefined;
                const esActual = index === preguntaActual;

                return (
                  <button
                    key={index}
                    className={`grid-item ${
                      esActual
                        ? "grid-actual"
                        : estaRespondida
                        ? "grid-respondida"
                        : "grid-no-respondida"
                    }`}
                    onClick={() => setPreguntaActual(index)}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="navegacion-stats">
              <div className="stat-item">
                <span className="stat-label">Respondidas:</span>
                <span className="stat-value">
                  {Object.keys(respuestas).length} / {preguntas.length}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Progreso:</span>
                <span className="stat-value">
                  {Math.round(
                    (Object.keys(respuestas).length / preguntas.length) * 100
                  )}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {preguntas.length > 0 && !enviado && (
        <div className="ensayos-acciones">
          <button
            className={`ensayos-boton-enviar ${
              !timerActive || submitting ? "boton-deshabilitado" : ""
            }`}
            disabled={!timerActive || submitting}
            onClick={() => enviarEnsayo(false)}
          >
            {submitting ? "Enviando..." : "Finalizar ensayo"}
          </button>
        </div>
      )}

      {enviado && (
        <div className="ensayos-resultado-container">
          <div className="resultado-puntaje">
            Respuestas correctas:{" "}
            <strong>
              {correctCount} / {preguntas.length}
            </strong>
          </div>
          <div className="resultado-porcentaje">
            Porcentaje:{" "}
            <strong>
              {Math.round((correctCount / preguntas.length) * 100)}%
            </strong>
          </div>
        </div>
      )}

      <div className="ensayos-volver-container">
        <button className="alumnos-boton-volver" onClick={volver}>
          Volver
        </button>
      </div>
    </div>
  );
}
