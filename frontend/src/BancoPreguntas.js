import { useState } from "react";

export default function BancoPreguntas({ volver }) {
  const [mode, setMode] = useState("crear"); // "crear" o "ver"
  const [question, setQuestion] = useState("");
  const [alt1, setAlt1] = useState("");
  const [alt2, setAlt2] = useState("");
  const [alt3, setAlt3] = useState("");
  const [alt4, setAlt4] = useState("");
  const [editId, setEditId] = useState(null);
const [correctIndex, setCorrectIndex] = useState(null); // 0..3 o null
  const [subject, setSubject] = useState("matematica");
  const [materiaVer, setMateriaVer] = useState("matematica");
  const [preguntas, setPreguntas] = useState([]);

const handleCrear = async (e) => {
  e.preventDefault();

  // validar que el usuario eligió una alternativa correcta
  if (correctIndex === null) {
    alert("Selecciona la alternativa correcta antes de guardar");
    return;
  }

  const alternativas = [alt1, alt2, alt3, alt4];
  const correctAnswer = alternativas[correctIndex];

  const res = await fetch(
    editId ? `http://localhost:5000/api/questions/${editId}` : "http://localhost:5000/api/questions",
    {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        alternatives: alternativas,
        correct_answer: correctAnswer,
        subject,
      }),
    }
  );
  const data = await res.json();
  alert(data.message || data.error);

  // limpiar campos y estado de edición
  setQuestion(""); setAlt1(""); setAlt2(""); setAlt3(""); setAlt4("");
  setSubject("matematica");
  setCorrectIndex(null);
  if (typeof setEditId === "function") setEditId(null); // si usas editId
  // refrescar lista si estás viendo preguntas
  handleVer();
};


  const handleVer = async () => {
    const res = await fetch(`http://localhost:5000/api/questions/${materiaVer}`);
    const data = await res.json();
    setPreguntas(data);
  };
const eliminarPregunta = async (id) => {
  if (!window.confirm("¿Seguro que quieres eliminar esta pregunta?")) return;
  const res = await fetch(`http://localhost:5000/api/questions/${id}`, {
    method: "DELETE",
  });
  const data = await res.json();
  alert(data.message || data.error);
  handleVer();
};

const editarPregunta = (p) => {
  setMode("crear");
  setQuestion(p.question);
  setAlt1(p.alternatives[0] || "");
  setAlt2(p.alternatives[1] || "");
  setAlt3(p.alternatives[2] || "");
  setAlt4(p.alternatives[3] || "");// después de setAlt1..setAlt4 y setCorrect(p.correct_answer)
const idx = (p.alternatives || []).findIndex(a => a === p.correct_answer);
setCorrectIndex(idx >= 0 ? idx : null);
setEditId(p.id); // si usas editId

};
  return (
    <div style={{ padding: 20 }}>
      <h2>Banco de Preguntas</h2>
      <button onClick={() => setMode("crear")}>Agregar pregunta</button>
      <button onClick={() => setMode("ver")}>Ver preguntas</button>

      {mode === "crear" && (
        <form onSubmit={handleCrear}>
          <input placeholder="Pregunta" value={question} onChange={e => setQuestion(e.target.value)} /><br/>
          <input placeholder="Alternativa 1" value={alt1} onChange={e => setAlt1(e.target.value)} /><br/>
          <input placeholder="Alternativa 2" value={alt2} onChange={e => setAlt2(e.target.value)} /><br/>
          <input placeholder="Alternativa 3" value={alt3} onChange={e => setAlt3(e.target.value)} /><br/>
          <input placeholder="Alternativa 4" value={alt4} onChange={e => setAlt4(e.target.value)} /><br/>
          <select value={correctIndex ?? ""} onChange={e => {
  const v = e.target.value;
  setCorrectIndex(v === "" ? null : Number(v));
}}>
  <option value="">--Selecciona alternativa correcta--</option>
  <option value="0">{alt1 || "Alternativa 1"}</option>
  <option value="1">{alt2 || "Alternativa 2"}</option>
  <option value="2">{alt3 || "Alternativa 3"}</option>
  <option value="3">{alt4 || "Alternativa 4"}</option>
</select><br/>
          <select value={subject} onChange={e => setSubject(e.target.value)}>
            <option value="matematica">Matematica</option>
            <option value="historia">Historia</option>
            <option value="ciencias">Ciencias</option>
            <option value="lenguaje">Lenguaje</option>
          </select><br/>
          <button type="submit">Agregar</button>
        </form>
      )}

      {mode === "ver" && (
        <div>
          <select value={materiaVer} onChange={e => setMateriaVer(e.target.value)}>
            <option value="matematica">Matematica</option>
            <option value="historia">Historia</option>
            <option value="ciencias">Ciencias</option>
            <option value="lenguaje">Lenguaje</option>
          </select>
          <button onClick={handleVer}>Ver preguntas</button>
            <ul>
              {preguntas.map(p => (
                <li key={p.id}>
                  <b>{p.question}</b><br/>
                  {p.alternatives.map((a,i) => <span key={i}>{a} | </span>)}<br/>
                  <i>Correcta: {p.correct_answer}</i><br/>
                  <button onClick={() => editarPregunta(p)}>Editar</button>
                  <button onClick={() => eliminarPregunta(p.id)}>Eliminar</button>
                </li>
              ))}
            </ul>
        </div>
      )}

      <br/>
      <button onClick={volver}>Volver</button>
    </div>
  );
}
