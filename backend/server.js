const express = require('express');
const cors = require('cors');
const pool = require('./db');
const app = express();

app.use(cors());
app.use(express.json());

// Registro
app.post('/register', async (req, res) => {
  const { email, password, role } = req.body;
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
app.post("/api/questions", async (req, res) => {
  const { question, alternatives, correct_answer, subject } = req.body;
  try {
    await pool.query(
      "INSERT INTO questions (question, alternatives, correct_answer, subject) VALUES ($1, $2, $3, $4)",
      [question, alternatives, correct_answer, subject]
    );
    res.json({ message: "Pregunta agregada" });
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
      "SELECT * FROM questions WHERE subject=$1",
      [subject]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo preguntas" });
  }
});
// Editar pregunta por id
app.put("/api/questions/:id", async (req, res) => {
  const { id } = req.params;
  const { question, alternatives, correct_answer, subject } = req.body;
  try {
    await pool.query(
      "UPDATE questions SET question=$1, alternatives=$2, correct_answer=$3, subject=$4 WHERE id=$5",
      [question, alternatives, correct_answer, subject, id]
    );
    res.json({ message: "Pregunta actualizada" });
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
      "SELECT * FROM student_exams WHERE student_email=$1 ORDER BY created_at ASC",
      [student_email]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo ensayos del alumno" });
  }
});

// Guardar resultado de ensayo
app.post("/api/submit-essay", async (req, res) => {
  const { student_email, subject, correct, total } = req.body;
  try {
    await pool.query(
      "INSERT INTO results (student_email, subject, correct, total) VALUES ($1,$2,$3,$4)",
      [student_email, subject, correct, total]
    );
    res.json({ message: "Ensayo guardado" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Error guardando ensayo" });
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

app.listen(5000, () => console.log('Backend en puerto 5000'));
