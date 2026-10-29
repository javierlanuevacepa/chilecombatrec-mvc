import Link from "next/link";

/* Cambia esta ruta cuando exista la pantalla de login real. */
const LOGIN_HREF = "backoffice/login";

const features = [
  {
    title: "Perfil del club",
    text: "Nombre, teléfono y foto del equipo, siempre al día para que otras escuelas puedan contactarte.",
  },
  {
    title: "Coaches",
    text: "Registra a cada coach con su especialidad, correo y teléfono, y asígnale sus estudiantes.",
  },
  {
    title: "Fichas de estudiantes",
    text: "RUT, categoría de peso, disciplina, coach asignado y récord de victorias, derrotas y empates en un solo lugar.",
  },
  {
    title: "Buscador de rivales",
    text: "Sugiere peleadores de otras escuelas en la misma disciplina y con una cantidad de combates parecida. El teléfono de la escuela queda a un toque.",
  },
];

const steps = [
  {
    title: "El administrador registra el club",
    text: "Carga los datos del equipo y da de alta a los coaches.",
  },
  {
    title: "Cada coach carga a sus estudiantes",
    text: "Agrega su récord, su categoría de peso y su disciplina.",
  },
  {
    title: "Encuentra rival para el próximo combate",
    text: "Abre la ficha del estudiante y pulsa Encontrar rival.",
  },
];

const roles = [
  {
    title: "Administrador",
    text: "Tiene la vista completa del club.",
    items: [
      "Edita los datos y la foto del equipo",
      "Agrega, edita y elimina coaches",
      "Gestiona a todos los estudiantes del club",
    ],
  },
  {
    title: "Coach",
    text: "Trabaja con su propio grupo de estudiantes.",
    items: [
      "Registra y actualiza a sus estudiantes",
      "Consulta el récord de cada uno",
      "Busca rivales en otras escuelas",
    ],
  },
];

const disciplines = ["MMA", "Boxeo", "Kickboxing", "Muay Thai"];

/* Datos de ejemplo tomados de los datos de prueba de la app. */
const sampleRivals = [
  {
    name: "Diego Vargas",
    school: "Gimnasio Andes MMA",
    weight: "-71 kg",
    record: "14-5-1",
    phone: "+56 9 5555 1212",
  },
  {
    name: "Matías Contreras",
    school: "Combate Norte",
    weight: "-70 kg",
    record: "10-3-1",
    phone: "+56 9 8765 4321",
  },
];

export default function Home() {
  return (
    <>
      <header className="lp-header">
        <div className="lp-container lp-header-inner">
          <Link href="/" className="lp-wordmark" aria-label="ChileCombatREC, inicio">
            ChileCombat<span>Rec</span>
          </Link>
          <nav className="lp-nav" aria-label="Principal">
            <div className="lp-nav-links">
              <a href="#funciones">Funciones</a>
              <a href="#como-funciona">Cómo funciona</a>
              <a href="#perfiles">Perfiles</a>
            </div>
            <Link href={LOGIN_HREF} className="lp-btn lp-btn-primary lp-btn-sm">
              Ingresar
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-container lp-hero-grid">
            <div>
              <h1 className="lp-display">El registro de combates de tu club, en un solo lugar</h1>
              <p className="lp-hero-lead">
                Administra coaches y estudiantes, lleva el récord de cada peleador y encuentra rivales de
                otras escuelas según su disciplina y su experiencia.
              </p>
              <div className="lp-hero-actions">
                <Link href={LOGIN_HREF} className="lp-btn lp-btn-primary">
                  Ingresar al sistema
                </Link>
                <a href="#como-funciona" className="lp-btn lp-btn-ghost">
                  Ver cómo funciona
                </a>
              </div>
            </div>

            <figure className="lp-sheet">
              <div className="lp-sheet-inner">
                <div className="lp-sheet-head">
                  <div className="lp-avatar" aria-hidden="true">
                    IP
                  </div>
                  <div>
                    <p className="lp-sheet-name">Ignacio Pizarro</p>
                    <p className="lp-sheet-meta">
                      <span className="lp-badge">MMA</span>
                      <span>-70 kg</span>
                      <span>Team Fénix MMA</span>
                    </p>
                  </div>
                </div>

                <dl className="lp-record lp-mono">
                  <div>
                    <dt>Victorias</dt>
                    <dd className="is-wins">12</dd>
                  </div>
                  <div>
                    <dt>Derrotas</dt>
                    <dd>2</dd>
                  </div>
                  <div>
                    <dt>Empates</dt>
                    <dd>0</dd>
                  </div>
                </dl>

                <p className="lp-rivals-title">Rivales sugeridos en MMA</p>
                <ul>
                  {sampleRivals.map((r) => (
                    <li key={r.name} className="lp-rival">
                      <div>
                        <p>{r.name}</p>
                        <p className="lp-rival-school">{r.school}</p>
                        <p className="lp-rival-school lp-mono">{r.phone}</p>
                      </div>
                      <div className="lp-rival-stats">
                        <p className="lp-mono">{r.record}</p>
                        <p className="lp-rival-weight">{r.weight}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <figcaption className="lp-sheet-note">Ficha de ejemplo con datos ficticios.</figcaption>
              </div>
            </figure>
          </div>
        </section>

        <section id="funciones" className="lp-section">
          <div className="lp-container lp-features">
            <div>
              <h2 className="lp-display">Todo el club, ordenado</h2>
              <p className="lp-section-intro">
                Lo que necesita un equipo de deportes de combate para dejar las planillas y los mensajes
                sueltos.
              </p>
            </div>
            <div className="lp-feature-list">
              {features.map((f) => (
                <article key={f.title} className="lp-feature">
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="lp-section">
          <div className="lp-container">
            <h2 className="lp-display">De la ficha al próximo combate</h2>
            <ol className="lp-steps">
              {steps.map((s, i) => (
                <li key={s.title} className="lp-step">
                  <p className="lp-step-num lp-mono">Paso {i + 1}</p>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="perfiles" className="lp-section">
          <div className="lp-container">
            <h2 className="lp-display">Dos perfiles, cada uno con lo suyo</h2>
            <div className="lp-roles">
              {roles.map((r) => (
                <article key={r.title} className="lp-role">
                  <h3>{r.title}</h3>
                  <p>{r.text}</p>
                  <ul>
                    {r.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <div className="lp-disciplines">
              <h3>Disciplinas disponibles</h3>
              <ul className="lp-discipline-list">
                {disciplines.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="lp-cta">
          <div className="lp-container lp-cta-inner">
            <div>
              <h2 className="lp-display">Ordena el registro de tu club</h2>
              <p>Ingresa con tu correo y tu contraseña como administrador o como coach.</p>
            </div>
            <Link href={LOGIN_HREF} className="lp-btn lp-btn-primary">
              Ingresar al sistema
            </Link>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <span className="lp-wordmark">
            ChileCombat<span>Rec</span>
          </span>
          <span>Seguimiento de registro de combates en Chile</span>
        </div>
      </footer>
    </>
  );
}
