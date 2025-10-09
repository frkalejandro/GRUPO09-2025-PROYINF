import { useState } from "react";

export default function DesempenoAlumno({ volver }) {
  const [email, setEmail] = useState("");
  const [ensayos, setEnsayos] = useState([]);

  const verDesempeno = async () => {
    const res = await fetch(`http://localhost:5000/api/student_exams/${email}`);
    const data = await res.json();
    setEnsayos(data);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Desempeño del alumno</h2>
      <input
        placeholder="Email del alumno"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <button onClick={verDesempeno}>Ver desempeño</button>

      {ensayos.length > 0 && (
        <ul>
          {ensayos.map(e => (
            <li key={e.id}>
              Materia: {e.subject} | Puntaje: {e.score} | Fecha: {new Date(e.created_at).toLocaleString()}
            </li>
          ))}
        </ul>
      )}

      <br/>
      <button onClick={volver}>Volver</button>
    </div>
  );
}