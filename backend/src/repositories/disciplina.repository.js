const pool = require("../config/db"); // debe ser mysql2/promise (const [rows] = await pool.query(...))




async function listarDisciplinas(){
   const [rows] = await pool.query(`
    SELECT BIN_TO_UUID(uuid, 1) AS uuid, nombre FROM disciplina WHERE activo=true
    `);
  return rows;
}


module.exports = {listarDisciplinas}