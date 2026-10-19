require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const pool = require("./config/db");
const manejadorErrores = require("./middlewares/manejadorErrores");

// =====================================================
// ROUTES (descomenta a medida que crees cada archivo)
// =====================================================
const usuariosRoutes = require("./routes/usuarios.routes");
const coachesRoutes = require("./routes/coaches.routes");
const deportistasRoutes = require("./routes/deportistas.routes");
const clubesRoutes      = require("./routes/clubes.routes");
// const clubesRoutes = require("./routes/clubes.routes");
// const deportistasRoutes = require("./routes/deportistas.routes");
// const enfrentamientosRoutes = require("./routes/enfrentamientos.routes");
// const regionesRoutes = require("./routes/regiones.routes");
// const comunasRoutes = require("./routes/comunas.routes");

// =====================================================
// CONFIG
// =====================================================

const app = express();

const PUERTO = process.env.PORT || 4000;
const VERSION = process.env.API_VERSION || "v1";
const SERVIR_FRONTEND = process.env.NODE_ENV === "production";

// =====================================================
// START
// =====================================================

async function iniciar() {
  // Falla rápido si la base de datos no responde
  await pool.query("SELECT 1");
  console.log("Conectado a MySQL");

  // Solo en producción: Next se sirve desde este mismo Express
  let handle = null;

  if (SERVIR_FRONTEND) {
    const next = require("next");
    const nextApp = next({
      dev: false,
      dir: path.resolve(__dirname, "../../frontend"),
    });
    await nextApp.prepare();
    handle = nextApp.getRequestHandler();
  }

  // ===================================================
  // MIDDLEWARES
  // ===================================================

  app.use(
    helmet({
      // Next.js necesita ejecutar scripts generados por el framework
      contentSecurityPolicy: false,
    })
  );

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    })
  );

  app.use(morgan("dev"));
  app.use(express.json());

  // ===================================================
  // API ROUTES
  // ===================================================

   app.use(`/api/${VERSION}/usuarios`, usuariosRoutes);
   app.use(`/api/${VERSION}/coaches`, coachesRoutes);
   app.use(`/api/${VERSION}/deportistas`, deportistasRoutes);
   app.use(`/api/${VERSION}/clubes`,      clubesRoutes);
  // app.use(`/api/${VERSION}/clubes`, clubesRoutes);
  // app.use(`/api/${VERSION}/deportistas`, deportistasRoutes);
  // app.use(`/api/${VERSION}/enfrentamientos`, enfrentamientosRoutes);
  // app.use(`/api/${VERSION}/regiones`, regionesRoutes);
  // app.use(`/api/${VERSION}/comunas`, comunasRoutes);

  // Cualquier /api que no exista responde JSON (no cae en Next)
  app.use("/api", (req, res) => {
    res.status(404).json({ ok: false, mensaje: "Ruta no encontrada" });
  });

  // ===================================================
  // NEXT.JS (solo producción)
  // ===================================================

  if (handle) {
    app.use((req, res) => handle(req, res));
  }

  // ===================================================
  // ERROR HANDLER
  // ===================================================

  app.use(manejadorErrores);

  // ===================================================
  // SERVER
  // ===================================================

  const server = app.listen(PUERTO, "0.0.0.0", () => {
    console.log(`API ejecutándose en puerto ${PUERTO}`);
  });

  // Cierre ordenado
  const cerrar = () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on("SIGINT", cerrar);
  process.on("SIGTERM", cerrar);
}

iniciar().catch((error) => {
  console.error("Error iniciando la aplicación:", error);
  process.exit(1);
});