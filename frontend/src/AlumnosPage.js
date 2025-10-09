// frontend/src/AlumnosPage.js
import { useState } from "react";

export default function AlumnosPage({ volver }) {
  const [view, setView] = useState(null); // null | "lista" | "curso"
  const [students, setStudents] = useState([]);
  const [courseResults, setCourseResults] = useState([]);

  const verListaAlumnos = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/students");
      const data = await res.json();
      setStudents(data);
      setView("lista");
    } catch (err) {
      console.error(err);
      alert("Error obteniendo lista de alumnos");
    }
  };

  const verResultadosComoCurso = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/course-results");
      const data = await res.json();
      setCourseResults(data);
      setView("curso");
    } catch (err) {
      console.error(err);
      alert("Error obteniendo resultados de curso");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Página de Alumnos</h2>

      <div style={{ marginBottom: 10 }}>
        <button onClick={verListaAlumnos}>Ver lista de alumnos</button>{" "}
        <button onClick={verResultadosComoCurso}>Ver resultados como curso</button>
      </div>

      {view === "lista" && (
        <div>
          <h3>Lista de alumnos</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {students.length === 0 && <li>No hay alumnos registrados</li>}
            {students.map((s) => (
              <li key={s.id}>{s.email}</li>
            ))}
          </ul>
        </div>
      )}

      {view === "curso" && (
        <div>
          <h3>Resultados como curso</h3>
          <table border="1" cellPadding="6" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Asignaturas</th>
                <th>Puntaje promedio (%)</th>
              </tr>
            </thead>
            <tbody>
              {courseResults.map((r) => (
                <tr key={r.subject}>
                  <td style={{ textTransform: "capitalize" }}>{r.subject}</td>
                  <td>{r.avg_percentage} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <br />
      <button onClick={volver}>Volver</button>
    </div>
  );
}
