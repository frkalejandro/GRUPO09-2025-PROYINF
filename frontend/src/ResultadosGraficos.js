import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";
import "./App.css";

export default function ResultadosGraficos({ user, volver }) {
  const [tagStats, setTagStats] = useState([]);      // [{tag, correct, wrong, total, accuracy}]
  const [timeSeries, setTimeSeries] = useState([]);  // [{created_at, subject, score}]
  const [loading, setLoading] = useState(true);
  const [materiaFiltro, setMateriaFiltro] = useState("todas"); // filtro simple para la serie temporal
  const materias = ["todas", "matematica", "historia", "ciencias", "lenguaje"];

  useEffect(() => {
    let cancel = false;
    const fetchData = async () => {
        if (!user?.email) return;
        setLoading(true);
        try {
        const email = encodeURIComponent(user.email);
        const subjectParam = materiaFiltro !== "todas" ? `?subject=${materiaFiltro}` : "";
        const tagsRes = await fetch(`http://localhost:5000/api/tag-stats/${email}${subjectParam}`);
        const seriesRes = await fetch(`http://localhost:5000/api/score-timeseries/${email}`);
        const [tags, series] = await Promise.all([tagsRes.json(), seriesRes.json()]);

        if (!cancel) {
            const orderedTags = Array.isArray(tags)
            ? [...tags].sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
            : [];
            const ts = Array.isArray(series)
            ? series.map((s) => ({
                ...s,
                date: new Date(s.created_at).toLocaleDateString(),
                }))
            : [];
            setTagStats(orderedTags);
            setTimeSeries(ts);
        }
        } catch (e) {
        console.error(e);
        } finally {
        if (!cancel) setLoading(false);
        }
    };
    fetchData();
    return () => {
        cancel = true;
    };
  }, [user, materiaFiltro]);

  const materiasDisponibles = useMemo(() => {
    const set = new Set(timeSeries.map((s) => s.subject));
    return ["todas", ...Array.from(set)];
  }, [timeSeries]);

  const timeSeriesFiltrada = useMemo(() => {
    if (materiaFiltro === "todas") return timeSeries;
    return timeSeries.filter((s) => s.subject === materiaFiltro);
  }, [timeSeries, materiaFiltro]);

  return (
    <div className="dashboard-container" style={{ alignItems: "stretch" }}>
      <h1 className="dashboard-titulo">Mis Resultados en Gráficos</h1>
      <p className="dashboard-subtitulo">
        Aciertos/errores por etiquetas y evolución de puntaje en el tiempo
      </p>

      {/* --- BLOQUE 1: Barras por etiquetas --- */}
        <div
        style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 12,
            padding: "1.5rem",
            marginBottom: "2rem",
        }}
        >
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
            }}
            >
            <h3 style={{ marginTop: 0, color: "#0d47a1" }}>
                Aciertos vs Errores por etiqueta
            </h3>

            {/* 🔽 Selector de materia */}
            <select
                className="form-select"
                value={materiaFiltro}
                onChange={(e) => setMateriaFiltro(e.target.value)}
            >
                {materias.map((m) => (
                <option key={m} value={m}>
                    {m === "todas" ? "Todas las materias" : m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
                ))}
            </select>
        </div>

        {loading ? (
            <div>Cargando...</div>
        ) : tagStats.length === 0 ? (
            <div style={{ color: "#666" }}>
            Aún no hay datos por etiquetas.
            </div>
        ) : (
            <div style={{ width: "100%", height: 380 }}>
            <ResponsiveContainer>
                <BarChart
                data={tagStats}               // [{ tag, correct, wrong, total, accuracy }]
                barCategoryGap="28%"          // separación entre grupos
                barGap={4}                    // separación entre barras dentro del mismo grupo
                margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tag" />
                <YAxis allowDecimals={false} />
                <Tooltip
                    formatter={(value, name) =>
                    [value, name === "correct" ? "Aciertos" : name === "wrong" ? "Errores" : name]
                    }
                />
                <Legend
                    formatter={(value) =>
                    value === "correct" ? "Aciertos" : value === "wrong" ? "Errores" : value
                    }
                />
                {/* ❌ Errores */}
                <Bar
                    dataKey="wrong"
                    name="Errores"
                    fill="#dc3545"
                    radius={[4, 4, 0, 0]}
                    barSize={22}
                />
                {/* ✅ Aciertos */}
                <Bar
                    dataKey="correct"
                    name="Aciertos"
                    fill="#28a745"
                    radius={[4, 4, 0, 0]}
                    barSize={22}
                />
                </BarChart>
            </ResponsiveContainer>
            </div>
        )}

        <small style={{ color: "#666" }}>
            Cada par de barras corresponde a una etiqueta (área). Compara rojo (errores) vs verde (aciertos).
        </small>
    </div>

      {/* --- BLOQUE 2: Línea temporal --- */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: 12,
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <h3 style={{ margin: 0, color: "#0d47a1" }}>
            Evolución del puntaje en el tiempo
          </h3>

          {/* Filtro simple por materia */}
          <div>
            <select
              className="form-select"
              value={materiaFiltro}
              onChange={(e) => setMateriaFiltro(e.target.value)}
            >
              {materiasDisponibles.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ marginTop: "1rem" }}>Cargando...</div>
        ) : timeSeriesFiltrada.length === 0 ? (
          <div style={{ color: "#666", marginTop: "0.5rem" }}>
            No hay ensayos registrados aún para este filtro.
          </div>
        ) : (
          <div style={{ width: "100%", height: 360, marginTop: "0.5rem" }}>
            <ResponsiveContainer>
              <LineChart data={timeSeriesFiltrada}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" name="Puntaje (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <small style={{ color: "#666" }}>
          Cada punto es un ensayo. Usa el filtro para ver una materia específica.
        </small>
      </div>

      <div className="alumnos-volver-container">
        <button className="alumnos-boton-volver" onClick={volver}>
          Volver
        </button>
      </div>
    </div>
  );
}
