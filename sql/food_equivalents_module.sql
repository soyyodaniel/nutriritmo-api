USE nutriritmo;

CREATE TABLE IF NOT EXISTS food_equivalents_catalog (
  id_food INT AUTO_INCREMENT PRIMARY KEY,
  grupo_equivalente VARCHAR(60) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  aliases VARCHAR(255) NULL,
  unidad_base VARCHAR(30) NOT NULL DEFAULT 'g',
  porcion_referencia VARCHAR(80) NOT NULL,
  gramos_base DECIMAL(7,2) NOT NULL,
  calorias_kcal DECIMAL(8,2) NOT NULL,
  proteinas_g DECIMAL(8,2) NOT NULL,
  carbohidratos_g DECIMAL(8,2) NOT NULL,
  lipidos_g DECIMAL(8,2) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_food_equivalents_grupo (grupo_equivalente),
  INDEX idx_food_equivalents_nombre (nombre)
);

INSERT INTO food_equivalents_catalog (
  grupo_equivalente, nombre, aliases, unidad_base, porcion_referencia, gramos_base,
  calorias_kcal, proteinas_g, carbohidratos_g, lipidos_g
)
SELECT * FROM (
  SELECT 'cereal_sin_grasa', 'Tortilla de maiz', 'tortilla maiz,tortilla', 'g', '2 piezas medianas', 60, 128, 3.2, 26.4, 1.6
  UNION ALL SELECT 'cereal_sin_grasa', 'Arroz cocido', 'arroz blanco cocido', 'g', '1/2 taza', 70, 91, 1.8, 20.0, 0.2
  UNION ALL SELECT 'leguminosa', 'Frijoles de olla', 'frijoles cocidos', 'g', '1/2 taza', 90, 114, 7.2, 20.4, 0.5
  UNION ALL SELECT 'fruta', 'Manzana', 'manzana roja,manzana verde', 'g', '1 pieza mediana', 140, 73, 0.4, 19.3, 0.2
  UNION ALL SELECT 'verdura', 'Calabacita cocida', 'calabaza italiana,zucchini', 'g', '1 taza', 180, 31, 2.4, 5.8, 0.6
  UNION ALL SELECT 'aoa_muy_bajo_aporte', 'Pechuga de pollo cocida', 'pollo,pechuga pollo', 'g', '30 g', 30, 50, 9.3, 0.0, 1.1
  UNION ALL SELECT 'aoa_moderado_aporte', 'Huevo entero', 'huevo', 'g', '1 pieza', 50, 72, 6.3, 0.4, 4.8
  UNION ALL SELECT 'leche_semidescremada', 'Leche semidescremada', 'leche light,leche semi', 'ml', '1 taza', 240, 122, 8.0, 12.0, 4.8
  UNION ALL SELECT 'grasa', 'Aguacate', 'aguacate hass', 'g', '1/3 pieza', 50, 80, 1.0, 4.2, 7.4
  UNION ALL SELECT 'aoa_bajo_aporte', 'Queso panela', 'panela,queso', 'g', '40 g', 40, 106, 7.2, 1.2, 7.0
) AS seed
WHERE NOT EXISTS (
  SELECT 1 FROM food_equivalents_catalog existing
  WHERE existing.nombre = seed.nombre
);
