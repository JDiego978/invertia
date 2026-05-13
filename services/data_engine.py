"""
InvertIA — Backend de Datos (FastAPI)
Corre con: uvicorn data_engine:app --reload --port 8000
v2.1: RSI sobre precios originales, backtest pandas, sentimiento null
"""

import os
import time
import logging
from datetime import datetime, timedelta
from typing import Optional, List
from functools import lru_cache

import numpy as np
import pandas as pd
import pywt
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv("../.env.local")  # local dev; en Render las vars vienen del dashboard

# Sesión HTTP con headers de navegador para evitar bloqueos de Yahoo Finance en cloud
_yf_session = requests.Session()
_yf_session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
})

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("invertia")

# ─── Claves de entorno ────────────────────────────────────────────────────────
FINNHUB_KEY      = os.getenv("FINNHUB_API_KEY", "")
FRED_KEY         = os.getenv("FRED_API_KEY", "")
COINGECKO_KEY    = os.getenv("COINGECKO_API_KEY", "")
REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID", "")
REDDIT_SECRET    = os.getenv("REDDIT_CLIENT_SECRET", "")
EXCHANGE_KEY     = os.getenv("EXCHANGE_RATE_API_KEY", "")

# ─── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(title="InvertIA Data Engine", version="1.0.0")
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://invertia-sigma.vercel.app",
    # preview deployments de Vercel
    "https://*.vercel.app",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── ETF Proxies ─────────────────────────────────────────────────────────────
ETF_PROXIES = {
    "inmueble":   "VNQ",
    "oro":        "GLD",
    "petroleo":   "USO",
    "commodities":"DJP",
    "bonos":      "BND",
    "commodity":  "DJP",
    "bono":       "BND",
}

# ─── Modelo Pydantic ─────────────────────────────────────────────────────────
class AnalysisParams(BaseModel):
    pais: str = "CO"
    moneda: str = "COP"
    tipos: List[str] = ["accion"]
    sectores: List[str] = []
    riesgo: str = "moderado"
    horizonte: str = "mediano"
    monto: Optional[float] = None
    modo: str = "rapido"

# ─── Módulo A: Wavelet + Indicadores Técnicos ────────────────────────────────
def wavelet_denoise(prices: np.ndarray) -> np.ndarray:
    """Reducción de ruido con Daubechies 4 (arxiv:2408.12408)."""
    try:
        coeffs = pywt.wavedec(prices, "db4", level=3)
        sigma = np.median(np.abs(coeffs[-1])) / 0.6745
        threshold = sigma * np.sqrt(2 * np.log(len(prices)))
        coeffs_d = [pywt.threshold(c, threshold, "soft") for c in coeffs]
        return pywt.waverec(coeffs_d, "db4")[: len(prices)]
    except Exception:
        return prices


def calcular_rsi(prices: pd.Series, period: int = 14) -> pd.Series:
    delta = prices.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def calcular_macd(prices: pd.Series):
    ema12 = prices.ewm(span=12).mean()
    ema26 = prices.ewm(span=26).mean()
    macd = ema12 - ema26
    signal = macd.ewm(span=9).mean()
    return macd, signal


def calcular_bb(prices: pd.Series, window: int = 20):
    sma = prices.rolling(window).mean()
    std = prices.rolling(window).std()
    return sma + 2 * std, sma - 2 * std


def _yf_ticker(ticker: str):
    import yfinance as yf
    t = yf.Ticker(ticker, session=_yf_session)
    return t


def _yf_download(ticker: str, period: str = "1y") -> "pd.DataFrame":
    """Download con reintentos — Yahoo Finance bloquea cloud IPs ocasionalmente."""
    import yfinance as yf
    for attempt in range(3):
        try:
            df = yf.download(ticker, period=period, progress=False,
                             session=_yf_session, auto_adjust=True)
            if not df.empty:
                return df
        except Exception as e:
            logger.warning(f"yf.download {ticker} intento {attempt+1}: {e}")
            time.sleep(2 * (attempt + 1))
    return pd.DataFrame()


def get_stock_data(ticker: str, rf_rate_diaria: float = 0.000173) -> dict:
    try:
        hist = _yf_download(ticker, period="1y")
        if hist.empty:
            return _stock_fallback(ticker)

        # RSI/MACD/BB con precios originales — wavelet distorsiona momentum
        prices_orig = hist["Close"].squeeze()
        rsi_series = calcular_rsi(prices_orig)
        macd_line, macd_signal = calcular_macd(prices_orig)
        bb_upper, bb_lower = calcular_bb(prices_orig)
        sma50  = prices_orig.rolling(50).mean()
        sma200 = prices_orig.rolling(200).mean()

        rsi_val  = float(rsi_series.iloc[-1]) if not np.isnan(rsi_series.iloc[-1]) else 50.0
        # Clamp RSI a rango válido (wavelet puede producir extremos)
        rsi_val  = max(0.0, min(100.0, rsi_val))
        macd_val = float(macd_line.iloc[-1])
        macd_sig = float(macd_signal.iloc[-1])
        bb_u     = float(bb_upper.iloc[-1])
        bb_l     = float(bb_lower.iloc[-1])
        precio   = float(prices_orig.iloc[-1])

        # Métricas cuantitativas (returns sobre precios originales)
        returns = hist["Close"].squeeze().pct_change().dropna()
        sharpe  = float((returns.mean() - rf_rate_diaria) / returns.std() * np.sqrt(252))
        var_95  = float(np.percentile(returns, 5) * 100)
        vol_ann = float(returns.std() * np.sqrt(252) * 100)

        # Fundamentales via Ticker.info (usa _yf_ticker con session)
        stock = _yf_ticker(ticker)
        info = {}
        try:
            info = stock.info or {}
        except Exception:
            pass
        fundamentales = {
            "per":                  info.get("trailingPE"),
            "peg":                  info.get("pegRatio"),
            "pb":                   info.get("priceToBook"),
            "roe":                  info.get("returnOnEquity"),
            "roa":                  info.get("returnOnAssets"),
            "margen_neto":          info.get("profitMargins"),
            "deuda_equity":         info.get("debtToEquity"),
            "fcf":                  info.get("freeCashflow"),
            "crecimiento_ingresos": info.get("revenueGrowth"),
            "precio_actual":        info.get("currentPrice", precio),
            "sector":               info.get("sector", ""),
            "nombre":               info.get("shortName", ticker),
        }

        # Opciones (señal del dinero inteligente)
        pcr, iv_promedio = 1.0, 0.0
        try:
            fechas = stock.options
            if fechas:
                chain = stock.option_chain(fechas[0])
                puts_vol  = chain.puts["volume"].sum()
                calls_vol = chain.calls["volume"].sum()
                pcr = float(puts_vol / calls_vol) if calls_vol > 0 else 1.0
                iv_promedio = float(chain.calls["impliedVolatility"].mean())
        except Exception:
            pass

        return {
            "rsi":             round(rsi_val, 2),
            "rsi_señal":       "sobrecomprado" if rsi_val > 70 else "sobrevendido" if rsi_val < 30 else "neutral",
            "macd_señal":      "alcista" if macd_val > macd_sig else "bajista",
            "bb_posicion":     "superior" if precio > bb_u else "inferior" if precio < bb_l else "media",
            "golden_cross":    bool(sma50.iloc[-1] > sma200.iloc[-1]),
            "sharpe":          round(sharpe, 3),
            "var_95":          round(var_95, 2),
            "volatilidad_anual": round(vol_ann, 2),
            "pcr":             round(pcr, 3),
            "iv_promedio":     round(iv_promedio, 4),
            "precio_actual":   round(precio, 4),
            "fundamental":     fundamentales,
        }
    except Exception as e:
        logger.error(f"Error en get_stock_data({ticker}): {e}")
        return _stock_fallback(ticker)


def _stock_fallback(ticker: str) -> dict:
    return {
        "rsi": 50.0, "rsi_señal": "neutral", "macd_señal": "neutral",
        "bb_posicion": "media", "golden_cross": False,
        "sharpe": 0.0, "var_95": -5.0, "volatilidad_anual": 20.0,
        "pcr": 1.0, "iv_promedio": 0.0, "precio_actual": 0.0,
        "fundamental": {"sector": "", "nombre": ticker},
        "_fuente": "estimado",
    }

# ─── Módulo B: Cripto ─────────────────────────────────────────────────────────
COIN_MAP = {
    "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana",
    "ADA": "cardano", "DOT": "polkadot", "AVAX": "avalanche-2",
    "MATIC": "matic-network", "LINK": "chainlink", "XRP": "ripple",
    "BNB": "binancecoin", "DOGE": "dogecoin", "LTC": "litecoin",
}


def get_crypto_data(coin_id: str, ticker: str) -> dict:
    try:
        url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart"
        params: dict = {"vs_currency": "usd", "days": "365"}
        if COINGECKO_KEY:
            params["x_cg_demo_api_key"] = COINGECKO_KEY
        resp = requests.get(url, params=params, timeout=15)
        prices = [p[1] for p in resp.json().get("prices", [])]
        if not prices:
            return _stock_fallback(ticker)

        prices_clean = wavelet_denoise(np.array(prices))
        df = pd.DataFrame({"Close": prices_clean})
        rsi_series = calcular_rsi(df["Close"])
        rsi_val = float(rsi_series.iloc[-1]) if not np.isnan(rsi_series.iloc[-1]) else 50.0
        macd_line, macd_sig = calcular_macd(df["Close"])
        returns = pd.Series(prices).pct_change().dropna()
        sharpe = float((returns.mean() / returns.std()) * np.sqrt(365)) if returns.std() > 0 else 0.0
        var_95 = float(np.percentile(returns, 5) * 100)
        vol_ann = float(returns.std() * np.sqrt(365) * 100)

        # Fear & Greed Index
        fg = requests.get("https://api.alternative.me/fng/", timeout=5).json()
        fear_greed_value = int(fg["data"][0]["value"])
        fear_greed_label = fg["data"][0]["value_classification"]

        return {
            "rsi":             round(rsi_val, 2),
            "rsi_señal":       "sobrecomprado" if rsi_val > 70 else "sobrevendido" if rsi_val < 30 else "neutral",
            "macd_señal":      "alcista" if float(macd_line.iloc[-1]) > float(macd_sig.iloc[-1]) else "bajista",
            "bb_posicion":     "media",
            "golden_cross":    False,
            "sharpe":          round(sharpe, 3),
            "var_95":          round(var_95, 2),
            "volatilidad_anual": round(vol_ann, 2),
            "pcr":             1.0,
            "iv_promedio":     0.0,
            "precio_actual":   round(prices[-1], 6),
            "fear_greed_index": fear_greed_value,
            "fear_greed_label": fear_greed_label,
            "fundamental": {
                "sector": "Cripto",
                "nombre": ticker,
                "fcf": None, "per": None, "peg": None, "pb": None,
            },
        }
    except Exception as e:
        logger.error(f"Error en get_crypto_data({coin_id}): {e}")
        return _stock_fallback(ticker)

# ─── Módulo D: Macro FRED ────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def get_macro_data_cached(hora: int) -> dict:
    """Cacheo por hora para no saturar FRED."""
    try:
        from fredapi import Fred
        fred = Fred(api_key=FRED_KEY)
        tasa_10y = float(fred.get_series("DGS10").iloc[-1])
        inflacion = float(fred.get_series("CPIAUCSL").pct_change(12).iloc[-1] * 100)
        desempleo = float(fred.get_series("UNRATE").iloc[-1])
        gdp_growth = float(fred.get_series("A191RL1Q225SBEA").iloc[-1])
        curva = float(fred.get_series("T10Y2Y").iloc[-1])
        return {
            "tasa_10y":         round(tasa_10y, 3),
            "rf_rate_diaria":   round(tasa_10y / 100 / 252, 6),
            "inflacion":        round(inflacion, 2),
            "desempleo":        round(desempleo, 2),
            "gdp_growth":       round(gdp_growth, 2),
            "curva_rendimientos": round(curva, 3),
        }
    except Exception as e:
        logger.warning(f"FRED no disponible: {e}")
        return {
            "tasa_10y": 4.3, "rf_rate_diaria": 0.000170,
            "inflacion": 3.1, "desempleo": 4.1,
            "gdp_growth": 2.8, "curva_rendimientos": 0.1,
            "_fuente": "estimado",
        }


def get_macro_data() -> dict:
    return get_macro_data_cached(datetime.now().hour)

# ─── Módulo E: SEC EDGAR Insiders ────────────────────────────────────────────
def get_insider_data(ticker: str) -> dict:
    try:
        headers = {"User-Agent": "InvertIA invertia@example.com"}
        hace_90 = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
        hoy = datetime.now().strftime("%Y-%m-%d")
        url = (
            f"https://efts.sec.gov/LATEST/search-index?q={ticker}"
            f"&dateRange=custom&startdt={hace_90}&enddt={hoy}&forms=4"
        )
        resp = requests.get(url, headers=headers, timeout=10)
        data = resp.json()
        hits = data.get("hits", {}).get("hits", [])

        compras, ventas = 0, 0
        for hit in hits[:30]:
            src = hit.get("_source", {})
            for filing in src.get("period_of_report", []):
                _ = filing  # iterar sobre los datos disponibles
            form_type = src.get("form_type", "")
            if form_type == "4":
                compras += 1

        ratio = compras / max(ventas, 1)
        if ratio >= 3:
            señal = "compra_fuerte"
        elif ratio >= 1.5:
            señal = "compra_leve"
        elif ratio <= 0.5:
            señal = "venta_fuerte"
        elif ratio <= 0.8:
            señal = "venta_leve"
        else:
            señal = "neutral"

        return {
            "insider_signal":        señal,
            "ratio_compra_venta":    round(ratio, 2),
            "fondos_institucionales_top": [],
            "cambio_ownership_pct":  0.0,
        }
    except Exception as e:
        logger.warning(f"Insider data no disponible para {ticker}: {e}")
        return {
            "insider_signal": "neutral", "ratio_compra_venta": 1.0,
            "fondos_institucionales_top": [], "cambio_ownership_pct": 0.0,
            "_fuente": "estimado",
        }

# ─── Módulo G: Noticias Finnhub (sin FinBERT — usa score nativo de Finnhub) ───
def get_news_sentiment(ticker: str) -> dict:
    if not FINNHUB_KEY:
        return {"score_noticias": None, "num_noticias": 0, "earnings_proximos": [], "sentiment_buzz": 0}
    try:
        import finnhub
        fc = finnhub.Client(api_key=FINNHUB_KEY)
        hoy = datetime.now().strftime("%Y-%m-%d")
        hace_7 = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        en_30  = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")

        # Score de sentimiento nativo de Finnhub (bearishPct, bullishPct)
        sentiment_raw = fc.news_sentiment(ticker)
        bull = 0.0
        bear = 0.0
        buzz = 0.0
        if isinstance(sentiment_raw, dict):
            bull = float(sentiment_raw.get("sentiment", {}).get("bullishPercent", 0) or 0)
            bear = float(sentiment_raw.get("sentiment", {}).get("bearishPercent", 0) or 0)
            buzz = float(sentiment_raw.get("buzz", {}).get("buzz", 0) or 0)
        # score_noticias: -100 a +100 (positivo = más bulls que bears)
        score = round((bull - bear) * 100, 1)

        noticias = fc.company_news(ticker, _from=hace_7, to=hoy)
        earnings = fc.earnings_calendar(_from=hoy, to=en_30, symbol=ticker)
        earnings_list = earnings.get("earningsCalendar", []) if isinstance(earnings, dict) else []

        time.sleep(0.3)
        return {
            "score_noticias":    score,
            "num_noticias":      len(noticias),
            "earnings_proximos": earnings_list[:3],
            "sentiment_buzz":    buzz,
        }
    except Exception as e:
        logger.warning(f"Finnhub error para {ticker}: {e}")
        return {"score_noticias": None, "num_noticias": 0, "earnings_proximos": [], "sentiment_buzz": 0}

# ─── Módulo H: Reddit PRAW ───────────────────────────────────────────────────
def get_reddit_sentiment(ticker: str, empresa: str = "") -> dict:
    if not REDDIT_CLIENT_ID:
        return {"score": None, "volumen_menciones": 0, "señal_volumen": "bajo"}
    try:
        import praw
        reddit = praw.Reddit(
            client_id=REDDIT_CLIENT_ID,
            client_secret=REDDIT_SECRET,
            user_agent="InvertIA/1.0 (uso personal)",
        )
        menciones: list = []
        query = f"{ticker} OR {empresa}" if empresa else ticker
        for sub in ["wallstreetbets", "stocks", "investing"]:
            try:
                posts = reddit.subreddit(sub).search(query, time_filter="week", limit=20)
                menciones.extend([p.title for p in posts])
            except Exception:
                continue

        vol = len(menciones)
        if vol == 0:
            return {"score": None, "volumen_menciones": 0, "señal_volumen": "bajo"}

        # Sin FinBERT: score basado en volumen de menciones normalizado (0-100)
        score = min(round(vol * 2.0, 1), 100.0)
        return {
            "score": score,
            "volumen_menciones": vol,
            "señal_volumen": "alto" if vol > 50 else "medio" if vol > 20 else "bajo",
        }
    except Exception as e:
        logger.warning(f"Reddit error: {e}")
        return {"score": None, "volumen_menciones": 0, "señal_volumen": "bajo"}

# ─── Módulo I: Google Trends ─────────────────────────────────────────────────
def get_google_trends(ticker: str) -> dict:
    try:
        from pytrends.request import TrendReq
        pytrends = TrendReq(hl="es-US", tz=360)
        pytrends.build_payload([ticker], timeframe="today 3-m")
        time.sleep(1)
        df = pytrends.interest_over_time()
        if df.empty or ticker not in df.columns:
            return {"score": 50, "tendencia": "neutral", "alerta_hype": False, "divergencia": "neutral"}

        score = int(df[ticker].iloc[-1])
        promedio = df[ticker].mean()
        std = df[ticker].std()
        alerta_hype = bool(score > promedio + 2 * std)
        tendencia = "subiendo" if df[ticker].iloc[-1] > df[ticker].iloc[-4] else "bajando"
        return {
            "score": score,
            "tendencia": tendencia,
            "alerta_hype": alerta_hype,
            "divergencia": "hype_riesgo" if alerta_hype else "sostenible",
        }
    except Exception as e:
        logger.warning(f"Google Trends error para {ticker}: {e}")
        return {"score": 50, "tendencia": "neutral", "alerta_hype": False, "divergencia": "neutral"}

# ─── Módulo J: Conversión moneda ─────────────────────────────────────────────
_fx_cache: dict = {}


def convertir_moneda(monto: float, de: str, a: str = "USD") -> float:
    if de == a:
        return monto
    cache_key = f"{de}-{a}"
    if cache_key in _fx_cache:
        return round(monto * _fx_cache[cache_key], 2)
    try:
        url = f"https://v6.exchangerate-api.com/v6/{EXCHANGE_KEY}/latest/{de}"
        data = requests.get(url, timeout=10).json()
        tasa = data["conversion_rates"][a]
        _fx_cache[cache_key] = tasa
        return round(monto * tasa, 2)
    except Exception:
        tasas_fallback = {
            "COP-USD": 0.000244, "MXN-USD": 0.056, "ARS-USD": 0.00082,
            "CLP-USD": 0.00108, "PEN-USD": 0.265, "BRL-USD": 0.185,
            "EUR-USD": 1.08, "GBP-USD": 1.27, "CAD-USD": 0.73,
        }
        tasa = tasas_fallback.get(f"{de}-{a}", 1.0)
        _fx_cache[cache_key] = tasa
        return round(monto * tasa, 2)

# ─── Módulo K: Backtesting con pandas (RSI mean-reversion) ───────────────────
def backtest_señal(ticker: str) -> dict:
    try:
        stock = _yf_ticker(ticker)
        hist = stock.history(period="2y")
        if hist.empty or len(hist) < 60:
            raise ValueError("datos insuficientes")

        closes = hist["Close"]
        rsi = calcular_rsi(closes)

        # Simular entradas en RSI<30, salidas en RSI>70 o stop 15 días
        trades = []
        in_trade = False
        entry_price = 0.0
        entry_idx = 0

        for i in range(1, len(closes)):
            if not in_trade and rsi.iloc[i] < 30:
                in_trade = True
                entry_price = float(closes.iloc[i])
                entry_idx = i
            elif in_trade:
                dias = i - entry_idx
                exit_now = rsi.iloc[i] > 70 or dias >= 15
                if exit_now:
                    ret = (float(closes.iloc[i]) - entry_price) / entry_price
                    trades.append(ret)
                    in_trade = False

        if len(trades) < 5:
            raise ValueError("pocas señales para backtest")

        wins = [t for t in trades if t > 0]
        win_rate = len(wins) / len(trades)
        avg_ret = float(np.mean(trades))
        std_ret = float(np.std(trades)) or 0.01
        sharpe_bt = round((avg_ret / std_ret) * np.sqrt(252 / 15), 3)

        # Max drawdown sobre retornos acumulados
        cum = np.cumprod([1 + t for t in trades])
        peak = np.maximum.accumulate(cum)
        drawdowns = (cum - peak) / peak
        max_dd = float(np.min(drawdowns)) * 100

        return {
            "win_rate":         round(win_rate, 3),
            "win_rate_pct":     round(win_rate * 100, 1),
            "sharpe":           sharpe_bt,
            "max_drawdown":     round(max_dd / 100, 3),
            "max_drawdown_pct": round(max_dd, 1),
            "retorno_total":    round(float(np.sum(trades)), 3),
            "señal_validada":   win_rate > 0.52,
            "num_trades":       len(trades),
        }
    except Exception as e:
        logger.warning(f"Backtest no disponible para {ticker}: {e}")
        return {
            "win_rate": 0.5, "win_rate_pct": 50.0, "sharpe": 0.0,
            "max_drawdown": 0.0, "max_drawdown_pct": 0.0,
            "retorno_total": 0.0, "señal_validada": False,
            "_fuente": "estimado",
        }

# ─── Módulo L: Kelly Criterion ───────────────────────────────────────────────
def calcular_kelly(win_rate: float, avg_win: float, avg_loss: float) -> float:
    if avg_loss == 0 or avg_win == 0:
        return 0.02
    kelly = (win_rate * avg_win - (1 - win_rate) * avg_loss) / avg_win
    half_kelly = kelly * 0.5
    return min(max(half_kelly, 0.01), 0.10)

# ─── Determinación de activos a analizar ─────────────────────────────────────
ACTIVOS_POR_TIPO = {
    "accion": [
        {"ticker": "AAPL",  "nombre": "Apple",        "tipo": "accion", "sector": "Tecnología"},
        {"ticker": "NVDA",  "nombre": "NVIDIA",        "tipo": "accion", "sector": "Tecnología"},
        {"ticker": "MSFT",  "nombre": "Microsoft",     "tipo": "accion", "sector": "Tecnología"},
        {"ticker": "AMZN",  "nombre": "Amazon",        "tipo": "accion", "sector": "Consumo"},
        {"ticker": "META",  "nombre": "Meta",          "tipo": "accion", "sector": "Tecnología"},
        {"ticker": "TSLA",  "nombre": "Tesla",         "tipo": "accion", "sector": "Automotriz"},
        {"ticker": "GOOGL", "nombre": "Alphabet",      "tipo": "accion", "sector": "Tecnología"},
        {"ticker": "JPM",   "nombre": "JPMorgan",      "tipo": "accion", "sector": "Finanzas"},
        {"ticker": "JNJ",   "nombre": "J&J",           "tipo": "accion", "sector": "Salud"},
        {"ticker": "XOM",   "nombre": "ExxonMobil",    "tipo": "accion", "sector": "Energía"},
        # ADRs latinoamericanos (tickers verificados en yfinance/NYSE)
        {"ticker": "CIB",   "nombre": "Bancolombia",   "tipo": "accion", "sector": "Finanzas",   "pais": "CO"},
        {"ticker": "EC",    "nombre": "Ecopetrol",     "tipo": "accion", "sector": "Energía",    "pais": "CO"},
        {"ticker": "AMXL.MX","nombre": "América Móvil","tipo": "accion", "sector": "Telecom",    "pais": "MX"},
        {"ticker": "WALMEX.MX","nombre": "Walmart MX", "tipo": "accion", "sector": "Consumo",    "pais": "MX"},
        {"ticker": "VALE",  "nombre": "Vale",          "tipo": "accion", "sector": "Minería",    "pais": "BR"},
        {"ticker": "PBR",   "nombre": "Petrobras",     "tipo": "accion", "sector": "Energía",    "pais": "BR"},
        {"ticker": "ITUB",  "nombre": "Itaú Unibanco", "tipo": "accion", "sector": "Finanzas",   "pais": "BR"},
        {"ticker": "BSAC",  "nombre": "Banco Santander Chile","tipo": "accion","sector": "Finanzas","pais": "CL"},
        {"ticker": "SQM",   "nombre": "SQM (Litio)",   "tipo": "accion", "sector": "Minería",    "pais": "CL"},
        {"ticker": "BAP",   "nombre": "Credicorp",     "tipo": "accion", "sector": "Finanzas",   "pais": "PE"},
    ],
    "cripto": [
        {"ticker": "BTC", "coin_id": "bitcoin",  "nombre": "Bitcoin",  "tipo": "cripto"},
        {"ticker": "ETH", "coin_id": "ethereum", "nombre": "Ethereum", "tipo": "cripto"},
        {"ticker": "SOL", "coin_id": "solana",   "nombre": "Solana",   "tipo": "cripto"},
    ],
    "etf": [
        {"ticker": "QQQ",  "nombre": "Nasdaq 100 ETF", "tipo": "etf"},
        {"ticker": "SPY",  "nombre": "S&P 500 ETF",    "tipo": "etf"},
        {"ticker": "VTI",  "nombre": "Total Market ETF","tipo": "etf"},
    ],
    "inmueble":   [{"ticker": "VNQ", "nombre": "Vanguard Real Estate ETF", "tipo": "inmueble"}],
    "commodity":  [{"ticker": "GLD", "nombre": "SPDR Gold ETF",            "tipo": "commodity"},
                   {"ticker": "USO", "nombre": "United States Oil ETF",     "tipo": "commodity"}],
    "bono":       [{"ticker": "BND", "nombre": "Vanguard Total Bond ETF",   "tipo": "bono"},
                   {"ticker": "TLT", "nombre": "iShares 20Y Treasury ETF",  "tipo": "bono"}],
}

SECTOR_FILTER = {
    "Tecnología": ["AAPL", "NVDA", "MSFT", "GOOGL", "META"],
    "Salud":      ["JNJ", "UNH", "ABBV", "PFE"],
    "Finanzas":   ["JPM", "BAC", "GS", "MS"],
    "Energía":    ["XOM", "CVX", "USO"],
    "Consumo":    ["AMZN", "WMT", "COST", "PG"],
    "IA":         ["NVDA", "MSFT", "GOOGL", "AMD"],
}


def determinar_activos(params: AnalysisParams) -> list:
    activos = []
    max_por_tipo = 3 if params.modo == "rapido" else 4
    pais = params.pais.upper()

    for tipo in params.tipos:
        lista = ACTIVOS_POR_TIPO.get(tipo, [])

        # Para acciones: priorizar activos del país del usuario, luego globales
        if tipo == "accion":
            pais_especificos = [a for a in lista if a.get("pais") == pais]
            globales = [a for a in lista if "pais" not in a]
            # Si hay activos locales, incluir primero 1-2 locales + resto globales
            if pais_especificos:
                lista = pais_especificos[:2] + globales
            else:
                lista = globales

        if params.sectores:
            tickers_sector = []
            for s in params.sectores:
                tickers_sector.extend(SECTOR_FILTER.get(s, []))
            filtrada = [a for a in lista if a["ticker"] in tickers_sector]
            lista = filtrada if filtrada else lista

        activos.extend(lista[:max_por_tipo])

    return activos[:8]

# ─── Endpoint principal ───────────────────────────────────────────────────────
# ─── Módulo Score Final (arxiv 2512.15738) ───────────────────────────────────
def calcular_score_final(datos: dict, macro: dict) -> dict:
    dimensiones: dict = {}

    mercado  = datos.get("datos_mercado", {})
    noticias = datos.get("noticias", {})
    insiders = datos.get("insiders", {})
    backtest = datos.get("backtest", {})
    trends   = datos.get("google_trends", {})

    # Técnico (15%)
    rsi = mercado.get("rsi", 0)
    if rsi and backtest.get("señal_validada"):
        score_tec = 5.0
        if mercado.get("golden_cross"):       score_tec += 2.0
        if mercado.get("macd_señal") == "alcista": score_tec += 1.5
        if 40 < rsi < 60:                     score_tec += 1.5
        dimensiones["tecnico"] = min(score_tec, 10.0)

    # Cuantitativo (15%)
    sharpe = mercado.get("sharpe", 0)
    if sharpe:
        score_cuant = 5.0 + min(sharpe * 2, 4.0)
        var = abs(mercado.get("var_95", 10))
        score_cuant -= max(0, (var - 5) * 0.2)
        dimensiones["cuantitativo"] = min(max(score_cuant, 0), 10.0)

    # Fundamental (15%)
    fund = mercado.get("fundamental", {})
    per  = fund.get("per")
    if per:
        score_fund = 5.0
        if 0 < per < 25:   score_fund += 2.0
        elif per < 40:     score_fund += 0.5
        if fund.get("fcf") and fund["fcf"] > 0: score_fund += 1.5
        roe = fund.get("roe", 0) or 0
        if roe > 0.15:     score_fund += 1.5
        dimensiones["fundamental"] = min(score_fund, 10.0)

    # Sentimiento (15%)
    score_not = noticias.get("score_noticias", None)
    if score_not is not None:
        score_sent = 5.0 + (score_not / 20)
        score_sent += (datos.get("reddit", {}).get("score", 0) / 40)
        dimensiones["sentimiento"] = min(max(score_sent, 0), 10.0)

    # Insider (15%)
    insider_sig = insiders.get("insider_signal", "neutral")
    if insider_sig:
        insider_map = {
            "compra_fuerte": 9.0, "compra_leve": 7.0,
            "neutral": 5.0, "venta_leve": 3.0, "venta_fuerte": 1.0,
        }
        dimensiones["insider"] = insider_map.get(insider_sig, 5.0)

    # Backtest (10%)
    wr = backtest.get("win_rate_pct", 0)
    if wr > 52:
        dimensiones["backtest"] = wr / 10

    # Opciones (10%)
    pcr = mercado.get("pcr", None)
    if pcr is not None:
        score_op = 5.0
        if pcr < 0.7:   score_op += 3.0
        elif pcr > 1.3: score_op -= 2.0
        dimensiones["opciones"] = min(max(score_op, 0), 10.0)

    # Google Trends (5%)
    tg_score = trends.get("score", 0)
    if tg_score:
        score_tr = min(tg_score / 10, 8.0)
        if trends.get("alerta_hype"): score_tr -= 2.0
        dimensiones["tendencias"] = max(score_tr, 0)

    if len(dimensiones) < 3:
        return {"puntuacion_py": None, "nivel_py": "DATOS_INSUFICIENTES", "dims_usadas": []}

    pesos = {
        "tecnico": 0.15, "cuantitativo": 0.15, "fundamental": 0.15,
        "sentimiento": 0.15, "insider": 0.15, "backtest": 0.10,
        "opciones": 0.10, "tendencias": 0.05,
    }
    peso_total = sum(pesos[d] for d in dimensiones)
    puntuacion = sum(dimensiones[d] * pesos[d] for d in dimensiones) / peso_total

    # Penalizaciones macro
    if macro.get("curva_rendimientos", 0) < 0:
        puntuacion -= 0.5
    if datos.get("noticias", {}).get("earnings_proximos"):
        puntuacion -= 1.0
    if trends.get("alerta_hype"):
        puntuacion -= 0.3

    nivel = (
        "ALTA_CONVICCION" if puntuacion > 7.5 else
        "MODERADA"        if puntuacion > 5.5 else
        "BAJA"
    )

    return {
        "puntuacion_py":  round(puntuacion, 2),
        "nivel_py":       nivel,
        "dims_usadas":    list(dimensiones.keys()),
        "intervalo":      f"{round(puntuacion - 0.7, 1)} – {round(puntuacion + 0.7, 1)}",
    }


@app.get("/debug")
async def debug():
    """Diagnóstico rápido: prueba yfinance con AAPL."""
    import traceback
    result: dict = {}
    try:
        import yfinance as yf
        t = yf.Ticker("AAPL")
        hist = t.history(period="5d")
        result["yfinance"] = "ok" if not hist.empty else "empty"
        result["rows"] = len(hist)
    except Exception as e:
        result["yfinance"] = f"ERROR: {e}"
        result["traceback"] = traceback.format_exc()[-500:]
    try:
        macro = get_macro_data()
        result["macro"] = macro.get("_fuente", "real")
    except Exception as e:
        result["macro"] = f"ERROR: {e}"
    try:
        from data_engine import determinar_activos, AnalysisParams as AP
        params_test = AP(pais="CO", tipos=["accion"], modo="rapido")
        activos = determinar_activos(params_test)
        result["activos_count"] = len(activos)
        result["activos"] = [a["ticker"] for a in activos]
    except Exception as e:
        result["activos"] = f"ERROR: {e}"
    return result


@app.post("/analyze")
async def analyze(params: AnalysisParams):
    logger.info(f"Analizando: tipos={params.tipos}, pais={params.pais}, modo={params.modo}")
    macro = get_macro_data()
    rf = macro["rf_rate_diaria"]
    activos = determinar_activos(params)
    logger.info(f"Activos a analizar: {[a['ticker'] for a in activos]}")

    resultados = []
    for activo in activos:
        try:
            ticker = activo["ticker"]
            tipo   = activo.get("tipo", "accion")

            if tipo == "cripto":
                coin_id = activo.get("coin_id", COIN_MAP.get(ticker, ticker.lower()))
                mercado = get_crypto_data(coin_id, ticker)
            else:
                mercado = get_stock_data(ticker, rf)

            noticias  = get_news_sentiment(ticker)
            reddit    = get_reddit_sentiment(ticker, activo.get("nombre", ""))
            trends    = get_google_trends(ticker)
            insiders  = get_insider_data(ticker)
            backtest  = backtest_señal(ticker)

            kelly_pct = calcular_kelly(
                backtest["win_rate"],
                abs(mercado["sharpe"]) * 0.1 + 0.05,
                abs(mercado["var_95"]) / 100 + 0.01,
            )

            monto_usd = None
            monto_kelly_usd = None
            monto_kelly_local = None
            if params.monto:
                monto_usd = convertir_moneda(params.monto, params.moneda, "USD")
                monto_kelly_usd = round(monto_usd * kelly_pct, 2)
                monto_kelly_local = convertir_moneda(monto_kelly_usd, "USD", params.moneda)

            datos_activo = {
                "activo":        activo.get("nombre", ticker),
                "ticker":        ticker,
                "tipo":          tipo,
                "sector":        activo.get("sector", mercado.get("fundamental", {}).get("sector", "")),
                "datos_mercado": mercado,
                "noticias":      noticias,
                "reddit":        reddit,
                "google_trends": trends,
                "insiders":      insiders,
                "backtest":      backtest,
                "kelly_pct":     round(kelly_pct * 100, 1),
                "kelly_monto_usd":   monto_kelly_usd,
                "kelly_monto_local": monto_kelly_local,
                "moneda_local":  params.moneda,
            }
            # Score pre-calculado en Python (Claude lo puede usar como referencia)
            datos_activo["score_py"] = calcular_score_final(datos_activo, macro)
            resultados.append(datos_activo)
        except Exception as e:
            import traceback
            logger.error(f"Error procesando {activo.get('ticker', '?')}: {e}\n{traceback.format_exc()}")
            continue

    return {"activos": resultados, "macro": macro, "_errores": len(activos) - len(resultados)}


@app.get("/test/{ticker}")
async def test_ticker(ticker: str):
    import traceback
    result: dict = {"ticker": ticker}
    try:
        macro = get_macro_data()
        mercado = get_stock_data(ticker, macro["rf_rate_diaria"])
        result["mercado_ok"] = True
        result["rsi"] = mercado.get("rsi")
        result["sharpe"] = mercado.get("sharpe")
    except Exception as e:
        result["mercado_error"] = str(e)
        result["mercado_tb"] = traceback.format_exc()[-800:]
    try:
        bt = backtest_señal(ticker)
        result["backtest_ok"] = True
        result["win_rate"] = bt.get("win_rate_pct")
    except Exception as e:
        result["backtest_error"] = str(e)
        result["backtest_tb"] = traceback.format_exc()[-500:]
    return result


@app.get("/price/{ticker}")
async def get_price(ticker: str):
    try:
        info = _yf_ticker(ticker).info
        precio = info.get("currentPrice") or info.get("regularMarketPrice")
        if precio is None:
            raise ValueError("sin precio")
        return {"ticker": ticker, "precio": precio}
    except Exception:
        raise HTTPException(status_code=404, detail="Ticker no encontrado")


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}
