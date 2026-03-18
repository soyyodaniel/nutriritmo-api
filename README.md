# nutriritmo-backend

Backend API para NutriRitmo con Node.js, Express y MySQL.

## Ejecutar

```bash
npm install
npm run dev
```

Servidor por defecto: `http://localhost:3000`

## Base URL para Android

- Emulador Android Studio: `http://10.0.2.2:3000/api/`
- Celular fÃ­sico: `http://TU_IP_LOCAL:3000/api/`

## Health checks

- `GET /`
- `GET /ping`

## Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

`/me` requiere:

```http
Authorization: Bearer <token>
```

## Ayunos

- `GET /api/ayunos/:idUsuario`
- `POST /api/ayunos/iniciar`
- `POST /api/ayunos/detener`

Todos requieren token JWT.

## Perfil metabÃ³lico y metas

- `POST /api/metabolism/calculate`
  Calcula calorÃ­as y macros sin guardar.
- `POST /api/metabolism/profile`
  Guarda el perfil metabÃ³lico y las metas diarias.
- `GET /api/metabolism/targets`
  Recupera metas ya guardadas.

Body para `calculate` o `profile`:

```json
{
  "sexo": "hombre",
  "peso_actual": 92.5,
  "peso_objetivo": 80,
  "altura": 175,
  "edad": 28,
  "nivel_actividad": "moderado",
  "objetivo": "bajar_grasa"
}
```

Reglas:

- FÃ³rmula usada: Mifflin-St Jeor
- ProteÃ­na: `1.8 g/kg`
- LÃ­pidos: `0.8 g/kg`
- HCO: calorÃ­as restantes

## Registro de comidas

- `POST /api/meals`
- `GET /api/meals/today`

Body ejemplo para `POST /api/meals`:

```json
{
  "nombre": "Pechuga de pollo con arroz",
  "tipo_comida": "comida",
  "porciones": 1.5,
  "unidad_porcion": "plato",
  "calorias_kcal": 540,
  "proteinas_g": 42,
  "carbohidratos_g": 48,
  "lipidos_g": 15,
  "consumido_en": "2026-03-16T14:30:00"
}
```

`GET /api/meals/today` acepta opcional:

- `?date=2026-03-16`

## Resumen diario

- `GET /api/nutrition/today-summary`

Devuelve:

- objetivo diario
- consumido hoy
- restante del dÃ­a

TambiÃ©n acepta opcional:

- `?date=2026-03-16`

## Orden recomendado de integraciÃ³n

1. Login y guardado de token.
2. `POST /api/metabolism/profile` para configurar metas.
3. `GET /api/metabolism/targets` al abrir dashboard.
4. `POST /api/meals` al registrar comida.
5. `GET /api/nutrition/today-summary` para pintar progreso diario.

## SQL requerido

Antes de usar el mÃ³dulo nutricional, ejecuta:

`sql/nutrition_module.sql`

Ese script crea:

- `user_nutrition_profiles`
- `meal_entries`

## Catálogo de equivalentes y alimentos

- `GET /api/foods/search?q=tortilla`
- `GET /api/foods/:id/estimate?grams=75`
- `POST /api/foods/register`

Estos endpoints permiten trabajar con un catálogo base de alimentos usando gramos o mililitros y calcular automáticamente:

- calorías
- proteína
- carbohidratos
- lípidos

Body ejemplo para `POST /api/foods/register`:

```json
{
  "food_id": 1,
  "grams": 90,
  "tipo_comida": "comida",
  "nombre_personalizado": "Tortilla de maíz",
  "consumido_en": "2026-03-18T14:20:00"
}
```

## SQL adicional

Para habilitar el catálogo de equivalentes ejecuta también:

`sql/food_equivalents_module.sql`
