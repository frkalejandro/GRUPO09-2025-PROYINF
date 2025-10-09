import React, { useState, useEffect } from "react";

export default function StudentsList({ volver }) {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/students")
      .then((res) => res.json())
      .then((data) => setStudents(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Lista de Alumnos</h2>
      <ul>
        {students.map((s) => (
          <li key={s.id}>{s.email}</li>
        ))}
      </ul>
      <button onClick={volver}>Volver</button>
    </div>
  );
}
