function exito(res, data, status = 200) {
return res.status(status).json({ success: true, data });
}
function error(res, mensaje, status = 400) {
return res.status(status).json({ success: false, error: mensaje });
}
module.exports = { exito, error };