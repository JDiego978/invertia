# InvertIA — Instrucciones de instalación y uso

## Requisitos previos
- Node.js 18+ (para el frontend Next.js)
- Python 3.10+ (para el backend FastAPI)
- Git (opcional)

---

## 1. Configurar API keys (gratuitas)

Edita el archivo `.env.local` con tus claves:

```
ANTHROPIC_API_KEY=sk-ant-...      # anthropic.com (OBLIGATORIA)
FINNHUB_API_KEY=...               # finnhub.io → Sign Up → API Keys (gratis)
FRED_API_KEY=...                  # fred.stlouisfed.org → My Account → API Keys (gratis)
COINGECKO_API_KEY=...             # coingecko.com → Developers → Demo API Key (gratis)
REDDIT_CLIENT_ID=...              # reddit.com/prefs/apps → Create App → "script" type
REDDIT_CLIENT_SECRET=...          # mismo panel de Reddit
EXCHANGE_RATE_API_KEY=...         # exchangerate-api.com → Free Plan (1500/mes gratis)
```

> **Nota:** La app funciona SIN las claves opcionales usando datos estimados. Solo ANTHROPIC_API_KEY es obligatoria.

---

## 2. Instalar dependencias del frontend

```bash
npm install
```

---

## 3. Instalar dependencias del backend Python

```bash
cd services
pip install -r requirements.txt
```

> **Primera ejecución:** FinBERT descarga ~440MB automáticamente. Esto ocurre una sola vez.

---

## 4. Iniciar el backend Python

Desde la carpeta raíz del proyecto:

```bash
cd services
uvicorn data_engine:app --reload --port 8000
```

Verifica que esté corriendo en: http://localhost:8000/health

---

## 5. Iniciar el frontend Next.js

En otra terminal, desde la carpeta raíz:

```bash
npm run dev
```

Abre: **http://localhost:3000**

---

## Modo sin backend Python

Si no tienes Python instalado o quieres una demo rápida, puedes usar la app **sin el backend Python**. 
Claude generará el análisis solo con su conocimiento. Los datos no serán calculados en tiempo real.

Para esto, simplemente NO inicies el backend Python. La app lo detectará automáticamente.

---

## Estructura del proyecto

```
/
├── app/                    # Páginas Next.js (App Router)
│   ├── page.tsx            # Dashboard / Formulario principal
│   ├── resultados/         # Resultados del análisis
│   ├── historial/          # Historial de análisis guardados
│   ├── portafolio/         # Portafolio + Simulador
│   ├── aprender/           # Guía educativa
│   └── api/analizar/       # Endpoint orquestador (llama Python + Claude)
├── components/             # Componentes React reutilizables
├── lib/                    # Lógica cliente: Claude, IndexedDB, tipos
└── services/
    ├── data_engine.py      # Backend FastAPI con todos los módulos de datos
    └── requirements.txt    # Dependencias Python
```

---

## Disclaimer

⚠️ InvertIA usa datos reales de mercado, modelos matemáticos verificados académicamente e IA para 
generar análisis con fines **exclusivamente informativos**. Precisión máxima documentada: ~65-75%.
**NO constituye asesoría financiera profesional.** Consulta siempre a un asesor certificado antes de invertir.
