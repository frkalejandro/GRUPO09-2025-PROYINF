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
  const [imageFile, setImageFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);

  const handleCrear = async (e) => {
  e.preventDefault();

  // validar que el usuario eligió una alternativa correcta
  if (correctIndex === null) {
    alert("Selecciona la alternativa correcta antes de guardar");
    return;
  }
  // validar campos mínimos
  if (!question.trim()) {
    alert("La pregunta no puede estar vacía");
    return;
  }

  if (![alt1, alt2, alt3, alt4].every(a => a && a.trim().length > 0)) {
    alert("Debes completar las 4 alternativas");
    return;
  }
  const alternativas = [alt1, alt2, alt3, alt4];
  const correctAnswer = alternativas[correctIndex];

  const form = new FormData();
  form.append('question', question);
  form.append('alternatives', JSON.stringify(alternativas));
  form.append('correct_answer', correctAnswer);
  form.append('subject', subject);
  if (imageFile) form.append('image', imageFile);
  if (editId) form.append('remove_image', removeImage ? 'true' : 'false');

  const res = await fetch(
    editId ? `http://localhost:5000/api/questions/${editId}` : "http://localhost:5000/api/questions",
    {
      method: editId ? "PUT" : "POST",
      body: form // No ponger Content-Type fetch lo setea con boundary
    }
  );


  const data = await res.json();
  alert(data.message || data.error);

  // limpiar campos y estado de edición
  setQuestion(""); setAlt1(""); setAlt2(""); setAlt3(""); setAlt4("");
  setSubject("matematica");
  setCorrectIndex(null);

  setEditId(null);
  setImageFile(null);
  setRemoveImage(false);

  // pasar a modo "ver" y refrescar lista de la materia actual
  setMode("ver");
  setMateriaVer(subject);
  handleVer(subject);
  
};


  const handleVer = async (materia = materiaVer) => {
    const res = await fetch(`http://localhost:5000/api/questions/${materia}`);
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
      <button onClick={() => { setMode("ver"); handleVer(); }}>Ver preguntas</button>

      {mode === "crear" && (
        <form onSubmit={handleCrear}>
          <input placeholder="Pregunta" value={question} onChange={e => setQuestion(e.target.value)} /><br/>
          <input placeholder="Alternativa 1" value={alt1} onChange={e => setAlt1(e.target.value)} /><br/>
          <input placeholder="Alternativa 2" value={alt2} onChange={e => setAlt2(e.target.value)} /><br/>
          <input placeholder="Alternativa 3" value={alt3} onChange={e => setAlt3(e.target.value)} /><br/>
          <input placeholder="Alternativa 4" value={alt4} onChange={e => setAlt4(e.target.value)} /><br/>
    
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setImageFile(f);
              setRemoveImage(false);
            }}
          /><br/>
           {imageFile && <small>Imagen seleccionada: {imageFile.name}</small>}<br/>
           {editId && (
             <label style={{ display: 'block', marginTop: 6 }}>
               <input
                 type="checkbox"
                 checked={removeImage}
                 onChange={(e) => {
                   setRemoveImage(e.target.checked);
                   if (e.target.checked) setImageFile(null);
                 }}
               /> Quitar imagen actual
             </label>
          )}

          <select value={correctIndex ?? ""} onChange={e => { const v = e.target.value;
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

          <button onClick={() => handleVer()}>Ver preguntas</button>
            <ul>
              {preguntas.map(p => (
                <li key={p.id}>
                  <b>{p.question}</b><br/>
                  {(p.alternatives || []).map((a,i) => <span key={i}>{a}{i<3 ? " | " : ""} </span>)}<br/>
                  <i>Correcta: {p.correct_answer}</i><br/>
                  {p.image_url && (
                    <div style={{ margin: '6px 0' }}>
                      <img
                        src={`http://localhost:5000${p.image_url}`}
                        alt="ilustración de la pregunta"
                        style={{ maxWidth: 240, height: 'auto', display: 'block' }}
                      />
                    </div>
                  )}

                  
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
