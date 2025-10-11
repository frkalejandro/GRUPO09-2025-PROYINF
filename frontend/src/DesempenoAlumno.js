import { useState } from "react";

export default function DesempenoAlumno({ volver }) {
  const [email, setEmail] = useState("");
  const [ensayos, setEnsayos] = useState([]);
  const [resultsHist, setResultsHist] = useState([]);

  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [typingTimer, setTypingTimer] = useState(null);

  const buscarAlumnos = async (q) => {
    if (!q || q.length < 2) { setSuggestions([]); return; }
    try {
      const r = await fetch(`http://localhost:5000/api/students/search?q=${encodeURIComponent(q)}`);
      const data = await r.json();
      setSuggestions(data);
    } catch (e) { console.error(e); }
  };

  const cargarDesempeno = async (mail) => {
    if (!mail) return;
    setLoading(true);
    try {
      const [detRes, sumRes, resHistRes] = await Promise.all([
        fetch(`http://localhost:5000/api/student_exams/${encodeURIComponent(mail)}`),
        fetch(`http://localhost:5000/api/student-summary/${encodeURIComponent(mail)}`),
        fetch(`http://localhost:5000/api/student-results/${encodeURIComponent(mail)}`)
      ]);
      const [det, sum, resHist] = await Promise.all([
        detRes.json(), sumRes.json(), resHistRes.json()
      ]);
      setEnsayos(det);         // ver score %
      setSummary(sum);         // resumen por asignatura / global
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
    <div style={{ padding: 20 }}>
      <h2>Desempeño del alumno</h2>
      <div style={{ position: "relative", maxWidth: 420 }}>
        <input
          placeholder="Buscar por email del alumno"
          value={email}
          onChange={e => {
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
          style={{ width: "100%" }}
        />
        {suggestions.length > 0 && (
          <div style={{
            position: "absolute",
            zIndex: 10,
            background: "#fff",
            border: "1px solid #ccc",
            width: "100%"
          }}>
            {suggestions.map(s => (
              <div
                key={s.id}
                style={{ padding: 8, cursor: "pointer" }}
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
      <button onClick={verDesempeno} style={{ marginTop: 10 }}>
        {loading ? "Cargando..." : "Ver desempeño"}
      </button>

      {summary && (
        <div style={{ marginTop: 20 }}>
          <h3>Resumen</h3>
          <table border="1" cellPadding="6" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr><th>Asignatura</th><th>Promedio</th><th>Intentos</th></tr>
            </thead>
            <tbody>
              {summary.by_subject.length === 0 && (
                <tr><td colSpan="3">Sin registros</td></tr>
              )}
              {summary.by_subject.map(r => (
                <tr key={r.subject}>
                  <td style={{ textTransform: "capitalize" }}>{r.subject}</td>
                  <td>{r.avg_score}</td>
                  <td>{r.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: 8 }}>
            <b>Promedio global:</b> {summary.overall && summary.overall.avg_score !== null ? summary.overall.avg_score : "—"} 
            {" "}({summary.overall ? summary.overall.attempts : 0} ensayos)
          </p>
        </div>
      )}

      {resultsHist.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Historial de ensayos (buenas y malas)</h3>
          <ul>
            {resultsHist.map(r => {
              const buenas = r.correct;
              const malas  = Math.max(0, (r.total ?? 0) - (r.correct ?? 0));
              const pct    = (r.total > 0) ? Math.round((buenas / r.total) * 100) : 0;
              return (
                <li key={r.id}>
                  Materia: {r.subject} |
                  {" "}Buenas: {buenas} |
                  {" "}Malas: {malas} |
                  {" "}Total: {r.total} |
                  {" "}Puntaje: {pct} |
                  {" "}Fecha: {new Date(r.created_at).toLocaleString()}
                </li>
              );
            })}
          </ul>
        </div>
      )}


      <br/>
      <button onClick={volver}>Volver</button>
    </div>
  );
}