import { useState } from "react";

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
      `http://localhost:5000/api/results/${encodeURIComponent(user.email)}/${materia}`
    );
    const data = await res.json();
    setResultados(data);
  } catch (err) {
    console.error(err);
    alert("Error obteniendo resultados");
  }
};

  return (
    <div style={{ padding: 20 }}>
      <h2>Progreso</h2>
      <select value={materia} onChange={e => setMateria(e.target.value)}>
        <option value="matematica">Matematica</option>
        <option value="historia">Historia</option>
        <option value="ciencias">Ciencias</option>
        <option value="lenguaje">Lenguaje</option>
      </select>
      <button onClick={verProgreso}>Ver últimos 2 ensayos</button>

      <ul>
        {resultados.map(r => (
          <li key={r.id}>
            Correctas: {r.correct} / {r.total} - Fecha: {new Date(r.created_at).toLocaleString()}
          </li>
        ))}
      </ul>

      <br/>
      <button onClick={volver}>Volver</button>
    </div>
  );
}
