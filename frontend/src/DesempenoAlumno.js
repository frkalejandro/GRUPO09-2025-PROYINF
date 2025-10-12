import { useState } from "react";
import "./DesempenoAlumno.css";

export default function DesempenoAlumno({ volver }) {
  const [email, setEmail] = useState("");
  const [ensayos, setEnsayos] = useState([]);
  const [resultsHist, setResultsHist] = useState([]);

  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [typingTimer, setTypingTimer] = useState(null);

  const buscarAlumnos = async (q) => {
    if (!q || q.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const r = await fetch(
        `http://localhost:5000/api/students/search?q=${encodeURIComponent(q)}`
      );
      const data = await r.json();
      setSuggestions(data);
    } catch (e) {
      console.error(e);
    }
  };

  const cargarDesempeno = async (mail) => {
    if (!mail) return;
    setLoading(true);
    try {
      const [detRes, sumRes, resHistRes] = await Promise.all([
        fetch(
          `http://localhost:5000/api/student_exams/${encodeURIComponent(mail)}`
        ),
        fetch(
          `http://localhost:5000/api/student-summary/${encodeURIComponent(
            mail
          )}`
        ),
        fetch(
          `http://localhost:5000/api/student-results/${encodeURIComponent(
            mail
          )}`
        ),
      ]);
      const [det, sum, resHist] = await Promise.all([
        detRes.json(),
        sumRes.json(),
        resHistRes.json(),
      ]);
      setEnsayos(det); // ver score %
      setSummary(sum); // resumen por asignatura / global
      setResultsHist(resHist); // historial con correct/total
    } catch (e) {
      console.error(e);
      alert("Error obteniendo desempeño");
    } finally {
      setLoading(false);
    }
  };

  const verDesempeno = () => cargarDesempeno(email);

  return (
    <div className="desempeno-container">
      <div className="desempeno-header">
        <h2 className="desempeno-titulo">Desempeño del Alumno</h2>
      </div>

      <div className="desempeno-busqueda">
        <div className="busqueda-contenedor">
          <input
            className="busqueda-input"
            placeholder="Buscar por email del alumno"
            value={email}
            onChange={(e) => {
              const val = e.target.value;
              setEmail(val);
              if (typingTimer) clearTimeout(typingTimer);
              const t = setTimeout(() => buscarAlumnos(val), 250);
              setTypingTimer(t);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSuggestions([]);
                verDesempeno();
              }
            }}
          />
          {suggestions.length > 0 && (
            <div className="sugerencias-lista">
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className="sugerencia-item"
                  onClick={() => {
                    setEmail(s.email);
                    setSuggestions([]);
                    cargarDesempeno(s.email);
                  }}
                >
                  {s.email}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          className="desempeno-boton-buscar"
          onClick={verDesempeno}
          disabled={loading}
        >
          {loading ? "Cargando..." : "Ver desempeño"}
        </button>
      </div>

      {summary && (
        <div className="desempeno-resumen-container">
          <h3 className="desempeno-subtitulo">Resumen</h3>
          <div className="resumen-tabla-contenedor">
            <table className="resumen-tabla">
              <thead>
                <tr>
                  <th className="resumen-th">Asignatura</th>
                  <th className="resumen-th">Promedio</th>
                  <th className="resumen-th">Intentos</th>
                </tr>
              </thead>
              <tbody>
                {summary.by_subject.length === 0 && (
                  <tr>
                    <td colSpan="3" className="resumen-vacio">
                      Sin registros
                    </td>
                  </tr>
                )}
                {summary.by_subject.map((r) => (
                  <tr key={r.subject} className="resumen-tr">
                    <td
                      className="resumen-td"
                      style={{ textTransform: "capitalize" }}
                    >
                      {r.subject}
                    </td>
                    <td className="resumen-td resumen-promedio">
                      {r.avg_score}
                    </td>
                    <td className="resumen-td">{r.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="resumen-global">
            <strong>Promedio global:</strong>{" "}
            {summary.overall && summary.overall.avg_score !== null
              ? summary.overall.avg_score
              : "—"}{" "}
            ({summary.overall ? summary.overall.attempts : 0} ensayos)
          </div>
        </div>
      )}

      {resultsHist.length > 0 && (
        <div className="desempeno-historial-container">
          <h3 className="desempeno-subtitulo">Historial de ensayos</h3>
          <div className="historial-contenedor">
            <ul className="historial-lista">
              {resultsHist.map((r) => {
                const buenas = r.correct;
                const malas = Math.max(0, (r.total ?? 0) - (r.correct ?? 0));
                const pct =
                  r.total > 0 ? Math.round((buenas / r.total) * 100) : 0;
                return (
                  <li key={r.id} className="historial-item">
                    <div className="historial-materia">
                      <strong>Materia:</strong> {r.subject}
                    </div>
                    <div className="historial-stats">
                      <span className="stat-buenas">✅ {buenas} buenas</span>
                      <span className="stat-malas">❌ {malas} malas</span>
                      <span className="stat-total">📊 {r.total} total</span>
                      <span className="stat-puntaje">🎯 {pct}%</span>
                    </div>
                    <div className="historial-fecha">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <div className="desempeno-volver-container">
        <button className="alumnos-boton-volver" onClick={volver}>
          Volver
        </button>
      </div>
    </div>
  );
}
