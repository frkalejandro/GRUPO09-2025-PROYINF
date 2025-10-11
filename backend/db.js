// backend/db.js
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

pool.query(`
  -- Usuarios

  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('profesor', 'alumno'))
  );
  CREATE INDEX IF NOT EXISTS idx_users_role_email ON users(role, email);

  -- Banco de preguntas

  CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    alternatives TEXT[] NOT NULL CHECK (cardinality(alternatives) = 4),
    correct_answer TEXT NOT NULL,
    subject TEXT NOT NULL CHECK (subject IN ('matematica','historia','ciencias','lenguaje')),
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_student_exams_email ON student_exams(student_email);
  CREATE INDEX IF NOT EXISTS idx_student_exams_email_subject ON student_exams(student_email, subject);


  -- Ensayos individuales por alumno (vista profesor)

  CREATE TABLE IF NOT EXISTS student_exams (
    id SERIAL PRIMARY KEY,
    student_email TEXT NOT NULL,
    subject TEXT NOT NULL CHECK (subject IN ('matematica','historia','ciencias','lenguaje')),
    score INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );


  -- Resultados resumidos para progreso del alumno (2 últimos por materia)

  CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    student_email TEXT NOT NULL,
    subject TEXT NOT NULL CHECK (subject IN ('matematica','historia','ciencias','lenguaje')),
    correct INTEGER NOT NULL,
    total INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_results_email_subject ON results(student_email, subject);


`);

pool.query(`
  ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS image_url TEXT;
`);


module.exports = pool;
