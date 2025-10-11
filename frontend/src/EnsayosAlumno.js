import React, { useState, useEffect } from "react";
const BACKEND_URL = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const buildImageSrc = (image_url) => {
  if (!image_url) return null;
  // Si ya es absoluta (http/https), úsala tal cual
  if (/^https?:\/\//i.test(image_url)) return image_url;
  // Asegura que comience con '/'
  const path = image_url.startsWith("/") ? image_url : `/${image_url}`;
  return `${BACKEND_URL}${path}`;
};

export default function EnsayosAlumno({ user, volver }){
  const [materia, setMateria] = useState("matematica");
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [resultado, setResultado] = useState(null);
  const [enviado, setEnviado] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);      // en segundos
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
  preguntas.forEach(p => {
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
  // Guardar en backend
  await fetch("http://localhost:5000/api/submit-essay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      student_email: user.email, // user lo tienes del login
      subject: materia,
      correct,
      total: preguntas.length
    })
  });
  // También guardar en student_exams para vista de desempeño
  const score = Math.round((correct / preguntas.length) * 100);
  await fetch("http://localhost:5000/api/exams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      student_email: user.email,
      subject: materia,
      score
    })
  });

  if (auto) {
    // feedback discreto en auto-envío por tiempo agotado
    // (mostrar un modal/toast)
  }
  setSubmitting(false);
};
  return (
    <div style={{ padding: 20 }}>
      <h2>Generar Ensayo</h2>
      <select value={materia} onChange={e => setMateria(e.target.value)}>
        <option value="matematica">Matematica</option>
        <option value="historia">Historia</option>
        <option value="ciencias">Ciencias</option>
        <option value="lenguaje">Lenguaje</option>
      </select>
      <button onClick={generarEnsayo}>Generar ensayo</button>

      {preguntas.length > 0 && (
        <div style={{ marginTop: 10, fontWeight: "bold" }}>
          Tiempo restante: {String(Math.floor(timeLeft/60)).padStart(2,"0")}:
          {String(timeLeft%60).padStart(2,"0")}
       </div>
      )}

      {preguntas.length > 0 && (
        <div>
          <h3>Responde las preguntas:</h3>
          {preguntas.map((p, i) => (
            <li key={i}>
              <b>{p.question}</b><br/>
                {p.image_url && (
                <div style={{ margin: "6px 0" }}>
                  <img
                    src={buildImageSrc(p.image_url)}
                    alt="ilustración de la pregunta"
                    style={{ maxWidth: 300, height: "auto", display: "block" }}
                    onError={(e) => {
                      // fallback visual si por alguna razón la ruta no carga
                      e.currentTarget.style.display = "none";
                      console.warn("No se pudo cargar la imagen de la pregunta:", p.image_url);
                    }}
                  />
                </div>
              )}

              {p.alternatives.map((a,j) => (
                <label key={j}>
                  <input
                    type="radio"
                    name={`pregunta-${i}`}
                    value={a}
                    checked={respuestas[p.id] === a}
                    disabled={enviado || !timerActive}
                    onChange={() => setRespuestas({ ...respuestas, [p.id]: a })}
                  /> {a}
                </label>
              ))}
            </li>
          ))}
        </div>
       )}
       {preguntas.length > 0 && !enviado && (
         <button disabled={!timerActive || submitting} onClick={() => enviarEnsayo(false)}>
           {submitting ? "Enviando..." : "Enviar ensayo"}
         </button>
       )}
{enviado && (
  <p>Respuestas correctas: {correctCount} / {preguntas.length}</p>
)}

      {resultado && <h3>Resultado: {resultado}</h3>}

      <br/>
      <button onClick={volver}>Volver</button>
    </div>
  );
}
