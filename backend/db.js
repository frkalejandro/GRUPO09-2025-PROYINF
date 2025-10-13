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
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  -- Ensayos individuales por alumno (vista profesor)
  CREATE TABLE IF NOT EXISTS student_exams (
    id SERIAL PRIMARY KEY,
    student_email TEXT NOT NULL,
    subject TEXT NOT NULL CHECK (subject IN ('matematica','historia','ciencias','lenguaje')),
    score INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_student_exams_email ON student_exams(student_email);
  CREATE INDEX IF NOT EXISTS idx_student_exams_email_subject ON student_exams(student_email, subject);

  -- Resultados resumidos para progreso del alumno
  CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    student_email TEXT NOT NULL,
    subject TEXT NOT NULL CHECK (subject IN ('matematica','historia','ciencias','lenguaje')),
    correct INTEGER NOT NULL,
    total INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_results_email_subject ON results(student_email, subject);
  CREATE INDEX IF NOT EXISTS idx_results_email_time ON results(LOWER(student_email), created_at DESC);

  -- Asegurar columna tags en questions
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='questions' AND column_name='tags'
    ) THEN
      ALTER TABLE questions ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;
  END $$;

  -- Tabla de detalle por pregunta respondida
  CREATE TABLE IF NOT EXISTS results_detail (
    id SERIAL PRIMARY KEY,
    student_email TEXT NOT NULL,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    subject TEXT NOT NULL CHECK (subject IN ('matematica','historia','ciencias','lenguaje')),
    tags TEXT[] NOT NULL DEFAULT '{}',
    chosen_answer TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_results_detail_email_time ON results_detail(LOWER(student_email), created_at);
  CREATE INDEX IF NOT EXISTS idx_results_detail_tags ON results_detail USING GIN (tags);

  -- Tabla de cursos internos (simulated classroom)
  CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_email TEXT NOT NULL,  -- profesor que creó el curso (email local)
    classroom_course_id TEXT,   -- NULL hasta que sincronices con Google
    created_at TIMESTAMP DEFAULT NOW()
  );

  -- Tabla de relación curso - alumno (roster interno)
  CREATE TABLE IF NOT EXISTS course_students (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_email TEXT NOT NULL,
    display_name TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_course_students_course ON course_students(course_id);

  -- Tabla de asignaciones publicadas a un curso (ensayo asignado)
  CREATE TABLE IF NOT EXISTS course_assignments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    essay_id INTEGER, -- si tienes un id de ensayo en tu modelo; NULL si no
    title TEXT NOT NULL,
    description TEXT,
    assigned_at TIMESTAMP DEFAULT NOW(),
    classroom_assignment_id TEXT, -- cuando se publique en Classroom real
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_course_assignments_course ON course_assignments(course_id);

  -- Opcional (si aún no existe): campos para integración futura en users
  ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS google_tokens JSONB;
  
  
  -- Extiende course_assignments con materia y cantidad de preguntas
  ALTER TABLE course_assignments
    ADD COLUMN IF NOT EXISTS subject TEXT
      CHECK (subject IN ('matematica','historia','ciencias','lenguaje')),
    ADD COLUMN IF NOT EXISTS num_questions INTEGER;

  -- Nueva tabla: asignaciones por estudiante
  CREATE TABLE IF NOT EXISTS student_assignments (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES course_assignments(id) ON DELETE CASCADE,
    student_email TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending','started','completed')) DEFAULT 'pending',
    score INTEGER,
    correct INTEGER,
    total INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_student_assignments_student ON student_assignments(LOWER(student_email), status);

  -- Preguntas seleccionadas para cada asignación de estudiante (se fijan al comenzar)
  CREATE TABLE IF NOT EXISTS assignment_questions (
    id SERIAL PRIMARY KEY,
    student_assignment_id INTEGER NOT NULL REFERENCES student_assignments(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    UNIQUE (student_assignment_id, question_id),
    UNIQUE (student_assignment_id, position)
  );
  CREATE INDEX IF NOT EXISTS idx_assignment_questions_sa ON assignment_questions(student_assignment_id);
`);


module.exports = pool;
