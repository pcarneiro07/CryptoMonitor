"""
Crypto Health Monitor - FastAPI Backend
Handles data fetching, KPI calculation, SQLite persistence, historical backfill,
and local open-source AI chat via Ollama.
"""

from __future__ import annotations

import asyncio
from collections import deque
from datetime import datetime, timedelta
import os
import statistics
from typing import Any, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import (
    get_asset_history,
    get_database_summary,
    get_latest_asset_snapshots,
    get_latest_dashboard_snapshot,
    init_database,
    save_dashboard_snapshot,
    save_historical_asset_snapshot,
)

load_dotenv()

app = FastAPI(
    title="Crypto Health Monitor API",
    description="Backend for real-time crypto market analysis",
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


COINGECKO_BASE = "https://api.coingecko.com/api/v3"
COINGECKO_API_KEY = os.getenv("COINGECKO_API_KEY", "")

FEAR_GREED_BASE = "https://api.alternative.me"
DEFILLAMA_BASE = "https://api.llama.fi"

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")


CATEGORY_MAP = {
    "bitcoin": "Layer 1",
    "ethereum": "Layer 1",
    "binancecoin": "Exchange Token",
    "solana": "Layer 1",
    "ripple": "Layer 1",
    "cardano": "Layer 1",
    "avalanche-2": "Layer 1",
    "polkadot": "Layer 1",
    "chainlink": "DeFi",
    "uniswap": "DeFi",
    "aave": "DeFi",
    "maker": "DeFi",
    "matic-network": "Layer 2",
    "arbitrum": "Layer 2",
    "optimism": "Layer 2",
    "dogecoin": "Meme",
    "shiba-inu": "Meme",
    "tether": "Stablecoin",
    "usd-coin": "Stablecoin",
    "usds": "Stablecoin",
    "dai": "Stablecoin",
    "ondo-finance": "RWA",
}

SECTOR_COLORS = {
    "Layer 1": "#3b82f6",
    "Layer 2": "#8b5cf6",
    "DeFi": "#10b981",
    "RWA": "#f59e0b",
    "Exchange Token": "#ec4899",
    "Stablecoin": "#6b7280",
    "Meme": "#f97316",
    "Other": "#64748b",
}

price_history: dict[str, deque] = {}
MAX_HISTORY = 12

backfill_state: dict[str, Any] = {
    "isRunning": False,
    "shouldStop": False,
    "startedAt": None,
    "finishedAt": None,
    "days": None,
    "limit": None,
    "totalAssets": 0,
    "processedAssets": 0,
    "currentAsset": None,
    "savedRows": 0,
    "errors": [],
    "statusMessage": "Nenhum backfill em execução.",
}


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    system: Optional[str] = None


# ---------------------------------------------------------------------------
# Startup: populate price_history from SQLite so volatility is accurate
# from the first request, without waiting 20–30 min for live data.
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup_event() -> None:
    init_database()
    _populate_price_history_from_db()


def _populate_price_history_from_db() -> None:
    """
    Read the most recent asset snapshots from SQLite and seed price_history.
    Rows arrive newest-first from get_latest_asset_snapshots, so we use
    appendleft to keep them in ascending chronological order inside each deque.
    """
    try:
        # Fetch up to MAX_HISTORY rows per asset. 500 is a safe upper bound
        # for 20 assets × 12 history slots with some room for variation.
        rows = get_latest_asset_snapshots(limit=500)

        # get_latest_asset_snapshots returns rows ordered newest-first.
        # We iterate in reverse so that appendleft ends up with the oldest
        # entry at index 0 and the newest at the right end — matching the
        # order that update_price_history() produces during live collection.
        for row in reversed(rows):
            asset_id = row.get("asset_id")
            price = row.get("current_price")
            volume = row.get("total_volume")
            timestamp = row.get("timestamp")

            if not asset_id or price is None:
                continue

            if asset_id not in price_history:
                price_history[asset_id] = deque(maxlen=MAX_HISTORY)

            price_history[asset_id].append(
                {
                    "timestamp": timestamp or datetime.utcnow().isoformat(),
                    "price": float(price),
                    "volume": float(volume) if volume is not None else 0.0,
                }
            )

    except Exception:
        # Never crash startup — if the DB is empty or unavailable, live data
        # will fill price_history naturally after the first few fetches.
        pass


def get_category(coin_id: str) -> str:
    return CATEGORY_MAP.get(coin_id, "Other")


def safe_float(value: Any, fallback: float = 0.0) -> float:
    if value is None:
        return fallback

    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def timestamp_ms_to_iso(timestamp_ms: int | float) -> str:
    return datetime.utcfromtimestamp(float(timestamp_ms) / 1000).isoformat()


def update_price_history(coin_id: str, price: float, volume: float) -> None:
    if coin_id not in price_history:
        price_history[coin_id] = deque(maxlen=MAX_HISTORY)

    price_history[coin_id].append(
        {
            "timestamp": datetime.utcnow().isoformat(),
            "price": price,
            "volume": volume,
        }
    )


def calculate_volatility(coin_id: str, fallback_1h_change: float) -> dict:
    history = price_history.get(coin_id, deque())
    prices = [safe_float(p["price"]) for p in history]

    if len(prices) >= 2:
        std = statistics.stdev(prices)
        mean = statistics.mean(prices)
        score = (std / mean * 100) if mean > 0 else 0
    else:
        score = abs(fallback_1h_change)

    return {"raw_score": round(score, 4)}


def coingecko_headers() -> dict[str, str]:
    headers = {"Accept": "application/json"}

    if COINGECKO_API_KEY:
        headers["x-cg-demo-api-key"] = COINGECKO_API_KEY

    return headers


def normalize_market_asset(item: dict[str, Any]) -> dict[str, Any]:
    coin_id = item.get("id", "")
    category = get_category(coin_id)

    return {
        "id": coin_id,
        "symbol": str(item.get("symbol", "")).upper(),
        "name": item.get("name", ""),
        "image": item.get("image", ""),
        "category": category,
        "currentPrice": safe_float(item.get("current_price")),
        "priceChange24h": safe_float(item.get("price_change_24h")),
        "priceChangePercentage24h": safe_float(item.get("price_change_percentage_24h")),
        "priceChangePercentage1h": safe_float(item.get("price_change_percentage_1h_in_currency")),
        "marketCap": safe_float(item.get("market_cap")),
        "marketCapRank": item.get("market_cap_rank"),
        "fullyDilutedValuation": item.get("fully_diluted_valuation"),
        "totalVolume": safe_float(item.get("total_volume")),
        "high24h": safe_float(item.get("high_24h")),
        "low24h": safe_float(item.get("low_24h")),
        "circulatingSupply": safe_float(item.get("circulating_supply")),
        "totalSupply": item.get("total_supply"),
        "maxSupply": item.get("max_supply"),
        "lastUpdated": item.get("last_updated"),
        "ath": safe_float(item.get("ath")),
        "athDate": item.get("ath_date"),
        "athChangePercentage": safe_float(item.get("ath_change_percentage")),
    }


async def fetch_coingecko_markets(limit: int = 20) -> list[dict[str, Any]]:
    params = {
        "vs_currency": "usd",
        "order": "market_cap_desc",
        "per_page": limit,
        "page": 1,
        "sparkline": "false",
        "price_change_percentage": "1h,24h",
        "locale": "en",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(
            f"{COINGECKO_BASE}/coins/markets",
            headers=coingecko_headers(),
            params=params,
        )

        if response.status_code == 429:
            raise HTTPException(status_code=429, detail="CoinGecko rate limit reached")

        response.raise_for_status()
        return response.json()


async def fetch_market_chart(asset_id: str, days: int) -> dict[str, Any]:
    params = {
        "vs_currency": "usd",
        "days": days,
    }

    async with httpx.AsyncClient(timeout=25.0) as client:
        response = await client.get(
            f"{COINGECKO_BASE}/coins/{asset_id}/market_chart",
            headers=coingecko_headers(),
            params=params,
        )

        if response.status_code == 429:
            raise HTTPException(status_code=429, detail="CoinGecko rate limit reached")

        response.raise_for_status()
        return response.json()


async def fetch_fear_greed_index() -> dict[str, Any] | None:
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.get(
                f"{FEAR_GREED_BASE}/fng/",
                params={
                    "limit": 1,
                    "format": "json",
                },
            )

            response.raise_for_status()
            payload = response.json()

        rows = payload.get("data", [])

        if not rows:
            return None

        item = rows[0]

        value = item.get("value")
        classification = item.get("value_classification")
        timestamp = item.get("timestamp")

        try:
            numeric_value = int(value)
        except (TypeError, ValueError):
            numeric_value = None

        iso_timestamp = None

        if timestamp is not None:
            try:
                iso_timestamp = datetime.utcfromtimestamp(int(timestamp)).isoformat()
            except (TypeError, ValueError):
                iso_timestamp = None

        return {
            "value": numeric_value,
            "classification": classification,
            "timestamp": iso_timestamp,
            "raw": item,
        }

    except Exception:
        return None


async def fetch_defillama_summary() -> dict[str, Any] | None:
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            chains_response, protocols_response = await asyncio.gather(
                client.get(f"{DEFILLAMA_BASE}/v2/chains"),
                client.get(f"{DEFILLAMA_BASE}/protocols"),
            )

            chains_response.raise_for_status()
            protocols_response.raise_for_status()

            chains_payload = chains_response.json()
            protocols_payload = protocols_response.json()

        chains = chains_payload if isinstance(chains_payload, list) else []
        protocols = protocols_payload if isinstance(protocols_payload, list) else []

        def get_tvl(item: dict[str, Any]) -> float:
            return safe_float(item.get("tvl"), 0)

        def get_change_1d(item: dict[str, Any]) -> float | None:
            value = (
                item.get("change_1d")
                if item.get("change_1d") is not None
                else item.get("change1d")
            )

            if value is None:
                value = item.get("change24h")

            if value is None:
                return None

            return safe_float(value, 0)

        def get_change_7d(item: dict[str, Any]) -> float | None:
            value = (
                item.get("change_7d")
                if item.get("change_7d") is not None
                else item.get("change7d")
            )

            if value is None:
                return None

            return safe_float(value, 0)

        valid_chains = [
            chain for chain in chains
            if isinstance(chain, dict) and get_tvl(chain) > 0
        ]

        valid_protocols = [
            protocol for protocol in protocols
            if isinstance(protocol, dict) and get_tvl(protocol) > 0
        ]

        top_chains = sorted(valid_chains, key=get_tvl, reverse=True)[:10]
        top_protocols = sorted(valid_protocols, key=get_tvl, reverse=True)[:10]

        total_tvl = sum(get_tvl(chain) for chain in valid_chains)

        chain_changes = [
            get_change_1d(chain)
            for chain in top_chains
            if get_change_1d(chain) is not None
        ]

        tvl_change_24h = (
            round(sum(chain_changes) / len(chain_changes), 2)
            if chain_changes
            else None
        )

        return {
            "totalTvl": total_tvl,
            "totalTvlUsd": total_tvl,
            "tvlChange24h": tvl_change_24h,
            "chainCount": len(valid_chains),
            "protocolCount": len(valid_protocols),
            "topChains": [
                {
                    "name": chain.get("name") or chain.get("chain") or "Unknown",
                    "tvl": get_tvl(chain),
                    "change1d": get_change_1d(chain),
                    "change24h": get_change_1d(chain),
                    "change7d": get_change_7d(chain),
                }
                for chain in top_chains
            ],
            "topProtocols": [
                {
                    "name": protocol.get("name") or "Unknown",
                    "chain": protocol.get("chain"),
                    "category": protocol.get("category"),
                    "tvl": get_tvl(protocol),
                    "change1d": get_change_1d(protocol),
                    "change24h": get_change_1d(protocol),
                    "change7d": get_change_7d(protocol),
                }
                for protocol in top_protocols
            ],
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception:
        return None


def build_dashboard(
    raw_assets: list[dict[str, Any]],
    fear_greed: dict[str, Any] | None = None,
    defi_llama: dict[str, Any] | None = None,
) -> dict[str, Any]:
    now = datetime.utcnow()

    assets = []

    for item in raw_assets:
        asset = normalize_market_asset(item)

        update_price_history(
            asset["id"],
            asset["currentPrice"],
            asset["totalVolume"],
        )

        assets.append(asset)

    raw_scores = [
        (
            asset["id"],
            asset["symbol"],
            calculate_volatility(asset["id"], asset["priceChangePercentage1h"])["raw_score"],
        )
        for asset in assets
    ]

    all_scores = [score for _, _, score in raw_scores]
    min_score = min(all_scores) if all_scores else 0
    max_score = max(all_scores) if all_scores else 1

    volatility_scores = []

    for asset_id, symbol, score in raw_scores:
        normalized = int(((score - min_score) / (max_score - min_score) * 100)) if max_score > min_score else 50

        if normalized < 25:
            level = "low"
        elif normalized < 50:
            level = "medium"
        elif normalized < 75:
            level = "high"
        else:
            level = "extreme"

        volatility_scores.append(
            {
                "assetId": asset_id,
                "symbol": symbol,
                "score": round(score, 2),
                "normalized": normalized,
                "level": level,
            }
        )

    total_market_cap = sum(asset["marketCap"] for asset in assets)

    sector_map: dict[str, dict[str, Any]] = {}

    for asset in assets:
        category = asset["category"]

        if category not in sector_map:
            sector_map[category] = {
                "totalMarketCap": 0,
                "assets": [],
                "changes": [],
            }

        sector_map[category]["totalMarketCap"] += asset["marketCap"]
        sector_map[category]["assets"].append(asset)
        sector_map[category]["changes"].append(asset["priceChangePercentage24h"])

    sector_dominance = sorted(
        [
            {
                "category": category,
                "totalMarketCap": sector_data["totalMarketCap"],
                "marketShare": round(
                    sector_data["totalMarketCap"] / total_market_cap * 100,
                    2,
                )
                if total_market_cap > 0
                else 0,
                "assetCount": len(sector_data["assets"]),
                "avgPriceChange24h": round(
                    sum(sector_data["changes"]) / len(sector_data["changes"]),
                    2,
                )
                if sector_data["changes"]
                else 0,
                "color": SECTOR_COLORS.get(category, "#64748b"),
            }
            for category, sector_data in sector_map.items()
        ],
        key=lambda item: item["marketShare"],
        reverse=True,
    )

    volume_velocities = []
    all_volume_changes = []

    for asset in assets:
        history = list(price_history.get(asset["id"], deque()))

        if len(history) >= 3:
            recent = history[-3:]
            oldest_volume = safe_float(recent[0]["volume"])
            newest_volume = safe_float(recent[-1]["volume"])
            change = ((newest_volume - oldest_volume) / oldest_volume * 100) if oldest_volume > 0 else 0
            previous_volume = oldest_volume
        else:
            change = 0
            previous_volume = asset["totalVolume"]

        all_volume_changes.append(change)

        volume_velocities.append(
            {
                "assetId": asset["id"],
                "symbol": asset["symbol"],
                "volumeChange30m": round(change, 2),
                "currentVolume": asset["totalVolume"],
                "previousVolume": previous_volume,
                "isAnomaly": False,
            }
        )

    if len(all_volume_changes) >= 2:
        mean_change = sum(all_volume_changes) / len(all_volume_changes)
        std_change = statistics.stdev(all_volume_changes)
        threshold = 2 * std_change

        for index, volume_velocity in enumerate(volume_velocities):
            volume_velocity["isAnomaly"] = abs(all_volume_changes[index] - mean_change) > threshold

    btc = next((asset for asset in assets if asset["id"] == "bitcoin"), None)
    eth = next((asset for asset in assets if asset["id"] == "ethereum"), None)

    weighted_change = (
        sum(
            asset["priceChangePercentage24h"] * (asset["marketCap"] / total_market_cap)
            for asset in assets
        )
        if total_market_cap > 0
        else 0
    )

    market_kpis = {
        "totalMarketCap": total_market_cap,
        "totalVolume24h": sum(asset["totalVolume"] for asset in assets),
        "btcDominance": round(btc["marketCap"] / total_market_cap * 100, 2)
        if btc and total_market_cap > 0
        else 0,
        "ethDominance": round(eth["marketCap"] / total_market_cap * 100, 2)
        if eth and total_market_cap > 0
        else 0,
        "fearGreedIndex": fear_greed.get("value") if fear_greed else None,
        "fearGreedLabel": fear_greed.get("classification") if fear_greed else None,
        "activeAssets": len(assets),
        "marketCapChange24h": round(weighted_change, 2),
    }

    sorted_assets = sorted(
        assets,
        key=lambda asset: asset["priceChangePercentage24h"],
        reverse=True,
    )

    return {
        "assets": assets,
        "volatilityScores": volatility_scores,
        "sectorDominance": sector_dominance,
        "volumeVelocity": volume_velocities,
        "marketKPIs": market_kpis,
        "topGainer": sorted_assets[0] if sorted_assets else None,
        "topLoser": sorted_assets[-1] if sorted_assets else None,
        "fearGreed": fear_greed,
        "defiLlama": defi_llama,
        "lastFetchedAt": now.isoformat(),
        "nextFetchAt": (now + timedelta(minutes=10)).isoformat(),
    }


def reset_backfill_state(days: int, limit: int) -> None:
    backfill_state.update(
        {
            "isRunning": True,
            "shouldStop": False,
            "startedAt": datetime.utcnow().isoformat(),
            "finishedAt": None,
            "days": days,
            "limit": limit,
            "totalAssets": 0,
            "processedAssets": 0,
            "currentAsset": None,
            "savedRows": 0,
            "errors": [],
            "statusMessage": "Backfill iniciado.",
        }
    )


def finish_backfill_state(message: str) -> None:
    backfill_state.update(
        {
            "isRunning": False,
            "finishedAt": datetime.utcnow().isoformat(),
            "currentAsset": None,
            "statusMessage": message,
        }
    )


async def run_backfill_task(days: int, limit: int, delay_seconds: float) -> None:
    reset_backfill_state(days, limit)

    try:
        raw_assets = await fetch_coingecko_markets(limit=limit)
        assets = [normalize_market_asset(item) for item in raw_assets]

        backfill_state["totalAssets"] = len(assets)

        for index, asset in enumerate(assets, start=1):
            if backfill_state["shouldStop"]:
                finish_backfill_state("Backfill interrompido manualmente.")
                return

            asset_id = asset["id"]

            backfill_state["currentAsset"] = asset_id
            backfill_state["statusMessage"] = f"Processando {asset.get('symbol')} ({index}/{len(assets)})..."

            try:
                chart = await fetch_market_chart(asset_id, days=days)

                prices = chart.get("prices", [])
                market_caps = chart.get("market_caps", [])
                total_volumes = chart.get("total_volumes", [])

                max_len = max(len(prices), len(market_caps), len(total_volumes))
                saved_for_asset = 0

                for row_index in range(max_len):
                    price_pair = prices[row_index] if row_index < len(prices) else None
                    market_cap_pair = market_caps[row_index] if row_index < len(market_caps) else None
                    volume_pair = total_volumes[row_index] if row_index < len(total_volumes) else None

                    timestamp_ms = None

                    if price_pair:
                        timestamp_ms = price_pair[0]
                    elif market_cap_pair:
                        timestamp_ms = market_cap_pair[0]
                    elif volume_pair:
                        timestamp_ms = volume_pair[0]

                    if timestamp_ms is None:
                        continue

                    timestamp = timestamp_ms_to_iso(timestamp_ms)

                    price = price_pair[1] if price_pair else None
                    market_cap = market_cap_pair[1] if market_cap_pair else None
                    total_volume = volume_pair[1] if volume_pair else None

                    save_historical_asset_snapshot(
                        asset=asset,
                        timestamp=timestamp,
                        price=price,
                        market_cap=market_cap,
                        total_volume=total_volume,
                        source="coingecko_backfill",
                    )

                    saved_for_asset += 1

                backfill_state["processedAssets"] = index
                backfill_state["savedRows"] += saved_for_asset
                backfill_state["statusMessage"] = f"{asset.get('symbol')} salvo com {saved_for_asset} registros."

            except Exception as exc:
                backfill_state["errors"].append(
                    {
                        "assetId": asset_id,
                        "symbol": asset.get("symbol"),
                        "message": str(exc),
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                )

            await asyncio.sleep(delay_seconds)

        finish_backfill_state("Backfill concluído.")

    except Exception as exc:
        backfill_state["errors"].append(
            {
                "assetId": None,
                "symbol": None,
                "message": str(exc),
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        finish_backfill_state("Backfill finalizado com erro.")


def normalize_chat_messages(messages: List[ChatMessage]) -> list[dict[str, str]]:
    normalized = []

    for message in messages:
        role = message.role if message.role in {"user", "assistant", "system"} else "user"
        content = message.content.strip()

        if content:
            normalized.append(
                {
                    "role": role,
                    "content": content,
                }
            )

    return normalized


async def call_ollama_chat(request: ChatRequest) -> dict[str, Any]:
    messages = normalize_chat_messages(request.messages)

    if request.system:
        messages.insert(
            0,
            {
                "role": "system",
                "content": request.system.strip(),
            },
        )

    if not messages:
        raise HTTPException(status_code=400, detail="No chat messages provided")

    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.3,
            "num_predict": 700,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json=payload,
            )
    except httpx.ConnectError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Ollama is not running. Start it with 'ollama serve' and pull a model "
                f"with 'ollama pull {OLLAMA_MODEL}'."
            ),
        ) from exc
    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=504,
            detail="Ollama took too long to respond. Try a smaller model or increase timeout.",
        ) from exc

    if response.status_code == 404:
        raise HTTPException(
            status_code=404,
            detail=f"Ollama model '{OLLAMA_MODEL}' not found. Run: ollama pull {OLLAMA_MODEL}",
        )

    if not response.is_success:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Ollama API error: {response.text}",
        )

    data = response.json()
    content = data.get("message", {}).get("content", "").strip()

    if not content:
        content = "Não consegui gerar uma resposta agora. Tente novamente em alguns segundos."

    return {
        "content": content,
        "model": data.get("model", OLLAMA_MODEL),
    }


@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "Crypto Health Monitor API",
        "llm_provider": "ollama",
        "llm_model": OLLAMA_MODEL,
        "database": "sqlite",
        "version": "1.2.0",
    }


@app.get("/api/dashboard")
async def get_dashboard():
    """
    Fetch dashboard from CoinGecko and enrich with Fear & Greed + DeFiLlama.
    If CoinGecko fails or rate-limits, return the latest SQLite snapshot.
    Complementary sources must never break the dashboard.
    """
    try:
        raw_assets = await fetch_coingecko_markets(limit=20)

        fear_greed_result, defillama_result = await asyncio.gather(
            fetch_fear_greed_index(),
            fetch_defillama_summary(),
            return_exceptions=True,
        )

        fear_greed = fear_greed_result if isinstance(fear_greed_result, dict) else None
        defi_llama = defillama_result if isinstance(defillama_result, dict) else None

        dashboard = build_dashboard(
            raw_assets,
            fear_greed=fear_greed,
            defi_llama=defi_llama,
        )

        warnings = []

        if not fear_greed:
            warnings.append("Fear & Greed indisponível nesta coleta.")

        if not defi_llama:
            warnings.append("DeFiLlama indisponível nesta coleta.")

        try:
            save_dashboard_snapshot(dashboard)
        except Exception as exc:
            warnings.append(f"SQLite save failed: {str(exc)}")

        if warnings:
            dashboard["databaseWarning"] = " ".join(warnings)

        return dashboard

    except Exception as exc:
        fallback_dashboard = None

        try:
            fallback_dashboard = get_latest_dashboard_snapshot()
        except Exception as db_exc:
            fallback_dashboard = None
            fallback_error = str(db_exc)
        else:
            fallback_error = None

        if fallback_dashboard:
            error_message = str(exc)

            fallback_dashboard["databaseWarning"] = (
                "Exibindo último dado salvo no SQLite. "
                f"A coleta ao vivo falhou temporariamente: {error_message}"
            )

            return fallback_dashboard

        if isinstance(exc, HTTPException):
            raise exc

        detail = f"Failed to build dashboard: {str(exc)}"

        if fallback_error:
            detail += f" | SQLite fallback also failed: {fallback_error}"

        raise HTTPException(status_code=500, detail=detail) from exc


@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "assets_tracked": sum(len(history) for history in price_history.values()),
        "history_keys": len(price_history),
        "llm_provider": "ollama",
        "ollama_base_url": OLLAMA_BASE_URL,
        "ollama_model": OLLAMA_MODEL,
        "database": "sqlite",
    }


@app.post("/api/chat")
async def chat(request: ChatRequest):
    return await call_ollama_chat(request)


@app.post("/api/database/init")
async def database_init():
    init_database()
    return {
        "status": "ok",
        "message": "SQLite database initialized.",
    }


@app.get("/api/database/summary")
async def database_summary():
    return get_database_summary()


@app.get("/api/database/assets/{asset_id}/history")
async def database_asset_history(
    asset_id: str,
    limit: int = Query(default=500, ge=1, le=5000),
):
    return {
        "assetId": asset_id,
        "history": get_asset_history(asset_id, limit=limit),
    }


@app.get("/api/database/latest")
async def database_latest(
    limit: int = Query(default=100, ge=1, le=1000),
):
    return {
        "rows": get_latest_asset_snapshots(limit=limit),
    }


@app.post("/api/database/backfill/start")
async def database_backfill_start(
    background_tasks: BackgroundTasks,
    days: int = Query(default=7, ge=1, le=30),
    limit: int = Query(default=20, ge=1, le=50),
    delay_seconds: float = Query(default=1.2, ge=0.2, le=10),
):
    if backfill_state["isRunning"]:
        return {
            "status": "already_running",
            "message": "Backfill already running.",
            "backfill": backfill_state,
        }

    background_tasks.add_task(run_backfill_task, days, limit, delay_seconds)

    return {
        "status": "started",
        "message": "Backfill started in background.",
        "days": days,
        "limit": limit,
        "delaySeconds": delay_seconds,
    }


@app.get("/api/database/backfill/status")
async def database_backfill_status():
    return backfill_state


@app.post("/api/database/backfill/stop")
async def database_backfill_stop():
    if not backfill_state["isRunning"]:
        return {
            "status": "not_running",
            "message": "No backfill is currently running.",
            "backfill": backfill_state,
        }

    backfill_state["shouldStop"] = True
    backfill_state["statusMessage"] = "Solicitação de parada recebida."

    return {
        "status": "stopping",
        "message": "Backfill stop requested.",
        "backfill": backfill_state,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
