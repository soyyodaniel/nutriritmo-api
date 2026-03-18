CREATE TABLE IF NOT EXISTS user_nutrition_profiles (
  id_profile INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  sexo ENUM('hombre', 'mujer') NOT NULL,
  peso_actual DECIMAL(6,2) NOT NULL,
  peso_objetivo DECIMAL(6,2) NULL,
  altura INT NOT NULL,
  edad INT NOT NULL,
  nivel_actividad ENUM('sedentario', 'ligero', 'moderado', 'intenso', 'muy_intenso') NOT NULL,
  objetivo ENUM('bajar_grasa', 'mantener', 'subir_masa') NOT NULL,
  calorias_objetivo INT NOT NULL,
  proteinas_objetivo_g DECIMAL(7,2) NOT NULL,
  carbohidratos_objetivo_g DECIMAL(7,2) NOT NULL,
  lipidos_objetivo_g DECIMAL(7,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_nutrition_profiles_usuario (id_usuario),
  CONSTRAINT fk_user_nutrition_profiles_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_entries (
  id_comida INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  tipo_comida ENUM('desayuno', 'colacion', 'comida', 'cena', 'otro') NOT NULL DEFAULT 'otro',
  porciones DECIMAL(7,2) NOT NULL,
  unidad_porcion VARCHAR(30) NOT NULL,
  calorias_kcal DECIMAL(8,2) NOT NULL,
  proteinas_g DECIMAL(8,2) NOT NULL,
  carbohidratos_g DECIMAL(8,2) NOT NULL,
  lipidos_g DECIMAL(8,2) NOT NULL,
  consumido_en DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_meal_entries_usuario_fecha (id_usuario, consumido_en),
  CONSTRAINT fk_meal_entries_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
);
