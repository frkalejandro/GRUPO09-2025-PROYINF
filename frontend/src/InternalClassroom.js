import { useEffect, useMemo, useState } from "react";
import "./InternalClassroom.css";

const API = process.env.REACT_APP_API_BASE || "http://localhost:5000";

export default function InternalClassroom({ user, volver }) {
  // ===== Estado base =====
  const owner = user && user.email ? user.email : "profesor@ejemplo.com";
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null); // objeto curso o null
  const [courseStudents, setCourseStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Crear curso
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  // Importación alumnos
  const [studentsText, setStudentsText] = useState("");
  const [studentsParsed, setStudentsParsed] = useState([]);
  const [importing, setImporting] = useState(false);

  // Asignación
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDesc, setAssignDesc] = useState("");
  const [assignSubject, setAssignSubject] = useState("matematica");
  const [assignCount, setAssignCount] = useState(10);
  const [assigning, setAssigning] = useState(false);

  // Mensajes
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // ===== Helpers =====
  const showMsg = (t) => {
    setMsg(t);
    window.clearTimeout(showMsg._t);
    showMsg._t = window.setTimeout(() => setMsg(""), 3000);
  };
  const showErr = (t) => {
    setErr(t);
    window.clearTimeout(showErr._t);
    showErr._t = window.setTimeout(() => setErr(""), 5000);
  };

  async function fetchJSON(url, options) {
    const r = await fetch(url, options);
    let text = "";
    try { text = await r.text(); } catch { text = ""; }
    let data = {};
    if (text) {
      try { data = JSON.parse(text); } catch { data = {}; }
    }
    if (!r.ok) throw new Error((data && data.error) || `HTTP ${r.status}`);
    return data;
  }

  // ===== Cargar cursos =====
  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const data = await fetchJSON(`${API}/api/internal-courses?owner=${encodeURIComponent(owner)}`);
      setCourses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setCourses([]);
      showErr("No se pudieron cargar los cursos");
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Alumnos del curso =====
  const fetchCourseStudents = async (course) => {
    setSelectedCourse(course || null);
    if (!course) { setCourseStudents([]); return; }
    setLoadingStudents(true);
    try {
      const data = await fetchJSON(`${API}/api/internal-courses/${course.id}/students`);
      setCourseStudents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setCourseStudents([]);
      showErr("No se pudieron cargar los alumnos del curso");
    } finally {
      setLoadingStudents(false);
    }
  };

  // ===== Crear curso =====
  const createCourse = async () => {
    const nm = (name || "").trim();
    if (!nm) return showErr("Ingresa un nombre para el curso");
    try {
      await fetchJSON(`${API}/api/internal-courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nm, description: desc || null, owner_email: owner })
      });
      setName(""); setDesc("");
      showMsg("Curso creado");
      await fetchCourses();
    } catch (e) { console.error(e); showErr(e.message); }
  };

  // ===== Parsear alumnos sin duplicados =====
  const parseStudents = () => {
    try {
      if (!studentsText.trim()) throw new Error("Pega un arreglo JSON primero");
      const arr = JSON.parse(studentsText);
      if (!Array.isArray(arr)) throw new Error("Debes pegar un arreglo JSON");

      // Normalizar keys flexibles
      const cleaned = arr
        .map((s) => {
          const email = String((s && (s.student_email || s.email || s.correo)) || "").trim().toLowerCase();
          const display_name = s && (s.display_name || s.name || s.nombre)
            ? String(s.display_name || s.name || s.nombre).trim()
            : null;
          return { student_email: email, display_name };
        })
        .filter((s) => s.student_email);

      // Dedupe dentro del archivo
      const seen = new Set();
      const uniqueFile = [];
      for (const s of cleaned) {
        if (!seen.has(s.student_email)) { seen.add(s.student_email); uniqueFile.push(s); }
      }

      // Filtrar contra los ya existentes del curso seleccionado (si corresponde)
      let candidate = uniqueFile;
      if (selectedCourse) {
        const existing = new Set(courseStudents.map((x) => String(x.student_email || "").toLowerCase()));
        candidate = uniqueFile.filter((s) => !existing.has(s.student_email));
      }

      if (!candidate.length) {
        setStudentsParsed([]);
        return showErr(selectedCourse ? "No hay alumnos nuevos (ya están en el curso o son duplicados)" : "No hay alumnos válidos (verifica el JSON)");
      }

      setStudentsParsed(candidate);
      showMsg(`Listos para importar: ${candidate.length}`);
    } catch (e) {
      setStudentsParsed([]);
      showErr("JSON inválido: " + e.message);
    }
  };

  // ===== Importar alumnos =====
  const importStudents = async () => {
    if (!selectedCourse) return showErr("Selecciona un curso destino en el selector");

    // Si no se presionó "Parsear", intentamos parseo rápido
    let payload = studentsParsed;
    if ((!payload || !payload.length) && studentsText.trim()) {
      try {
        const arr = JSON.parse(studentsText);
        if (Array.isArray(arr)) {
          const cleaned = arr
            .map((s) => {
              const email = String((s && (s.student_email || s.email || s.correo)) || "").trim().toLowerCase();
              const display_name = s && (s.display_name || s.name || s.nombre)
                ? String(s.display_name || s.name || s.nombre).trim()
                : null;
              return { student_email: email, display_name };
            })
            .filter((s) => s.student_email);
          const seen = new Set();
          const uniqueFile = [];
          for (const s of cleaned) {
            if (!seen.has(s.student_email)) { seen.add(s.student_email); uniqueFile.push(s); }
          }
          const existing = new Set(courseStudents.map((x) => String(x.student_email || "").toLowerCase()));
          payload = uniqueFile.filter((s) => !existing.has(s.student_email));
        }
      } catch {
        // se validará abajo
      }
    }

    if (!payload || !payload.length) return showErr("No hay alumnos para importar");

    setImporting(true);
    try {
      await fetchJSON(`${API}/api/internal-courses/${selectedCourse.id}/import-students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: payload })
      });
      showMsg(`Importados ${payload.length} alumno(s)`);
      setStudentsText(""); setStudentsParsed([]);
      fetchCourseStudents(selectedCourse);
    } catch (e) { console.error(e); showErr(e.message); }
    finally { setImporting(false); }
  };

  // ===== Asignar ensayo =====
  const canAssign = useMemo(() => {
    return !!selectedCourse && courseStudents.length > 0 && !!assignTitle.trim() && Number(assignCount) > 0;
  }, [selectedCourse, courseStudents.length, assignTitle, assignCount]);

  const assignEssay = async () => {
    if (!selectedCourse) return showErr("Selecciona un curso");
    if (courseStudents.length === 0) return showErr("Este curso no tiene alumnos. Importa alumnos antes de asignar.");
    if (!assignTitle.trim()) return showErr("Ingresa un título");
    const n = Number(assignCount);
    if (!Number.isFinite(n) || n <= 0) return showErr("Cantidad de preguntas debe ser mayor a 0");
    setAssigning(true);
    try {
      await fetchJSON(`${API}/api/internal-courses/${selectedCourse.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: assignTitle.trim(), description: assignDesc || null, subject: assignSubject, num_questions: n })
      });
      showMsg("Ensayo asignado al curso");
      setAssignTitle(""); setAssignDesc("");
    } catch (e) { console.error(e); showErr(e.message); }
    finally { setAssigning(false); }
  };

  return (
    <div className="internal-container">
      <header className="internal-header">
        <h1 className="internal-titulo">Classroom Interno</h1>
        <p className="internal-subtitulo">Crea cursos, importa alumnos sin duplicados y asigna ensayos.</p>
      </header>

      {(msg || err) && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            zIndex: 9999,
            background: err ? "#fdecea" : "#e6fffa",
            color: err ? "#b00020" : "#065f46",
            border: `1px solid ${err ? "#f5c2c7" : "#99f6e4"}`,
            padding: "10px 14px",
            borderRadius: 12,
            boxShadow: "0 8px 20px rgba(0,0,0,.12)",
            maxWidth: 360,
            fontSize: 14,
          }}
        >
          {err || msg}
        </div>
      )}

      {/* ===== BLOQUE 1: Crear curso + Importar alumnos ===== */}
      <section className="internal-card">
        <div className="internal-card-header">
          <h3 className="internal-card-titulo">Crear curso & Importar alumnos</h3>
          <span className="badge-info">{owner}</span>
        </div>

        <div className="internal-grid">
          {/* Crear curso */}
          <div className="grid-col">
            <h4 className="col-titulo">Crear curso</h4>
            <div className="internal-form">
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: 3°B Matemática" />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción (opcional)</label>
                <input className="form-input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Breve descripción" />
              </div>
              <div className="internal-actions">
                <button type="button" className="btn-primario" onClick={createCourse}>Crear curso</button>
              </div>
            </div>
          </div>

          {/* Importar alumnos */}
          <div className="grid-col">
            <h4 className="col-titulo">Importar alumnos (JSON)</h4>
            <div className="form-group">
              <label className="form-label">Curso destino</label>
              <select
                className="form-input"
                value={selectedCourse ? String(selectedCourse.id) : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const c = courses.find((x) => String(x.id) === val) || null;
                  fetchCourseStudents(c);
                }}
              >
                <option value="">— Selecciona un curso —</option>
                {courses.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>

            <label className="form-label">Pega un arreglo JSON</label>
            <textarea
              className="form-textarea"
              rows={8}
              value={studentsText}
              onChange={(e) => setStudentsText(e.target.value)}
              placeholder='Ejemplo:
[
  {"student_email":"alumno1@colegio.cl","display_name":"Ana"},
  {"email":"beto@colegio.cl","name":"Beto"}
]'
            />
            <div className="internal-actions">
              <button type="button" className="btn-secundario" onClick={parseStudents}>Parsear JSON</button>
              <button type="button" className="btn-primario" onClick={importStudents} disabled={!selectedCourse || importing}>
                {importing ? "Importando…" : "Importar al curso"}
              </button>
            </div>
            {studentsParsed.length > 0 && (
              <p className="hint">Listos para importar: <strong>{studentsParsed.length}</strong> (duplicados removidos)</p>
            )}
          </div>
        </div>
      </section>

      {/* ===== BLOQUE 2: Mis cursos & alumnos + Asignar ensayo ===== */}
      <section className="internal-card">
        <div className="internal-card-header">
          <h3 className="internal-card-titulo">Mis cursos & Asignar ensayo</h3>
        </div>

        <div className="internal-grid">
          {/* Mis cursos + alumnos */}
          <div className="grid-col">
            <h4 className="col-titulo">Mis cursos</h4>
            {loadingCourses ? (
              <div className="estado-vacio">Cargando cursos…</div>
            ) : courses.length === 0 ? (
              <div className="estado-vacio">Aún no has creado cursos.</div>
            ) : (
              <ul className="internal-lista">
                {courses.map((c) => (
                  <li key={c.id} className={`internal-item ${selectedCourse && selectedCourse.id === c.id ? "seleccionado" : ""}`}>
                    <div className="item-head">
                      <span className="curso-nombre">{c.name}</span>
                      <span className="curso-fecha">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="curso-desc">{c.description || "Sin descripción"}</p>
                    <div className="item-actions">
                      <button type="button" className="btn-secundario" onClick={() => fetchCourseStudents(c)}>Seleccionar</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <h4 className="col-titulo" style={{ marginTop: "1rem" }}>Alumnos del curso seleccionado</h4>
            {!selectedCourse ? (
              <div className="estado-vacio">Selecciona un curso para ver sus alumnos.</div>
            ) : loadingStudents ? (
              <div className="estado-vacio">Cargando alumnos…</div>
            ) : courseStudents.length === 0 ? (
              <div className="estado-vacio">Este curso no tiene alumnos aún.</div>
            ) : (
              <div className="tabla-wrapper">
                <table className="tabla">
                  <thead>
                    <tr><th>Correo</th><th>Nombre</th></tr>
                  </thead>
                  <tbody>
                    {courseStudents.map((s) => (
                      <tr key={s.student_email}>
                        <td>{s.student_email}</td>
                        <td>{s.display_name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Asignar */}
          <div className="grid-col">
            <h4 className="col-titulo">Asignar ensayo</h4>
            <div className="badge-curso">{selectedCourse ? selectedCourse.name : "Sin curso seleccionado"}</div>
            <div className="internal-form">
              <div className="form-group">
                <label className="form-label">Título</label>
                <input className="form-input" value={assignTitle} onChange={(e) => setAssignTitle(e.target.value)} placeholder="Ej: Ensayo 1" />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción (opcional)</label>
                <input className="form-input" value={assignDesc} onChange={(e) => setAssignDesc(e.target.value)} placeholder="Instrucciones" />
              </div>
              <div className="form-group">
                <label className="form-label">Materia</label>
                <select className="form-input" value={assignSubject} onChange={(e) => setAssignSubject(e.target.value)}>
                  <option value="matematica">Matemática</option>
                  <option value="historia">Historia</option>
                  <option value="ciencias">Ciencias</option>
                  <option value="lenguaje">Lenguaje</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Cantidad de preguntas</label>
                <input type="number" min={1} className="form-input" value={assignCount} onChange={(e) => setAssignCount(Number(e.target.value || 0))} />
              </div>
              <div className="internal-actions">
                <button type="button" className="btn-primario" onClick={assignEssay} disabled={!canAssign || assigning}>
                  {assigning ? "Asignando…" : "Asignar ensayo"}
                </button>
              </div>
              {selectedCourse && (
                <p className="hint" style={{ marginTop: ".5rem" }}>Alumnos en el curso: <strong>{courseStudents.length}</strong></p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Volver */}
      <div className="internal-actions" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn-volver" onClick={() => (typeof volver === "function" ? volver() : window.history.back())}>Volver</button>
      </div>
    </div>
  );
}
