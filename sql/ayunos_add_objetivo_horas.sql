USE nutriritmo;

ALTER TABLE ayunos
  ADD COLUMN IF NOT EXISTS objetivo_horas INT NULL AFTER duracion_horas;
