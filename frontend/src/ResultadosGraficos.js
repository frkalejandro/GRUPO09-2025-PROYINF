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
  // Datos
  const [tagStats, setTagStats] = useState([]);      // [{ tag, correct, wrong, total, accuracy }]
  const [timeSeries, setTimeSeries] = useState([]);  // [{ created_at, subject, score, date }]

  // Filtros independientes
  const [materiaFiltroEtiquetas, setMateriaFiltroEtiquetas] = useState("todas");
  const [materiaFiltroSerie, setMateriaFiltroSerie] = useState("todas");
  const materias = ["todas", "matematica", "historia", "ciencias", "lenguaje"];

  // Loaders independientes
  const [loadingTags, setLoadingTags] = useState(true);
  const [loadingSeries, setLoadingSeries] = useState(true);

  // === Fetch para BARRAS por ETIQUETAS (con filtro en backend) ===
  useEffect(() => {
    let cancel = false;
    const fetchTags = async () => {
      if (!user?.email) return;
      setLoadingTags(true);
      try {
        const email = encodeURIComponent(user.email);
        const subjectParam =
          materiaFiltroEtiquetas !== "todas" ? `?subject=${materiaFiltroEtiquetas}` : "";
        const r = await fetch(`http://localhost:5000/api/tag-stats/${email}${subjectParam}`);
        const tags = await r.json();
        if (!cancel) {
          const ordered = Array.isArray(tags)
            ? [...tags].sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
            : [];
          setTagStats(ordered);
        }
      } catch (e) {
        console.error(e);
        if (!cancel) setTagStats([]);
      } finally {
        if (!cancel) setLoadingTags(false);
      }
    };
    fetchTags();
    return () => {
      cancel = true;
    };
  }, [user, materiaFiltroEtiquetas]);

  // === Fetch para SERIE TEMPORAL (una vez; se filtra en cliente) ===
  useEffect(() => {
    let cancel = false;
    const fetchSeries = async () => {
      if (!user?.email) return;
      setLoadingSeries(true);
      try {
        const email = encodeURIComponent(user.email);
        const r = await fetch(`http://localhost:5000/api/score-timeseries/${email}`);
        const series = await r.json();
        if (!cancel) {
          const ts = Array.isArray(series)
            ? series.map((s) => ({
                ...s,
                date: new Date(s.created_at).toLocaleDateString(),
              }))
            : [];
          setTimeSeries(ts);
        }
      } catch (e) {
        console.error(e);
        if (!cancel) setTimeSeries([]);
      } finally {
        if (!cancel) setLoadingSeries(false);
      }
    };
    fetchSeries();
    return () => {
      cancel = true;
    };
  }, [user]);

  // Materias disponibles para la serie (derivadas de datos)
  const materiasDisponibles = useMemo(() => {
    const set = new Set(timeSeries.map((s) => s.subject));
    return ["todas", ...Array.from(set)];
  }, [timeSeries]);

  // Serie filtrada por materia (solo para el LineChart)
  const timeSeriesFiltrada = useMemo(() => {
    if (materiaFiltroSerie === "todas") return timeSeries;
    return timeSeries.filter((s) => s.subject === materiaFiltroSerie);
  }, [timeSeries, materiaFiltroSerie]);

  return (
    <div className="dashboard-container" style={{ alignItems: "stretch" }}>
      <h1 className="dashboard-titulo">Mis Resultados en Gráficos</h1>
      <p className="dashboard-subtitulo">
        Aciertos/errores por etiquetas y evolución del puntaje en el tiempo
      </p>

      {/* --- BLOQUE 1: Barras por etiquetas (agrupadas) --- */}
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

          {/* Selector de materia (independiente del LineChart) */}
          <select
            className="form-select"
            style={{ width: 220 }} // mismo tamaño en ambos filtros
            value={materiaFiltroEtiquetas}
            onChange={(e) => setMateriaFiltroEtiquetas(e.target.value)}
          >
            {materias.map((m) => (
              <option key={m} value={m}>
                {m === "todas"
                  ? "Todas las materias"
                  : m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {loadingTags ? (
          <div style={{ marginTop: "0.5rem" }}>Cargando...</div>
        ) : tagStats.length === 0 ? (
          <div style={{ color: "#666", marginTop: "0.5rem" }}>
            Aún no hay datos por etiquetas.
          </div>
        ) : (
          <div style={{ width: "100%", height: 380, marginTop: "0.5rem" }}>
            <ResponsiveContainer>
              <BarChart
                data={tagStats} // [{ tag, correct, wrong, total, accuracy }]
                barCategoryGap="28%"
                barGap={4}
                margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="tag"
                  interval={0}
                  tick={{ fontSize: 12 }}
                  height={50}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis allowDecimals={false} />
                <Tooltip
                  formatter={(value, name, { payload }) => {
                    const label =
                      name === "correct" ? "Aciertos" : name === "wrong" ? "Errores" : name;
                    const total = payload?.total ?? value;
                    return [`${value} de ${total}`, label];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
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
          Cada par de barras corresponde a una etiqueta (área). Compara rojo (errores) vs
          verde (aciertos).
        </small>
      </div>

      {/* --- BLOQUE 2: Evolución del puntaje en el tiempo --- */}
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

          {/* Selector de materia (independiente de Barras) */}
          <select
            className="form-select"
            style={{ width: 220 }} // mismo tamaño
            value={materiaFiltroSerie}
            onChange={(e) => setMateriaFiltroSerie(e.target.value)}
          >
            {materiasDisponibles.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {loadingSeries ? (
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