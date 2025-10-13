const express = require('express');
const cors = require('cors');
const pool = require('./db');
const app = express();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

app.use(cors());
app.use(express.json());


// carpeta de archivos subidos
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

// configuración de multer (solo imágenes, máx 5MB)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/png','image/jpeg','image/jpg','image/webp','image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('Solo imágenes'), ok);
  }
});

// Registro
app.post('/register', async (req, res) => {
  let { email, password, role } = req.body;
  email = (email || "").trim().toLowerCase();

  if (!email.includes("@")) {
    return res.status(400).json({ error: "Correo inválido: debe contener '@'." });
  }
  if (!password) {
    return res.status(400).json({ error: "La contraseña es requerida." });
  }

  if (!role || !["profesor", "alumno"].includes(role)) {
    return res.status(400).json({ error: "Rol inválido." });
  }

  try {
    await pool.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
      [email, password, role]
    );
    res.json({ message: 'Usuario registrado', user: { email, role } });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Error al registrar usuario' });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, password, role } = req.body; // ahora esperamos role
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email=$1 AND password=$2 AND role=$3',
      [email, password, role]
    );
    if (result.rows.length > 0) {
      res.json({ message: 'Login correcto', user: result.rows[0] });
    } else {
      // misma respuesta que antes: credenciales inválidas (no revelamos si email existe)
      res.status(401).json({ error: 'Credenciales inválidas' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en login' });
  }
});

// Obtener alumnos
app.get("/api/students", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, email FROM users WHERE role = 'alumno'");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo alumnos" });
  }
});

// Crear una pregunta
// Crear una pregunta (con etiquetas)
function normalizeTags(tagsRaw) {
  if (!tagsRaw) return [];
  if (Array.isArray(tagsRaw)) return tagsRaw.map(t => String(t).trim().toLowerCase()).filter(Boolean);
  return String(tagsRaw)
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);
}

app.post("/api/questions", upload.single("image"), async (req, res) => {
  let { question, alternatives, correct_answer, subject, tags } = req.body;
  try {
    if (typeof alternatives === "string") alternatives = JSON.parse(alternatives);
    const tagsArr = normalizeTags(tags);
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const r = await pool.query(
      `INSERT INTO questions (question, alternatives, correct_answer, subject, image_url, tags)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [question, alternatives, correct_answer, subject, image_url, tagsArr]
    );

    res.json({ message: "Pregunta agregada", question: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Error agregando pregunta" });
  }
});


// Obtener preguntas por materia
app.get("/api/questions/:subject", async (req, res) => {
  const { subject } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM questions WHERE subject=$1 ORDER BY created_at DESC, id DESC",
      [subject]
    );
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo preguntas" });
  }
});

// Editar pregunta por id (con etiquetas)
app.put("/api/questions/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  let { question, alternatives, correct_answer, subject, remove_image, tags } = req.body;

  try {
    if (typeof alternatives === "string") alternatives = JSON.parse(alternatives);
    const tagsArr = normalizeTags(tags);

    // obtener image_url actual
    const curr = await pool.query("SELECT image_url FROM questions WHERE id=$1", [id]);
    const currentUrl = curr.rows[0]?.image_url || null;

    // decidir nueva URL
    let image_url = currentUrl;
    if (req.file) image_url = `/uploads/${req.file.filename}`;
    else if (remove_image === "true") image_url = null;

    const r = await pool.query(
      `UPDATE questions
       SET question=$1, alternatives=$2, correct_answer=$3, subject=$4, image_url=$5, tags=$6
       WHERE id=$7 RETURNING *`,
      [question, alternatives, correct_answer, subject, image_url, tagsArr, id]
    );
    res.json({ message: "Pregunta actualizada", question: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Error actualizando pregunta" });
  }
});

// Eliminar pregunta por id
app.delete("/api/questions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM questions WHERE id=$1", [id]);
    res.json({ message: "Pregunta eliminada" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Error eliminando pregunta" });
  }
});

app.post("/api/exams", async (req, res) => {
  const { student_email, subject, score } = req.body;
  try {
    await pool.query(
      "INSERT INTO student_exams (student_email, subject, score) VALUES ($1, $2, $3)",
      [student_email, subject, score]
    );
    res.json({ message: "Ensayo guardado", score });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Error guardando ensayo" });
  }
});

// Obtener últimos 2 resultados de un alumno en una materia
app.get("/api/exams/:student_email/:subject", async (req, res) => {
  const { student_email, subject } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM student_exams WHERE student_email=$1 AND subject=$2 ORDER BY created_at DESC LIMIT 2",
      [student_email, subject]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo resultados" });
  }
});

app.get("/api/student_exams/:student_email", async (req, res) => {
  const { student_email } = req.params;
  try {

    const result = await pool.query(
      "SELECT * FROM student_exams WHERE LOWER(student_email)=LOWER($1) ORDER BY created_at ASC",
      [student_email]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo ensayos del alumno" });
  }
});

// Historial con correctas/total (todas las materias) desde 'results'
app.get("/api/student-results/:student_email", async (req, res) => {
  const email = (req.params.student_email || "").toLowerCase();
  try {
    const r = await pool.query(
      `SELECT id, subject, correct, total, created_at
       FROM results
       WHERE LOWER(student_email) = $1
       ORDER BY created_at DESC`,
      [email]
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo resultados del alumno" });
  }
});

// Guardar resultado de ensayo (con detalle por pregunta)
app.post("/api/submit-essay", async (req, res) => {
  const { student_email, subject, correct, total, details } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Inserta el resumen general (igual que antes)
    await client.query(
      "INSERT INTO results (student_email, subject, correct, total) VALUES ($1, $2, $3, $4)",
      [student_email, subject, correct, total]
    );

    // Si el frontend envía detalle de preguntas, lo guardamos
    if (Array.isArray(details) && details.length > 0) {
      const insertDetail = `
        INSERT INTO results_detail
        (student_email, question_id, subject, tags, chosen_answer, correct_answer, is_correct)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      for (const d of details) {
        const tagsArr = Array.isArray(d.tags) ? d.tags : [];
        const isCorrect = d.chosen_answer === d.correct_answer;

        await client.query(insertDetail, [
          student_email,
          d.question_id,
          subject,
          tagsArr,
          d.chosen_answer,
          d.correct_answer,
          isCorrect,
        ]);
      }
    }

    await client.query("COMMIT");
    res.json({ message: "Ensayo guardado con detalle" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(400).json({ error: "Error guardando ensayo con detalle" });
  } finally {
    client.release();
  }
});

// Obtener últimos 2 ensayos de una materia para un alumno
app.get("/api/results/:student_email/:subject", async (req, res) => {
  const { student_email, subject } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM results WHERE student_email=$1 AND subject=$2 ORDER BY created_at DESC LIMIT 2",
      [student_email, subject]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo resultados" });
  }
});

app.get("/api/course-results", async (req, res) => {
  try {
    const q = `
      SELECT s.subject,
             COALESCE(round(avg_table.avg_percentage::numeric, 2), 0) as avg_percentage
      FROM (VALUES ('matematica'),('historia'),('ciencias'),('lenguaje')) AS s(subject)
      LEFT JOIN (
        SELECT subject, AVG((correct::float/total)*100) AS avg_percentage
        FROM results
        GROUP BY subject
      ) avg_table ON s.subject = avg_table.subject;
    `;
    const result = await pool.query(q);
    // result.rows -> [{subject: 'matematica', avg_percentage: 73.45}, ...]
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo resultados de curso" });
  }
});


// Buscar alumnos por correo (autocompletar)
app.get("/api/students/search", async (req, res) => {
  const q = (req.query.q || "").trim().toLowerCase();
  if (!q) return res.json([]);
  try {
    const r = await pool.query(
      "SELECT id, email FROM users WHERE role='alumno' AND LOWER(email) ILIKE '%' || $1 || '%' ORDER BY email ASC LIMIT 10",
      [q]
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error buscando alumnos" });
  }
});

// Resumen del desempeño de un alumno (promedios por asignatura y global)
app.get("/api/student-summary/:student_email", async (req, res) => {
  const email = (req.params.student_email || "").toLowerCase();
  try {
    const bySubject = await pool.query(
      `SELECT subject, ROUND(AVG(score)::numeric, 2) AS avg_score, COUNT(*) AS attempts
      FROM student_exams
      WHERE LOWER(student_email) = $1
      GROUP BY subject
      ORDER BY subject`,
      [email]
    );
    const overall = await pool.query(
      `SELECT ROUND(AVG(score)::numeric, 2) AS avg_score, COUNT(*) AS attempts
      FROM student_exams
      WHERE LOWER(student_email) = $1`,
      [email]
    );
    res.json({
      by_subject: bySubject.rows,
      overall: overall.rows[0] || { avg_score: null, attempts: 0 }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo resumen de alumno" });
  }
});

// === NUEVOS ENDPOINTS PARA GRÁFICOS ===


app.get("/api/tag-stats/:student_email", async (req, res) => {
  const email = (req.params.student_email || "").toLowerCase();
  const subject = (req.query.subject || "").toLowerCase(); // "" o una de: matematica,historia,ciencias,lenguaje
  try {
    const q = `
      WITH exploded AS (
        SELECT LOWER(student_email) AS email,
               subject,
               UNNEST(tags) AS tag,
               is_correct
        FROM results_detail
        WHERE LOWER(student_email) = $1
          AND ($2 = '' OR subject = $2)
      )
      SELECT tag,
             SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS correct,
             SUM(CASE WHEN is_correct THEN 0 ELSE 1 END) AS wrong,
             COUNT(*) AS total,
             ROUND(100.0*AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END)::numeric,2) AS accuracy
      FROM exploded
      GROUP BY tag
      ORDER BY tag;
    `;
    const r = await pool.query(q, [email, subject]);
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error obteniendo stats por etiqueta" });
  }
});


// (B) Evolución temporal del rendimiento (línea de tiempo)
app.get("/api/score-timeseries/:student_email", async (req, res) => {
  const email = (req.params.student_email || "").toLowerCase();
  try {
    const r = await pool.query(
      `SELECT created_at, subject, score
       FROM student_exams
       WHERE LOWER(student_email) = $1
       ORDER BY created_at ASC`,
      [email]
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error en timeseries" });
  }
});

// Crear un curso interno
app.post("/api/internal-courses", async (req, res) => {
  const { name, description, owner_email } = req.body;
  if (!name || !owner_email) return res.status(400).json({ error: "Falta name u owner_email" });
  try {
    const r = await pool.query(
      "INSERT INTO courses (name, description, owner_email) VALUES ($1, $2, $3) RETURNING *",
      [name, description || null, owner_email]
    );
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creando curso" });
  }
});

// Listar cursos del profesor (owner_email)
app.get("/api/internal-courses", async (req, res) => {
  const owner = req.query.owner || null;
  try {
    const q = owner
      ? ["SELECT * FROM courses WHERE owner_email = $1 ORDER BY created_at DESC", [owner]]
      : ["SELECT * FROM courses ORDER BY created_at DESC", []];
    const r = await pool.query(q[0], q[1]);
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error listando cursos" });
  }
});

// Importar alumnos (acepta JSON array en body) -> crea course_students
// body: { students: [{student_email, display_name}, ...] }
app.post("/api/internal-courses/:id/import-students", async (req, res) => {
  const courseId = req.params.id;
  const { students } = req.body;
  if (!Array.isArray(students)) return res.status(400).json({ error: "students debe ser array" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const s of students) {
      await client.query(
        "INSERT INTO course_students (course_id, student_email, display_name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        [courseId, s.student_email, s.display_name || null]
      );
      // opcional: crear usuario local si no existe
      await client.query(
        `INSERT INTO users (email, password, role)
         SELECT $1, $2, 'alumno'
         WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = $1)`,
        [s.student_email, "changeme123"] // contraseña temporal — cambia por flujo de invitación
      );
    }
    await client.query("COMMIT");
    res.json({ message: "Alumnos importados" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Error importando alumnos" });
  } finally {
    client.release();
  }
});

// Listar alumnos de un curso interno
app.get("/api/internal-courses/:id/students", async (req, res) => {
  const courseId = req.params.id;
  try {
    const r = await pool.query("SELECT * FROM course_students WHERE course_id=$1 ORDER BY created_at", [courseId]);
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo alumnos" });
  }
});

// Asignar un "ensayo" a un curso con materia y cantidad de preguntas
// body: { title, description, subject, num_questions }
app.post("/api/internal-courses/:id/assign", async (req, res) => {
  const courseId = req.params.id;
  const { title, description, subject, num_questions } = req.body;

  if (!title || !subject || !num_questions) {
    return res.status(400).json({ error: "Faltan campos: title, subject, num_questions" });
  }

  if (!['matematica','historia','ciencias','lenguaje'].includes(String(subject).toLowerCase())) {
    return res.status(400).json({ error: "subject inválido" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ar = await client.query(
      `INSERT INTO course_assignments (course_id, title, description, subject, num_questions)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [courseId, title, description || null, subject.toLowerCase(), Number(num_questions)]
    );
    const assignment = ar.rows[0];

    // Crea una asignación para cada alumno del curso
    const students = await client.query(
      "SELECT student_email FROM course_students WHERE course_id=$1",
      [courseId]
    );

    for (const s of students.rows) {
      await client.query(
        `INSERT INTO student_assignments (assignment_id, student_email, status)
         VALUES ($1, $2, 'pending')`,
        [assignment.id, s.student_email.toLowerCase()]
      );

      // (opcional) crear usuario si no existe ya: lo haces en import-students
    }

    await client.query("COMMIT");
    res.json({ message: "Ensayo asignado al curso", assignment });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Error asignando ensayo" });
  } finally {
    client.release();
  }
});

// Ver asignaciones de un alumno (pendientes o en curso o completadas)
app.get("/api/student-assignments/:student_email", async (req, res) => {
  const email = (req.params.student_email || "").toLowerCase();
  try {
    const r = await pool.query(
      `SELECT sa.id AS student_assignment_id,
              sa.status,
              sa.score, sa.correct, sa.total,
              sa.created_at, sa.started_at, sa.completed_at,
              ca.title, ca.description, ca.subject, ca.num_questions
       FROM student_assignments sa
       JOIN course_assignments ca ON ca.id = sa.assignment_id
       WHERE LOWER(sa.student_email) = $1
       ORDER BY sa.created_at DESC`,
      [email]
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error listando asignaciones" });
  }
});

/// Comenzar SIEMPRE desde cero: reinicia y fija nuevas preguntas
app.post("/api/student-assignments/:id/start", async (req, res) => {
  const saId = req.params.id;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const sa = await client.query(
      `SELECT sa.id, sa.status, sa.student_email, ca.subject, ca.num_questions
       FROM student_assignments sa
       JOIN course_assignments ca ON ca.id = sa.assignment_id
       WHERE sa.id = $1 FOR UPDATE`,
      [saId]
    );
    if (sa.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Asignación no encontrada" });
    }

    const row = sa.rows[0];
    if (row.status === "completed") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "La asignación ya fue completada." });
    }

    // 🔥 Elimina cualquier selección previa para que NO exista reanudar
    await client.query(
      `DELETE FROM assignment_questions WHERE student_assignment_id=$1`,
      [saId]
    );

    // Seleccionar preguntas aleatorias de la materia
    const qq = await client.query(
      `SELECT id FROM questions WHERE subject=$1 ORDER BY random() LIMIT $2`,
      [row.subject, row.num_questions]
    );
    if (qq.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "No hay preguntas en esa materia" });
    }

    // Guardar la nueva selección fija
    for (let i = 0; i < qq.rows.length; i++) {
      await client.query(
        `INSERT INTO assignment_questions (student_assignment_id, question_id, position)
         VALUES ($1,$2,$3)`,
        [saId, qq.rows[i].id, i + 1]
      );
    }

    // Estado 'started' (solo informativo; no habrá reanudación porque no persistimos set previo)
    await client.query(
      `UPDATE student_assignments SET status='started', started_at=NOW() WHERE id=$1`,
      [saId]
    );

    // Retornar las NUEVAS preguntas completas
    const full = await client.query(
      `SELECT aq.position, q.*
       FROM assignment_questions aq
       JOIN questions q ON q.id = aq.question_id
       WHERE aq.student_assignment_id = $1
       ORDER BY aq.position ASC`,
      [saId]
    );

    await client.query("COMMIT");
    res.json({ status: "started", questions: full.rows });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ error: "Error al iniciar asignación" });
  } finally {
    client.release();
  }
});

// Enviar respuestas: { answers: [{question_id, chosen_answer}, ...] }
app.post("/api/student-assignments/:id/submit", async (req, res) => {
  const saId = req.params.id;
  const { answers } = req.body;
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: "answers vacío" });
  }
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Cargar asignación y sus preguntas
    const saQ = await client.query(
      `SELECT sa.id, sa.student_email, sa.status, ca.subject
       FROM student_assignments sa
       JOIN course_assignments ca ON ca.id = sa.assignment_id
       WHERE sa.id=$1 FOR UPDATE`,
      [saId]
    );
    if (saQ.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Asignación no encontrada" });
    }
    const { student_email, status, subject } = saQ.rows[0];

    const qs = await client.query(
      `SELECT aq.question_id, q.correct_answer, q.tags
       FROM assignment_questions aq
       JOIN questions q ON q.id = aq.question_id
       WHERE aq.student_assignment_id = $1`,
      [saId]
    );
    const map = new Map(qs.rows.map(r => [r.question_id, { correct: r.correct_answer, tags: r.tags || [] }]));

    // Corrección
    let correct = 0;
    for (const a of answers) {
      const ref = map.get(a.question_id);
      if (ref && a.chosen_answer === ref.correct) correct++;
    }
    const total = qs.rows.length || answers.length;
    const score = Math.round((correct / total) * 100);

    // Guardar resultados (igual que flujo anterior)
    await client.query(
      "INSERT INTO results (student_email, subject, correct, total) VALUES ($1,$2,$3,$4)",
      [student_email, subject, correct, total]
    );

    // Detalle por pregunta
    const insertDetail = `
      INSERT INTO results_detail
      (student_email, question_id, subject, tags, chosen_answer, correct_answer, is_correct)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `;
    for (const a of answers) {
      const ref = map.get(a.question_id);
      if (!ref) continue;
      await client.query(insertDetail, [
        student_email,
        a.question_id,
        subject,
        ref.tags,
        a.chosen_answer,
        ref.correct,
        a.chosen_answer === ref.correct
      ]);
    }

    // Registro para vistas de profesor/alumno
    await client.query(
      "INSERT INTO student_exams (student_email, subject, score) VALUES ($1,$2,$3)",
      [student_email, subject, score]
    );

    // Cerrar asignación
    await client.query(
      `UPDATE student_assignments
       SET status='completed', completed_at=NOW(), score=$2, correct=$3, total=$4
       WHERE id=$1`,
      [saId, score, correct, total]
    );

    await client.query("COMMIT");
    res.json({ message: "Asignación enviada", correct, total, score });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ error: "Error enviando asignación" });
  } finally {
    client.release();
  }
});

app.post("/api/student-assignments/:id/cancel", async (req, res) => {
  const saId = req.params.id;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const sa = await client.query(
      `SELECT id, status FROM student_assignments WHERE id=$1 FOR UPDATE`,
      [saId]
    );
    if (sa.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Asignación no encontrada" });
    }
    if (sa.rows[0].status === "completed") {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "La asignación ya fue completada, no puede cancelarse." });
    }

    // Elimina las preguntas asociadas a esta sesión
    await client.query(
      `DELETE FROM assignment_questions WHERE student_assignment_id=$1`,
      [saId]
    );

    // Devuelve el estado a 'pending' para poder volver a comenzar desde cero
    await client.query(
      `UPDATE student_assignments
         SET status='pending', started_at=NULL
       WHERE id=$1`,
      [saId]
    );

    await client.query("COMMIT");
    res.json({ message: "Asignación cancelada y reiniciada" });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ error: "Error cancelando la asignación" });
  } finally {
    client.release();
  }
});

app.listen(5000, () => console.log('Backend en puerto 5000'));
