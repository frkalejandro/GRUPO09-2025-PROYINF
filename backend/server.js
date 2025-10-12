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

app.listen(5000, () => console.log('Backend en puerto 5000'));
