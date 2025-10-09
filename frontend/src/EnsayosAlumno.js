import { useState } from "react";

export default function EnsayosAlumno({ user, volver }){
  const [materia, setMateria] = useState("matematica");
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [resultado, setResultado] = useState(null);
  const [enviado, setEnviado] = useState(false);

  const generarEnsayo = async () => {
    const res = await fetch(`http://localhost:5000/api/questions/${materia}`);
    const data = await res.json();
    setPreguntas(data);
    setRespuestas({});
    setResultado(null);
  };

  /*const handleChange = (qId, value) => {
    setRespuestas({ ...respuestas, [qId]: value });
  };*/

const [correctCount, setCorrectCount] = useState(0);

const enviarEnsayo = async () => {
  let correct = 0;
  preguntas.forEach(p => {
    if (respuestas[p.id] === p.correct_answer) correct++;
  });
  setCorrectCount(correct);
  setEnviado(true);
if (!user || !user.email) {
  alert("Usuario no identificado. Vuelve a iniciar sesión.");
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
        <div>
          <h3>Responde las preguntas:</h3>
          {preguntas.map((p, i) => (
            <li key={i}>
              <b>{p.question}</b><br/>
              {p.alternatives.map((a,j) => (
                <label key={j}>
                  <input
                    type="radio"
                    name={`pregunta-${i}`}
                    value={a}
                    checked={respuestas[p.id] === a}
                    onChange={() => setRespuestas({ ...respuestas, [p.id]: a })}
                  /> {a}
                </label>
              ))}
            </li>
          ))}
        </div>
       )}
       {preguntas.length > 0 && !enviado && (
  <button onClick={enviarEnsayo}>Enviar ensayo</button>
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
