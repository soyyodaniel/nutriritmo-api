"use strict";

const ACTIVITY_FACTORS = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  muy_intenso: 1.9,
};

const GOAL_CALORIE_ADJUSTMENTS = {
  bajar_grasa: -400,
  mantener: 0,
  subir_masa: 250,
};

function roundTo(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getWeightForProtein(profile) {
  if (profile.objetivo === "bajar_grasa" && profile.peso_objetivo) {
    return Math.min(Number(profile.peso_actual), Number(profile.peso_objetivo));
  }

  return Number(profile.peso_actual);
}

function calculateNutritionTargets(profile) {
  const pesoActual = Number(profile.peso_actual);
  const altura = Number(profile.altura);
  const edad = Number(profile.edad);
  const actividad = profile.nivel_actividad;
  const objetivo = profile.objetivo;

  const factorActividad = ACTIVITY_FACTORS[actividad];
  const ajusteObjetivo = GOAL_CALORIE_ADJUSTMENTS[objetivo];

  if (!factorActividad && factorActividad !== 0) {
    throw new Error("nivel_actividad inválido");
  }

  if (ajusteObjetivo === undefined) {
    throw new Error("objetivo inválido");
  }

  const tmb =
    profile.sexo === "mujer"
      ? 10 * pesoActual + 6.25 * altura - 5 * edad - 161
      : 10 * pesoActual + 6.25 * altura - 5 * edad + 5;

  const tdee = tmb * factorActividad;
  const caloriasObjetivo = Math.max(1200, roundTo(tdee + ajusteObjetivo));

  const pesoBaseProteina = getWeightForProtein(profile);
  const proteinasObjetivoG = roundTo(pesoBaseProteina * 1.8, 1);
  const lipidosObjetivoG = roundTo(pesoActual * 0.8, 1);

  const caloriasProteina = proteinasObjetivoG * 4;
  const caloriasLipidos = lipidosObjetivoG * 9;
  const caloriasRestantes = Math.max(caloriasObjetivo - caloriasProteina - caloriasLipidos, 0);
  const carbohidratosObjetivoG = roundTo(caloriasRestantes / 4, 1);

  return {
    tmb: roundTo(tmb),
    tdee: roundTo(tdee),
    calorias_objetivo: caloriasObjetivo,
    proteinas_objetivo_g: proteinasObjetivoG,
    carbohidratos_objetivo_g: carbohidratosObjetivoG,
    lipidos_objetivo_g: lipidosObjetivoG,
    factor_actividad: factorActividad,
    ajuste_objetivo_kcal: ajusteObjetivo,
  };
}

module.exports = {
  ACTIVITY_FACTORS,
  GOAL_CALORIE_ADJUSTMENTS,
  calculateNutritionTargets,
};
