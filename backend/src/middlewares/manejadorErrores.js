module.exports = (err, req, res, next) => {
  console.error(err);

  const status = err.status || 500;
  res.status(status).json({
    ok: false,
    mensaje: status === 500 ? "Error interno del servidor" : err.message,
  });
};