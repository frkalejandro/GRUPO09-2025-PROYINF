import { useState } from "react";
import "./ProgresoAlumno.css";

export default function ProgresoAlumno({ user, volver }) {
  const [materia, setMateria] = useState("matematica");
  const [resultados, setResultados] = useState([]);

  const verProgreso = async () => {
    if (!user || !user.email) {
      alert("Usuario no identificado. Vuelve a iniciar sesión.");
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:5000/api/results/${encodeURIComponent(
          user.email
        )}/${materia}`
      );
      const data = await res.json();
      setResultados(data);
    } catch (err) {
      console.error(err);
      alert("Error obteniendo resultados");
    }
  };

  return (
    <div className="progreso-container">
      <div className="progreso-header">
        <h2 className="progreso-titulo">Mi Progreso</h2>
        <p className="progreso-subtitulo">
          Consulta tus últimos ensayos realizados
        </p>
      </div>

      <div className="progreso-filtros">
        <div className="filtros-grupo">
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

          <button className="progreso-boton-ver" onClick={verProgreso}>
            Ver últimos 2 ensayos
          </button>
        </div>
      </div>

      {resultados.length > 0 && (
        <div className="progreso-resultados-container">
          <h3 className="progreso-subtitulo-seccion">Últimos Ensayos</h3>

          <div className="ensayos-lista">
            {resultados.map((r, index) => {
              const porcentaje = Math.round((r.correct / r.total) * 100);
              const esReciente = index === 0; // El más reciente

              return (
                <div
                  key={r.id}
                  className={`ensayo-card ${
                    esReciente ? "ensayo-reciente" : ""
                  }`}
                >
                  <div className="ensayo-header">
                    <div className="ensayo-materia">
                      <span className="materia-badge">{r.subject}</span>
                    </div>
                    <div className="ensayo-fecha">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="ensayo-stats">
                    <div className="stat-principal">
                      <div className="puntaje-numero">{porcentaje}%</div>
                      <div className="puntaje-label">Puntaje</div>
                    </div>

                    <div className="stats-detalle">
                      <div className="stat-item">
                        <span className="stat-icon">✅</span>
                        <span className="stat-texto">
                          <strong>{r.correct}</strong> correctas
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">❌</span>
                        <span className="stat-texto">
                          <strong>{r.total - r.correct}</strong> incorrectas
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">📊</span>
                        <span className="stat-texto">
                          <strong>{r.total}</strong> total
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="ensayo-progress">
                    <div
                      className="progress-bar"
                      style={{ width: `${porcentaje}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {resultados.length === 0 && (
        <div className="progreso-vacio">
          <div className="vacio-icono">📈</div>
          <h3 className="vacio-titulo">No hay ensayos registrados</h3>
          <p className="vacio-descripcion">
            Realiza algunos ensayos para ver tu progreso aquí.
          </p>
        </div>
      )}

      <div className="progreso-volver-container">
        <button className="alumnos-boton-volver" onClick={volver}>
          Volver
        </button>
      </div>
    </div>
  );
}
