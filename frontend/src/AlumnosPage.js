// frontend/src/AlumnosPage.js
import { useState } from "react";
import "./App.css";

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
    <div className="alumnos-container">
      <div className="alumnos-header">
        <h2 className="alumnos-titulo">Página de Alumnos</h2>
      </div>

      <div className="alumnos-botones">
        <button
          className={`alumnos-boton ${
            view === "lista" ? "alumnos-boton-activo" : ""
          }`}
          onClick={verListaAlumnos}
        >
          Ver lista de alumnos
        </button>
        <button
          className={`alumnos-boton ${
            view === "curso" ? "alumnos-boton-activo" : ""
          }`}
          onClick={verResultadosComoCurso}
        >
          Ver resultados como curso
        </button>
      </div>

      {view === "lista" && (
        <div className="alumnos-lista-container">
          <h3 className="alumnos-subtitulo">Lista de alumnos</h3>
          <div className="alumnos-lista-contenedor">
            <ul className="alumnos-lista">
              {students.length === 0 && (
                <li className="alumnos-lista-vacio">
                  No hay alumnos registrados
                </li>
              )}
              {students.map((s) => (
                <li key={s.id} className="alumnos-item">
                  <span className="alumnos-email">{s.email}</span>
                </li>
              ))}
            </ul>
          </div>
          {students.length > 0 && (
            <div className="alumnos-contador">
              Total: {students.length} alumno{students.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}

      {view === "curso" && (
        <div className="curso-resultados-container">
          <h3 className="curso-subtitulo">Resultados como curso</h3>
          <div className="curso-tabla-contenedor">
            <table className="curso-tabla">
              <thead>
                <tr>
                  <th className="curso-th">Asignaturas</th>
                  <th className="curso-th">Puntaje promedio (%)</th>
                </tr>
              </thead>
              <tbody>
                {courseResults.map((r) => (
                  <tr key={r.subject} className="curso-tr">
                    <td
                      className="curso-td"
                      style={{ textTransform: "capitalize" }}
                    >
                      {r.subject}
                    </td>
                    <td className="curso-td curso-porcentaje">
                      {r.avg_percentage} %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="alumnos-volver-container">
        <button className="alumnos-boton-volver" onClick={volver}>
          Volver
        </button>
      </div>
    </div>
  );
}
