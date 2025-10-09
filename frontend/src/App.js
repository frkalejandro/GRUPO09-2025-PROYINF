import { useState } from "react";
import AlumnosPage from "./AlumnosPage";
import StudentsList from "./StudentsList";
import BancoPreguntas from "./BancoPreguntas";
import EnsayosAlumno from "./EnsayosAlumno";
import ProgresoAlumno from "./ProgresoAlumno";
import DesempenoAlumno from "./DesempenoAlumno";

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

const body = isRegister ? { email, password, role } : { email, password, role };
if (!role) {
  alert("Selecciona si eres profesor o alumno antes de entrar");
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

  // 🔹 Control de páginas según estado
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
}if (pagina === "progreso") {
  return <ProgresoAlumno user={user} volver={() => setPagina("inicio")} />;
}if (pagina === "desempeno") return <DesempenoAlumno volver={() => setPagina("inicio")} />;


  if (user) {
    if (user.role === "profesor") {
      return (
        <div style={{ padding: 20 }}>
          <h1>Hola soy un profe</h1>
          <button onClick={() => setPagina("banco")}>Banco de preguntas</button>
          <button onClick={() => setPagina("alumnos")}>Alumnos</button>
          <button onClick={() => setPagina("desempeno")}>Desempeño alumnos</button>
          <br />
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      );
    } else {
      return (
        <div style={{ padding: 20 }}>
          <h1>Hola soy alumno</h1>
          <button onClick={() => setPagina("ensayo")}>Ensayos</button>
          <button onClick={() => setPagina("progreso")}>Progreso</button>
          <br />
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      );
    }
  }

  return (
    <div style={{ padding: 20 }}>
      {!role ? (
        <>
          <h2>¿Eres profesor o alumno?</h2>
          <button onClick={() => setRole("profesor")}>Profesor</button>
          <button onClick={() => setRole("alumno")}>Alumno</button>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <h3>{isRegister ? "Crear cuenta" : "Iniciar sesión"} ({role})</h3>
          <input
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          /><br />
          <input
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          /><br />
          <button type="submit">{isRegister ? "Registrarse" : "Entrar"}</button>
          <p
            onClick={() => setIsRegister(!isRegister)}
            style={{ cursor: "pointer", color: "blue" }}
          >
            {isRegister ? "Ya tengo cuenta" : "Crear nueva cuenta"}
          </p>
          <button
  type="button"
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
