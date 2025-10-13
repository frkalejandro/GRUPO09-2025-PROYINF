import { useState } from "react";
import AlumnosPage from "./AlumnosPage";
import StudentsList from "./StudentsList";
import BancoPreguntas from "./BancoPreguntas";
import EnsayosAlumno from "./EnsayosAlumno";
import ProgresoAlumno from "./ProgresoAlumno";
import DesempenoAlumno from "./DesempenoAlumno";
import "./App.css";
import ResultadosGraficos from "./ResultadosGraficos";
import InternalClassroom from "./InternalClassroom";


function App() {
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [user, setUser] = useState(null);
  const [pagina, setPagina] = useState("inicio"); // controla la página

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = isRegister
      ? "http://localhost:5000/register"
      : "http://localhost:5000/login";

    const body = isRegister
      ? { email, password, role }
      : { email, password, role };
    if (!role) {
      alert("Selecciona si eres profesor o alumno antes de entrar");
      return;
    }

    // validacion correo con @
    if (!email || !email.includes("@")) {
      alert("Ingresa un correo válido (debe contener @).");
      return;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.user) setUser(data.user);
    else alert(data.message || data.error);
  };

  const logout = () => {
    setUser(null);
    setRole("");
    setEmail("");
    setPassword("");
    setIsRegister(false);
    setPagina("inicio");
  };

  // Control de páginas según estado
  if (pagina === "alumnos")
    return (
      <AlumnosPage
        volver={() => setPagina("inicio")}
        verLista={() => setPagina("listaAlumnos")}
        verDesempeno={() => setPagina("desempeno")}
      />
    );

  if (pagina === "banco") {
    return <BancoPreguntas volver={() => setPagina("inicio")} />;
  }
  if (pagina === "students-list") {
    return <StudentsList volver={() => setPagina("alumnos")} />;
  }
  if (pagina === "ensayo") {
    return <EnsayosAlumno user={user} volver={() => setPagina("inicio")} />;
  }
  if (pagina === "progreso") {
    return <ProgresoAlumno user={user} volver={() => setPagina("inicio")} />;
  }
  if (pagina === "desempeno"){
    return <DesempenoAlumno volver={() => setPagina("inicio")} />;
  }

  if (pagina === "graficos") {
    return <ResultadosGraficos user={user} volver={() => setPagina("inicio")} />;
  }
  if (pagina === "internalClassroom") {
  return <InternalClassroom user={user} volver={() => setPagina("inicio")} />;
  }
  if (user) {
    if (user.role === "profesor") {
      return (
        <div className="dashboard-container">
          <h1 className="dashboard-titulo">Panel del Profesor</h1>
          <p className="dashboard-subtitulo">
            Bienvenido, {user.email || "usuario"}.
          </p>

          <div className="dashboard-botones">
            <button
              className="dashboard-boton"
              onClick={() => setPagina("banco")}
            >
              Banco de Preguntas
            </button>

            <button
              className="dashboard-boton"
              onClick={() => setPagina("alumnos")}
            >
              Alumnos
            </button>

            <button
              className="dashboard-boton"
              onClick={() => setPagina("desempeno")}
            >
              Desempeño de Alumnos
            </button>

            <button 
              className="dashboard-boton"
              onClick={() => setPagina("internalClassroom")}
              >
              Simular Classroom

            </button>

          </div>

          <button className="logout-boton" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      );
    } else {
      return (
        <div className="dashboard-container">
          <h1 className="dashboard-titulo">Panel del Alumno</h1>
          <p className="dashboard-subtitulo">
            Bienvenido, {user.email || "usuario"}.
          </p>
          <div className="dashboard-botones">
            <button
              className="dashboard-boton"
              onClick={() => setPagina("ensayo")}
            >
              Ensayos
            </button>

            <button
              className="dashboard-boton"
              onClick={() => setPagina("progreso")}
            >
              Progreso
            </button>

            <button
              className="dashboard-boton"
              onClick={() => setPagina("graficos")}
            >
              Mis gráficos
            </button>
          </div>
          
          <button className="logout-boton" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      );
    }
  }

  return (
    // Pantalla de inicio (selección de rol y login/registro)
    <div style={{ padding: 20 }}>
      {!role ? (
        <div className="inicio-container">
          <h1 className="inicio-titulo">Bienvenido a la plataforma PAES</h1>
          <p className="inicio-subtitulo">
            Selecciona tu tipo de usuario para continuar:
          </p>

          <div className="inicio-botones">
            <button
              className="boton-seleccion profesor"
              onClick={() => setRole("profesor")}
            >
              Profesor
            </button>

            <button
              className="boton-seleccion alumno"
              onClick={() => setRole("alumno")}
            >
              Alumno
            </button>
          </div>
        </div>
      ) : (
        <form className="login-container" onSubmit={handleSubmit}>
          <h2 className="login-titulo">
            {isRegister ? "Crear cuenta" : "Iniciar sesión"}{" "}
            <span className="login-rol">({role})</span>
          </h2>

          <div className="login-form-group">
            <input
              className="login-input"
              placeholder="Correo electrónico"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="login-form-group">
            <input
              className="login-input"
              placeholder="Contraseña"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="login-boton">
            {isRegister ? "Registrarse" : "Entrar"}
          </button>

          <p
            className="login-toggle"
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? "Ya tengo cuenta" : "Crear nueva cuenta"}
          </p>

          <button
            type="button"
            className="login-volver"
            onClick={() => {
              setRole("");
              setIsRegister(false);
              setEmail("");
              setPassword("");
            }}
          >
            Volver
          </button>
        </form>
      )}
    </div>
  );
}

export default App;
