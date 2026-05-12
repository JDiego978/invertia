export type TipoActivo = "accion" | "cripto" | "etf" | "inmueble" | "commodity" | "bono";
export type NivelRiesgo = "bajo" | "medio" | "alto" | "conservador" | "moderado" | "agresivo";
export type Tendencia = "alcista" | "bajista" | "lateral";
export type NivelConfianza = "ALTA_CONVICCION" | "MODERADA" | "BAJA";
export type Consenso = "total" | "mayoria" | "dividido";
export type FaseCiclo = "expansion" | "pico" | "contraccion" | "recuperacion";
export type ModoAnalisis = "rapido" | "profundo";

export interface ParametrosAnalisis {
  pais: string;
  moneda: string;
  tipos: TipoActivo[];
  sectores: string[];
  riesgo: NivelRiesgo;
  horizonte: "corto" | "mediano" | "largo";
  monto?: number;
  modo: ModoAnalisis;
}

export interface DatosTecnicos {
  rsi: number;
  rsi_señal: "sobrecomprado" | "sobrevendido" | "neutral";
  macd_señal: "alcista" | "bajista";
  bb_posicion: "superior" | "inferior" | "media";
  golden_cross: boolean;
  interpretacion: string;
}

export interface DatosCuantitativos {
  sharpe: number;
  var_95: number;
  volatilidad_anual: number;
  interpretacion: string;
}

export interface DatosFundamentales {
  per?: number;
  per_vs_sector?: "barato" | "justo" | "caro";
  peg?: number;
  pb?: number;
  roe_pct?: number;
  fcf_positivo?: boolean;
  deuda_equity?: number;
  crecimiento_ingresos_pct?: number;
  dcf_señal?: string;
  score_fundamental?: number;
  interpretacion: string;
}

export interface DatosSentimiento {
  score_noticias: number;
  score_reddit: number;
  google_trend_score: number;
  alerta_hype: boolean;
  divergencia: "sostenible" | "hype_riesgo" | "oportunidad_panico" | "neutral";
  fear_greed_index?: number;
  fear_greed_label?: string;
}

export interface DatosInstitucional {
  insider_signal: "compra_fuerte" | "compra_leve" | "neutral" | "venta_leve" | "venta_fuerte";
  ratio_compra_venta: number;
  fondos_top: string[];
  cambio_ownership_pct: number;
}

export interface DatosOpciones {
  pcr: number;
  pcr_señal: "alcista" | "bajista" | "neutral";
  iv_percentil?: number;
  iv_señal?: string;
  dinero_inteligente: "alcista" | "bajista" | "neutral";
}

export interface DatosBacktest {
  win_rate_pct: number;
  sharpe_backtest: number;
  max_drawdown_pct: number;
  señal_validada: boolean;
}

export interface DatosKelly {
  porcentaje_recomendado: number;
  monto_usd?: number;
  monto_local?: string;
  advertencia?: string;
}

export interface EventoFuturo {
  fecha: string;
  evento: string;
  impacto: "alto" | "medio" | "bajo";
  dias_restantes: number;
  direccion_historica?: string;
}

export interface Oportunidad {
  nombre: string;
  ticker: string;
  tipo: TipoActivo;
  riesgo: NivelRiesgo;
  tendencia: Tendencia;
  puntuacion_final: number;
  nivel_confianza: NivelConfianza;
  consenso_agentes: Consenso;
  señales_contradictorias: string[];
  resumen: string;
  detalle?: string;
  por_que_ahora: string;
  agente_riesgo: string;
  agente_retorno: string;
  agente_regimen: string;
  tecnico: DatosTecnicos;
  cuantitativo: DatosCuantitativos;
  fundamental: DatosFundamentales;
  sentimiento: DatosSentimiento;
  institucional: DatosInstitucional;
  opciones: DatosOpciones;
  backtest: DatosBacktest;
  kelly: DatosKelly;
  eventos_futuros: EventoFuturo[];
  horizonte_recomendado: "corto" | "mediano" | "largo";
  porcentaje_portafolio_sugerido: string;
  pros: string[];
  contras: string[];
}

export interface SectorInfo {
  sector: string;
  emoji: string;
  mejor_activo: string;
  razon_lider: string;
  puntuacion_sector: number;
  tendencia_sector: Tendencia;
  otros_destacados: string[];
  riesgo_sector: NivelRiesgo;
}

export interface AppInversion {
  nombre: string;
  emoji: string;
  disponible_en: string[];
  activos: string[];
  comisiones: string;
  minimo: string;
  mejor_para: string;
  regulacion: string;
  puntuacion: number;
  pros: string[];
  contras: string[];
}

export interface CicloEconomico {
  fase: FaseCiclo;
  sectores_favorecidos: string[];
  sectores_desfavorecidos: string[];
}

export interface ResultadoAnalisis {
  resumen_mercado: string;
  alerta_macro?: string;
  ciclo_economico: CicloEconomico;
  oportunidades: Oportunidad[];
  por_sector: SectorInfo[];
  apps_recomendadas: AppInversion[];
  timestamp: string;
  parametros: ParametrosAnalisis;
  macro?: DatosMacro;
}

export interface DatosMacro {
  tasa_10y: number;
  inflacion: number;
  desempleo: number;
  gdp_growth: number;
  curva_rendimientos: number;
}

// Portafolio
export interface EntradaPortafolio {
  id: string;
  activo: string;
  ticker: string;
  tipo: TipoActivo;
  cantidad: number;
  precio_compra: number;
  moneda_compra: string;
  fecha: string;
  exchange?: string;
  notas?: string;
}

export interface ResumenPortafolio extends EntradaPortafolio {
  precio_actual?: number;
  valor_actual?: number;
  ganancia_perdida?: number;
  ganancia_pct?: number;
}

// Predicciones
export interface Prediccion {
  id: string;
  fecha_prediccion: string;
  ticker: string;
  tipo: TipoActivo;
  nombre: string;
  precio_al_predecir: number;
  prediccion_direccion: "alcista" | "bajista" | "neutral";
  puntuacion_sistema: number;
  nivel_confianza: string;
  precio_a_7_dias?: number;
  precio_a_30_dias?: number;
  resultado_7d?: "correcto" | "incorrecto" | "neutral";
  resultado_30d?: "correcto" | "incorrecto" | "neutral";
  ganancia_perdida_pct_7d?: number;
  ganancia_perdida_pct_30d?: number;
  fecha_verificacion_7d?: string;
  fecha_verificacion_30d?: string;
}

// Alertas
export interface Alerta {
  id: string;
  ticker: string;
  tipo: "rsi_bajo" | "rsi_alto" | "precio_sube" | "precio_baja" | "fear_greed";
  valor: number;
  activa: boolean;
  creada: string;
  disparada?: string;
}
