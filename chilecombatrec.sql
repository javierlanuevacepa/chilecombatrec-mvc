DROP TABLE IF EXISTS enfrentamiento_resultado_p;
DROP TABLE IF EXISTS enfrentamiento_resultado;
DROP TABLE IF EXISTS resultados_posibles;
DROP TABLE IF EXISTS enfrentamiento_participante;
DROP TABLE IF EXISTS enfrentamiento;
DROP TABLE IF EXISTS deportista_record_legacy;
DROP TABLE IF EXISTS deportista_disciplina;
DROP TABLE IF EXISTS deportista_club;
DROP TABLE IF EXISTS deportista;
DROP TABLE IF EXISTS entrenador_disciplina;
DROP TABLE IF EXISTS usuario_entrenador;
DROP TABLE IF EXISTS sede;
DROP TABLE IF EXISTS club_disciplina;
DROP TABLE IF EXISTS club_usuario;
DROP TABLE IF EXISTS comuna;
DROP TABLE IF EXISTS region;
DROP TABLE IF EXISTS club;
DROP TABLE IF EXISTS disciplina;
DROP TABLE IF EXISTS usuario;
DROP TABLE IF EXISTS parametro;
DROP TABLE IF EXISTS tipo_parametro;



CREATE TABLE tipo_parametro (
    uuid BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)) PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en DATETIME,
    activo BOOLEAN NOT NULL DEFAULT true,
    eliminado_en DATETIME
);

CREATE TABLE parametro (
    uuid BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)) PRIMARY KEY,
    tipo_parametro_uuid BINARY(16) NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en DATETIME,
    activo BOOLEAN NOT NULL DEFAULT true,
    eliminado_en DATETIME,
    FOREIGN KEY (tipo_parametro_uuid) REFERENCES tipo_parametro(uuid)
);


INSERT INTO tipo_parametro (codigo, nombre) VALUES
('ROLES', 'Roles de usuario'),
('ESTADO_ENFRENTAMIENTO','Estado de enfrentamiento');

INSERT INTO parametro (tipo_parametro_uuid, codigo, nombre) VALUES
((SELECT uuid FROM tipo_parametro WHERE codigo = 'ROLES'), 'ADMIN', 'Administrador de sistema ChileCombatRec'),
((SELECT uuid FROM tipo_parametro WHERE codigo = 'ROLES'), 'ADMIN_CLUB', 'Administrador de club de combate'),
((SELECT uuid FROM tipo_parametro WHERE codigo = 'ROLES'), 'COACH_CLUB', 'Entrenador de club de combate'),
((SELECT uuid FROM tipo_parametro WHERE codigo = 'ESTADO_ENFRENTAMIENTO'), 'PENDIENTE', 'Pendiente'),
((SELECT uuid FROM tipo_parametro WHERE codigo = 'ESTADO_ENFRENTAMIENTO'), 'CANCELADO', 'Cancelado'),
((SELECT uuid FROM tipo_parametro WHERE codigo = 'ESTADO_ENFRENTAMIENTO'), 'FINALIZADO', 'Finalizado');

CREATE TABLE usuario (
    uuid BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    correo_electronico VARCHAR(100) NOT NULL UNIQUE,
    clave VARCHAR(255),
    rol_uuid BINARY(16) NOT NULL,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en DATETIME,
    activo BOOLEAN NOT NULL DEFAULT true,
    eliminado_en DATETIME,
    FOREIGN KEY (rol_uuid) REFERENCES parametro(uuid)
);

CREATE TABLE disciplina (
    uuid BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en DATETIME,
    activo BOOLEAN NOT NULL DEFAULT true,
    eliminado_en DATETIME
);

INSERT INTO disciplina (nombre)
VALUES ('Boxeo'),('Kickboxing K-1'),('Muay Thai');


CREATE TABLE club (
    uuid BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    url_foto TEXT,
    descripcion VARCHAR(255),
    fecha_fundacion DATE,
    correo_institucional VARCHAR(100),
    telefono VARCHAR(20),
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en DATETIME,
    activo BOOLEAN NOT NULL DEFAULT true,
    eliminado_en DATETIME
);

-- Usuario que administra el club
CREATE TABLE club_usuario (
    club_uuid BINARY(16) NOT NULL,
    usuario_uuid BINARY(16) NOT NULL,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en DATETIME,
    activo BOOLEAN NOT NULL DEFAULT true,
    eliminado_en DATETIME,
    PRIMARY KEY (club_uuid, usuario_uuid),
    FOREIGN KEY (club_uuid) REFERENCES club(uuid),
    FOREIGN KEY (usuario_uuid) REFERENCES usuario(uuid)
);


-- Disciplinas que imparte el club
CREATE TABLE club_disciplina (
    club_uuid BINARY(16) NOT NULL,
    disciplina_uuid BINARY(16) NOT NULL,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en DATETIME,
    activo BOOLEAN NOT NULL DEFAULT true,
    eliminado_en DATETIME,
    PRIMARY KEY (club_uuid, disciplina_uuid),
    FOREIGN KEY (club_uuid) REFERENCES club(uuid),
    FOREIGN KEY (disciplina_uuid) REFERENCES disciplina(uuid)
);

CREATE TABLE region (
    uuid BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en DATETIME,
    activo BOOLEAN NOT NULL DEFAULT true,
    eliminado_en DATETIME
);

INSERT INTO region (nombre) VALUES
('Arica y Parinacota'),
('Tarapacá'),
('Antofagasta'),
('Atacama'),
('Coquimbo'),
('Valparaíso'),
('Metropolitana de Santiago'),
('Libertador General Bernardo O''Higgins'),
('Maule'),
('Ñuble'),
('Biobío'),
('La Araucanía'),
('Los Ríos'),
('Los Lagos'),
('Aysén del General Carlos Ibáñez del Campo'),
('Magallanes y de la Antártica Chilena');

CREATE TABLE comuna (
    uuid BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    region_uuid BINARY(16) NOT NULL,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en DATETIME,
    activo BOOLEAN NOT NULL DEFAULT true,
    eliminado_en DATETIME,
    FOREIGN KEY (region_uuid) REFERENCES region(uuid)
);


INSERT INTO comuna (nombre, region_uuid) VALUES
-- Región de Arica y Parinacota
('Arica', (SELECT uuid FROM region WHERE nombre = 'Arica y Parinacota')),
('Camarones', (SELECT uuid FROM region WHERE nombre = 'Arica y Parinacota')),
('Putre', (SELECT uuid FROM region WHERE nombre = 'Arica y Parinacota')),
('General Lagos', (SELECT uuid FROM region WHERE nombre = 'Arica y Parinacota')),

-- Región de Tarapacá
('Iquique', (SELECT uuid FROM region WHERE nombre = 'Tarapacá')),
('Alto Hospicio', (SELECT uuid FROM region WHERE nombre = 'Tarapacá')),
('Pozo Almonte', (SELECT uuid FROM region WHERE nombre = 'Tarapacá')),
('Camiña', (SELECT uuid FROM region WHERE nombre = 'Tarapacá')),
('Colchane', (SELECT uuid FROM region WHERE nombre = 'Tarapacá')),
('Huara', (SELECT uuid FROM region WHERE nombre = 'Tarapacá')),
('Pica', (SELECT uuid FROM region WHERE nombre = 'Tarapacá')),

-- Región de Antofagasta
('Antofagasta', (SELECT uuid FROM region WHERE nombre = 'Antofagasta')),
('Mejillones', (SELECT uuid FROM region WHERE nombre = 'Antofagasta')),
('Sierra Gorda', (SELECT uuid FROM region WHERE nombre = 'Antofagasta')),
('Taltal', (SELECT uuid FROM region WHERE nombre = 'Antofagasta')),
('Calama', (SELECT uuid FROM region WHERE nombre = 'Antofagasta')),
('Ollagüe', (SELECT uuid FROM region WHERE nombre = 'Antofagasta')),
('San Pedro de Atacama', (SELECT uuid FROM region WHERE nombre = 'Antofagasta')),
('Tocopilla', (SELECT uuid FROM region WHERE nombre = 'Antofagasta')),
('María Elena', (SELECT uuid FROM region WHERE nombre = 'Antofagasta')),

-- Región de Atacama
('Copiapó', (SELECT uuid FROM region WHERE nombre = 'Atacama')),
('Caldera', (SELECT uuid FROM region WHERE nombre = 'Atacama')),
('Tierra Amarilla', (SELECT uuid FROM region WHERE nombre = 'Atacama')),
('Chañaral', (SELECT uuid FROM region WHERE nombre = 'Atacama')),
('Diego de Almagro', (SELECT uuid FROM region WHERE nombre = 'Atacama')),
('Vallenar', (SELECT uuid FROM region WHERE nombre = 'Atacama')),
('Alto del Carmen', (SELECT uuid FROM region WHERE nombre = 'Atacama')),
('Freirina', (SELECT uuid FROM region WHERE nombre = 'Atacama')),
('Huasco', (SELECT uuid FROM region WHERE nombre = 'Atacama')),

-- Región de Coquimbo
('La Serena', (SELECT uuid FROM region WHERE nombre = 'Coquimbo')),
('Coquimbo', (SELECT uuid FROM region WHERE nombre = 'Coquimbo')),
('Andacollo', (SELECT uuid FROM region WHERE nombre = 'Coquimbo')),
('La Higuera', (SELECT uuid FROM region WHERE nombre = 'Coquimbo')),
('Paiguano', (SELECT uuid FROM region WHERE nombre = 'Coquimbo')),
('Vicuña', (SELECT uuid FROM region WHERE nombre = 'Coquimbo')),
('Illapel', (SELECT uuid FROM region WHERE nombre = 'Coquimbo')),
('Canela', (SELECT uuid FROM region WHERE nombre = 'Coquimbo')),
('Los Vilos', (SELECT uuid FROM region WHERE nombre = 'Coquimbo')),
('Salamanca', (SELECT uuid FROM region WHERE nombre = 'Coquimbo')),
('Ovalle', (SELECT uuid FROM region WHERE nombre = 'Coquimbo')),
('Combarbalá', (SELECT uuid FROM region WHERE nombre = 'Coquimbo')),
('Monte Patria', (SELECT uuid FROM region WHERE nombre = 'Coquimbo')),
('Punitaqui', (SELECT uuid FROM region WHERE nombre = 'Coquimbo')),
('Río Hurtado', (SELECT uuid FROM region WHERE nombre = 'Coquimbo')),

-- Región de Valparaíso
('Valparaíso', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Casablanca', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Concón', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Juan Fernández', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Puchuncaví', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Quintero', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Viña del Mar', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Isla de Pascua', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Los Andes', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Calle Larga', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Rinconada', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('San Esteban', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('La Ligua', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Cabildo', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Papudo', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Petorca', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Zapallar', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Quillota', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Calera', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Hijuelas', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('La Cruz', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Nogales', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('San Antonio', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Algarrobo', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Cartagena', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('El Quisco', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('El Tabo', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Santo Domingo', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('San Felipe', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Catemu', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Llaillay', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Panquehue', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Putaendo', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Santa María', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Limache', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Quilpué', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Villa Alemana', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),
('Olmué', (SELECT uuid FROM region WHERE nombre = 'Valparaíso')),

-- Región del Libertador General Bernardo O'Higgins
('Rancagua', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Codegua', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Coinco', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Coltauco', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Doñihue', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Graneros', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Las Cabras', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Machalí', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Malloa', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Mostazal', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Olivar', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Peumo', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Pichidegua', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Quinta de Tilcoco', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Rengo', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Requínoa', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('San Vicente', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Pichilemu', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('La Estrella', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Litueche', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Marchihue', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Navidad', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Paredones', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('San Fernando', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Chépica', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Chimbarongo', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Lolol', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Nancagua', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Palmilla', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Peralillo', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Placilla', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Pumanque', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),
('Santa Cruz', (SELECT uuid FROM region WHERE nombre = 'Libertador General Bernardo O''Higgins')),

-- Región del Maule
('Talca', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Constitución', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Curepto', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Empedrado', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Maule', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Pelarco', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Pencahue', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Río Claro', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('San Clemente', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('San Rafael', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Cauquenes', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Chanco', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Pelluhue', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Curicó', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Hualañé', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Licantén', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Molina', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Rauco', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Romeral', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Sagrada Familia', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Teno', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Vichuquén', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Linares', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Colbún', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Longaví', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Parral', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Retiro', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('San Javier', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Villa Alegre', (SELECT uuid FROM region WHERE nombre = 'Maule')),
('Yerbas Buenas', (SELECT uuid FROM region WHERE nombre = 'Maule')),

-- Región de Ñuble
('Chillán', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('Bulnes', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('Cobquecura', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('Coelemu', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('Coihueco', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('Chillán Viejo', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('El Carmen', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('Ninhue', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('Niquén', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('Pemuco', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('Pinto', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('Portezuelo', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('Quillón', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('Quirihue', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('Ránquil', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('San Carlos', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('San Fabián', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('San Ignacio', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('San Nicolás', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('Treguaco', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),
('Yungay', (SELECT uuid FROM region WHERE nombre = 'Ñuble')),

-- Región del Biobío (comunas restantes, sin las de Ñuble)
('Concepción', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Coronel', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Chiguayante', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Florida', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Hualqui', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Lota', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Penco', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('San Pedro de la Paz', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Santa Juana', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Talcahuano', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Tomé', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Hualpén', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Lebu', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Arauco', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Cañete', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Contulmo', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Curanilahue', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Los Álamos', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Tirúa', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Los Ángeles', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Antuco', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Cabrero', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Laja', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Mulchén', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Nacimiento', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Negrete', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Quilaco', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Quilleco', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('San Rosendo', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Santa Bárbara', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Tucapel', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Yumbel', (SELECT uuid FROM region WHERE nombre = 'Biobío')),
('Alto Biobío', (SELECT uuid FROM region WHERE nombre = 'Biobío')),

-- Región de La Araucanía
('Temuco', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Carahue', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Cunco', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Curarrehue', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Freire', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Galvarino', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Gorbea', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Lautaro', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Loncoche', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Melipeuco', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Nueva Imperial', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Padre Las Casas', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Perquenco', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Pitrufquén', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Pucón', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Saavedra', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Teodoro Schmidt', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Toltén', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Vilcún', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Villarrica', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Cholchol', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Angol', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Collipulli', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Curacautín', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Ercilla', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Lonquimay', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Los Sauces', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Lumaco', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Purén', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Renaico', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Traiguén', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),
('Victoria', (SELECT uuid FROM region WHERE nombre = 'La Araucanía')),

-- Región de Los Ríos
('Valdivia', (SELECT uuid FROM region WHERE nombre = 'Los Ríos')),
('Corral', (SELECT uuid FROM region WHERE nombre = 'Los Ríos')),
('Lanco', (SELECT uuid FROM region WHERE nombre = 'Los Ríos')),
('Los Lagos', (SELECT uuid FROM region WHERE nombre = 'Los Ríos')),
('Máfil', (SELECT uuid FROM region WHERE nombre = 'Los Ríos')),
('Mariquina', (SELECT uuid FROM region WHERE nombre = 'Los Ríos')),
('Paillaco', (SELECT uuid FROM region WHERE nombre = 'Los Ríos')),
('Panguipulli', (SELECT uuid FROM region WHERE nombre = 'Los Ríos')),
('La Unión', (SELECT uuid FROM region WHERE nombre = 'Los Ríos')),
('Futrono', (SELECT uuid FROM region WHERE nombre = 'Los Ríos')),
('Lago Ranco', (SELECT uuid FROM region WHERE nombre = 'Los Ríos')),
('Río Bueno', (SELECT uuid FROM region WHERE nombre = 'Los Ríos')),

-- Región de Los Lagos
('Puerto Montt', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Calbuco', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Cochamó', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Fresia', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Frutillar', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Los Muermos', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Llanquihue', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Maullín', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Puerto Varas', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Castro', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Ancud', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Chonchi', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Curaco de Vélez', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Dalcahue', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Puqueldón', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Queilén', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Quellón', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Quemchi', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Quinchao', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Osorno', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Puerto Octay', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Purranque', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Puyehue', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Río Negro', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('San Juan de la Costa', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('San Pablo', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Chaitén', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Futaleufú', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Hualaihué', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),
('Palena', (SELECT uuid FROM region WHERE nombre = 'Los Lagos')),

-- Región de Aysén del General Carlos Ibáñez del Campo
('Coyhaique', (SELECT uuid FROM region WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo')),
('Lago Verde', (SELECT uuid FROM region WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo')),
('Aysén', (SELECT uuid FROM region WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo')),
('Cisnes', (SELECT uuid FROM region WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo')),
('Guaitecas', (SELECT uuid FROM region WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo')),
('Cochrane', (SELECT uuid FROM region WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo')),
('O''Higgins', (SELECT uuid FROM region WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo')),
('Tortel', (SELECT uuid FROM region WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo')),
('Chile Chico', (SELECT uuid FROM region WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo')),
('Río Ibáñez', (SELECT uuid FROM region WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo')),

-- Región de Magallanes y de la Antártica Chilena
('Punta Arenas', (SELECT uuid FROM region WHERE nombre = 'Magallanes y de la Antártica Chilena')),
('Laguna Blanca', (SELECT uuid FROM region WHERE nombre = 'Magallanes y de la Antártica Chilena')),
('Río Verde', (SELECT uuid FROM region WHERE nombre = 'Magallanes y de la Antártica Chilena')),
('San Gregorio', (SELECT uuid FROM region WHERE nombre = 'Magallanes y de la Antártica Chilena')),
('Cabo de Hornos', (SELECT uuid FROM region WHERE nombre = 'Magallanes y de la Antártica Chilena')),
('Antártica', (SELECT uuid FROM region WHERE nombre = 'Magallanes y de la Antártica Chilena')),
('Porvenir', (SELECT uuid FROM region WHERE nombre = 'Magallanes y de la Antártica Chilena')),
('Primavera', (SELECT uuid FROM region WHERE nombre = 'Magallanes y de la Antártica Chilena')),
('Timaukel', (SELECT uuid FROM region WHERE nombre = 'Magallanes y de la Antártica Chilena')),
('Natales', (SELECT uuid FROM region WHERE nombre = 'Magallanes y de la Antártica Chilena')),
('Torres del Paine', (SELECT uuid FROM region WHERE nombre = 'Magallanes y de la Antártica Chilena')),

-- Región Metropolitana de Santiago
('Santiago', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Cerrillos', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Cerro Navia', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Conchalí', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('El Bosque', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Estación Central', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Huechuraba', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Independencia', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('La Cisterna', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('La Florida', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('La Granja', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('La Pintana', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('La Reina', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Las Condes', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Lo Barnechea', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Lo Espejo', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Lo Prado', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Macul', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Maipú', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Ñuñoa', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Pedro Aguirre Cerda', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Peñalolén', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Providencia', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Pudahuel', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Quilicura', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Quinta Normal', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Recoleta', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Renca', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('San Joaquín', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('San Miguel', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('San Ramón', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Vitacura', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Puente Alto', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Pirque', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('San José de Maipo', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Colina', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Lampa', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Tiltil', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('San Bernardo', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Buin', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Calera de Tango', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Paine', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Melipilla', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Alhué', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Curacaví', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('María Pinto', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('San Pedro', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Talagante', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('El Monte', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Isla de Maipo', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Padre Hurtado', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago')),
('Peñaflor', (SELECT uuid FROM region WHERE nombre = 'Metropolitana de Santiago'));

CREATE TABLE sede (
    uuid BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)) PRIMARY KEY,
    club_uuid BINARY(16) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(255),
    comuna_uuid BINARY(16) NOT NULL,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en DATETIME,
    activo BOOLEAN NOT NULL DEFAULT true,
    eliminado_en DATETIME,
    FOREIGN KEY (club_uuid) REFERENCES club(uuid),
    FOREIGN KEY (comuna_uuid) REFERENCES comuna(uuid)
);

CREATE TABLE usuario_entrenador (
    usuario_uuid BINARY(16) NOT NULL,
    club_uuid BINARY(16) NOT NULL,
    telefono VARCHAR(20),
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en DATETIME,
    activo BOOLEAN NOT NULL DEFAULT true,
    eliminado_en DATETIME,
    PRIMARY KEY (usuario_uuid, club_uuid),
    FOREIGN KEY (usuario_uuid) REFERENCES usuario(uuid),
    FOREIGN KEY (club_uuid) REFERENCES club(uuid)
);

CREATE TABLE entrenador_disciplina (
    usuario_uuid BINARY(16) NOT NULL,
    disciplina_uuid BINARY(16) NOT NULL,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en DATETIME,
    activo BOOLEAN NOT NULL DEFAULT true,
    eliminado_en DATETIME,
    PRIMARY KEY (usuario_uuid, disciplina_uuid),
    FOREIGN KEY (usuario_uuid) REFERENCES usuario(uuid),
    FOREIGN KEY (disciplina_uuid) REFERENCES disciplina(uuid)
);

CREATE TABLE deportista (
    uuid BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)) PRIMARY KEY,
    rut VARCHAR(12),
    digito_verif VARCHAR(1),
    p_nombre VARCHAR(100) NOT NULL,
    s_nombre VARCHAR(100),
    p_apellido VARCHAR(100) NOT NULL,
    s_apellido VARCHAR(100),
    alias VARCHAR(100),
    nacionalidad VARCHAR(100),
    fecha_nacimiento DATE NOT NULL,
    genero VARCHAR(1) NOT NULL,
    peso_en_kg DECIMAL(5,2) NOT NULL,
    estatura_en_cm DECIMAL(5,2),
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en DATETIME,
    activo BOOLEAN NOT NULL DEFAULT true,
    eliminado_en DATETIME
);

-- Esto esta pensado en el caso poco probable de que un deportista cambie de club
CREATE TABLE deportista_club (
    deportista_uuid BINARY(16) NOT NULL,
    club_uuid BINARY(16) NOT NULL,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en DATETIME,
    activo BOOLEAN NOT NULL DEFAULT true,
    eliminado_en DATETIME,
    PRIMARY KEY (deportista_uuid, club_uuid),
    FOREIGN KEY (deportista_uuid) REFERENCES deportista(uuid),
    FOREIGN KEY (club_uuid) REFERENCES club(uuid)
);

CREATE TABLE deportista_disciplina (
    deportista_uuid BINARY(16) NOT NULL,
    disciplina_uuid BINARY(16) NOT NULL,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en DATETIME,
    activo BOOLEAN NOT NULL DEFAULT true,
    eliminado_en DATETIME,
    PRIMARY KEY (deportista_uuid, disciplina_uuid),
    FOREIGN KEY (deportista_uuid) REFERENCES deportista(uuid),
    FOREIGN KEY (disciplina_uuid) REFERENCES disciplina(uuid)
);

-- Record antes de entrar a la plataforma o record sin registrar en plataforma  
CREATE TABLE deportista_record_legacy (
    deportista_uuid BINARY(16) NOT NULL,
    disciplina_uuid BINARY(16) NOT NULL,
    v NUMERIC(10,2) NOT NULL,
    d NUMERIC(10,2) NOT NULL,
    e NUMERIC(10,2) NOT NULL,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en DATETIME,
    activo BOOLEAN NOT NULL DEFAULT true,
    eliminado_en DATETIME,
    PRIMARY KEY (deportista_uuid, disciplina_uuid),
    FOREIGN KEY (deportista_uuid) REFERENCES deportista(uuid),
    FOREIGN KEY (disciplina_uuid) REFERENCES disciplina(uuid)
);


CREATE TABLE resultados_posibles (
  uuid BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)) PRIMARY KEY,
  `desc` VARCHAR(100) NOT NULL,
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_en DATETIME,
  activo BOOLEAN NOT NULL DEFAULT true,
  eliminado_en DATETIME
);

INSERT INTO resultados_posibles (`desc`) VALUES ('Nocaut(KO)');
INSERT INTO resultados_posibles (`desc`) VALUES ('Nocaut Técnico(TKO)');
INSERT INTO resultados_posibles (`desc`) VALUES ('Abandono');
INSERT INTO resultados_posibles (`desc`) VALUES ('Decisión Unánime');
INSERT INTO resultados_posibles (`desc`) VALUES ('Decisión Mayoritaria');
INSERT INTO resultados_posibles (`desc`) VALUES ('Decisión Dividida');
INSERT INTO resultados_posibles (`desc`) VALUES ('Empate Unánime');
INSERT INTO resultados_posibles (`desc`) VALUES ('Empate Mayoritaria');
INSERT INTO resultados_posibles (`desc`) VALUES ('Empate Dividida');
INSERT INTO resultados_posibles (`desc`) VALUES ('Decisión Técnica');
INSERT INTO resultados_posibles (`desc`) VALUES ('Descalificación');
INSERT INTO resultados_posibles (`desc`) VALUES ('Sin resultado');


-- Enfrentamiento que si va a ser registrado en el sistema ChileCombatRec
CREATE TABLE enfrentamiento (
  uuid BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)) PRIMARY KEY,
  uuid_disciplina BINARY(16) NOT NULL,
  fecha_enfrentamiento DATETIME NOT NULL,
  lugar_enfrentamiento VARCHAR(255),
  estado_enfrentamiento BINARY(16) NOT NULL,
  fecha_registro DATETIME NOT NULL,
  modificado_en DATETIME,
  activo BOOLEAN NOT NULL DEFAULT true,
  FOREIGN KEY (uuid_disciplina) REFERENCES disciplina(uuid),
  FOREIGN KEY (estado_enfrentamiento) REFERENCES parametro(uuid)
);


CREATE TABLE enfrentamiento_participante (
  uuid BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)) PRIMARY KEY,
  uuid_enfrentamiento BINARY(16) NOT NULL,
  uuid_club BINARY(16) NOT NULL,
  uuid_participante BINARY(16) NOT NULL,
  fecha_registro DATETIME NOT NULL,
  modificado_en DATETIME,
  activo BOOLEAN NOT NULL DEFAULT true,
  FOREIGN KEY (uuid_enfrentamiento) REFERENCES enfrentamiento(uuid),
  FOREIGN KEY (uuid_club) REFERENCES club(uuid),
  FOREIGN KEY (uuid_participante) REFERENCES deportista(uuid)
);

CREATE TABLE enfrentamiento_resultado (
  uuid BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)) PRIMARY KEY,
  uuid_enfrentamiento BINARY(16) NOT NULL,
  uuid_resultado BINARY(16) NOT NULL,
  fecha_registro DATETIME NOT NULL,
  modificado_en DATETIME,
  activo BOOLEAN NOT NULL DEFAULT true,
  FOREIGN KEY (uuid_enfrentamiento) REFERENCES enfrentamiento(uuid),
  FOREIGN KEY (uuid_resultado) REFERENCES resultados_posibles(uuid)
);

-- Detalle de participante sobre el resultado
CREATE TABLE enfrentamiento_resultado_p (
    uuid BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)) PRIMARY KEY,
    uuid_enfrentamiento BINARY(16) NOT NULL,
    uuid_participante BINARY(16) NOT NULL,
    `desc` ENUM('Ganador','Perdedor','Empate','Sin resultado') NOT NULL,
    fecha_registro DATETIME NOT NULL,
    modificado_en DATETIME,
    activo BOOLEAN NOT NULL DEFAULT true,
    FOREIGN KEY (uuid_enfrentamiento) REFERENCES enfrentamiento(uuid),
    FOREIGN KEY (uuid_participante) REFERENCES deportista(uuid)
);