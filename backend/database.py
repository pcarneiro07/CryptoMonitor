from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Optional


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "crypto_monitor.db"


def ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    ensure_data_dir()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")

    return conn


def init_database() -> None:
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS assets (
                id TEXT PRIMARY KEY,
                symbol TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT,
                market_cap_rank INTEGER,
                image TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS asset_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT,
                timestamp TEXT NOT NULL,
                current_price REAL,
                market_cap REAL,
                total_volume REAL,
                price_change_1h REAL,
                price_change_24h REAL,
                high_24h REAL,
                low_24h REAL,
                ath REAL,
                ath_change_percentage REAL,
                source TEXT NOT NULL DEFAULT 'coingecko',
                created_at TEXT NOT NULL,
                UNIQUE(asset_id, timestamp, source),
                FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS market_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL UNIQUE,
                total_market_cap REAL,
                total_volume_24h REAL,
                btc_dominance REAL,
                eth_dominance REAL,
                market_cap_change_24h REAL,
                active_assets INTEGER,
                fear_greed_index REAL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sector_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                category TEXT NOT NULL,
                total_market_cap REAL,
                market_share REAL,
                asset_count INTEGER,
                avg_price_change_24h REAL,
                created_at TEXT NOT NULL,
                UNIQUE(timestamp, category)
            );

            CREATE TABLE IF NOT EXISTS volatility_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                asset_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                score REAL,
                normalized INTEGER,
                level TEXT,
                created_at TEXT NOT NULL,
                UNIQUE(timestamp, asset_id),
                FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS volume_velocity_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                asset_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                volume_change_30m REAL,
                current_volume REAL,
                previous_volume REAL,
                is_anomaly INTEGER,
                created_at TEXT NOT NULL,
                UNIQUE(timestamp, asset_id),
                FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS defillama_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL UNIQUE,
                total_tvl REAL,
                chain_count INTEGER,
                protocol_count INTEGER,
                top_chains_json TEXT,
                top_protocols_json TEXT,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_asset_snapshots_asset_timestamp
            ON asset_snapshots(asset_id, timestamp);

            CREATE INDEX IF NOT EXISTS idx_asset_snapshots_timestamp
            ON asset_snapshots(timestamp);

            CREATE INDEX IF NOT EXISTS idx_market_snapshots_timestamp
            ON market_snapshots(timestamp);

            CREATE INDEX IF NOT EXISTS idx_sector_snapshots_timestamp
            ON sector_snapshots(timestamp);

            CREATE INDEX IF NOT EXISTS idx_defillama_snapshots_timestamp
            ON defillama_snapshots(timestamp);
            """
        )


def now_iso() -> str:
    return datetime.utcnow().isoformat()


def safe_float(value: Any, fallback: Optional[float] = None) -> Optional[float]:
    if value is None:
        return fallback

    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def safe_int(value: Any, fallback: Optional[int] = None) -> Optional[int]:
    if value is None:
        return fallback

    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def upsert_asset(conn: sqlite3.Connection, asset: dict[str, Any]) -> None:
    timestamp = now_iso()

    conn.execute(
        """
        INSERT INTO assets (
            id,
            symbol,
            name,
            category,
            market_cap_rank,
            image,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            symbol = excluded.symbol,
            name = excluded.name,
            category = excluded.category,
            market_cap_rank = excluded.market_cap_rank,
            image = excluded.image,
            updated_at = excluded.updated_at
        """,
        (
            asset.get("id"),
            asset.get("symbol"),
            asset.get("name"),
            asset.get("category"),
            safe_int(asset.get("marketCapRank")),
            asset.get("image"),
            timestamp,
            timestamp,
        ),
    )


def save_dashboard_snapshot(dashboard: dict[str, Any]) -> None:
    init_database()

    timestamp = dashboard.get("lastFetchedAt") or now_iso()
    created_at = now_iso()

    assets = dashboard.get("assets", [])
    market_kpis = dashboard.get("marketKPIs") or {}
    sector_dominance = dashboard.get("sectorDominance", [])
    volatility_scores = dashboard.get("volatilityScores", [])
    volume_velocity = dashboard.get("volumeVelocity", [])
    defi_llama = dashboard.get("defiLlama")

    with get_connection() as conn:
        for asset in assets:
            upsert_asset(conn, asset)

            conn.execute(
                """
                INSERT OR IGNORE INTO asset_snapshots (
                    asset_id,
                    symbol,
                    name,
                    category,
                    timestamp,
                    current_price,
                    market_cap,
                    total_volume,
                    price_change_1h,
                    price_change_24h,
                    high_24h,
                    low_24h,
                    ath,
                    ath_change_percentage,
                    source,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    asset.get("id"),
                    asset.get("symbol"),
                    asset.get("name"),
                    asset.get("category"),
                    timestamp,
                    safe_float(asset.get("currentPrice")),
                    safe_float(asset.get("marketCap")),
                    safe_float(asset.get("totalVolume")),
                    safe_float(asset.get("priceChangePercentage1h")),
                    safe_float(asset.get("priceChangePercentage24h")),
                    safe_float(asset.get("high24h")),
                    safe_float(asset.get("low24h")),
                    safe_float(asset.get("ath")),
                    safe_float(asset.get("athChangePercentage")),
                    "coingecko_live",
                    created_at,
                ),
            )

        conn.execute(
            """
            INSERT OR IGNORE INTO market_snapshots (
                timestamp,
                total_market_cap,
                total_volume_24h,
                btc_dominance,
                eth_dominance,
                market_cap_change_24h,
                active_assets,
                fear_greed_index,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                timestamp,
                safe_float(market_kpis.get("totalMarketCap")),
                safe_float(market_kpis.get("totalVolume24h")),
                safe_float(market_kpis.get("btcDominance")),
                safe_float(market_kpis.get("ethDominance")),
                safe_float(market_kpis.get("marketCapChange24h")),
                safe_int(market_kpis.get("activeAssets")),
                safe_float(market_kpis.get("fearGreedIndex")),
                created_at,
            ),
        )

        for sector in sector_dominance:
            conn.execute(
                """
                INSERT OR IGNORE INTO sector_snapshots (
                    timestamp,
                    category,
                    total_market_cap,
                    market_share,
                    asset_count,
                    avg_price_change_24h,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    timestamp,
                    sector.get("category"),
                    safe_float(sector.get("totalMarketCap")),
                    safe_float(sector.get("marketShare")),
                    safe_int(sector.get("assetCount")),
                    safe_float(sector.get("avgPriceChange24h")),
                    created_at,
                ),
            )

        for item in volatility_scores:
            conn.execute(
                """
                INSERT OR IGNORE INTO volatility_snapshots (
                    timestamp,
                    asset_id,
                    symbol,
                    score,
                    normalized,
                    level,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    timestamp,
                    item.get("assetId"),
                    item.get("symbol"),
                    safe_float(item.get("score")),
                    safe_int(item.get("normalized")),
                    item.get("level"),
                    created_at,
                ),
            )

        for item in volume_velocity:
            conn.execute(
                """
                INSERT OR IGNORE INTO volume_velocity_snapshots (
                    timestamp,
                    asset_id,
                    symbol,
                    volume_change_30m,
                    current_volume,
                    previous_volume,
                    is_anomaly,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    timestamp,
                    item.get("assetId"),
                    item.get("symbol"),
                    safe_float(item.get("volumeChange30m")),
                    safe_float(item.get("currentVolume")),
                    safe_float(item.get("previousVolume")),
                    1 if item.get("isAnomaly") else 0,
                    created_at,
                ),
            )

    if defi_llama:
        save_defillama_snapshot(defi_llama)


def save_historical_asset_snapshot(
    *,
    asset: dict[str, Any],
    timestamp: str,
    price: Optional[float],
    market_cap: Optional[float],
    total_volume: Optional[float],
    source: str = "coingecko_backfill",
) -> None:
    init_database()

    created_at = now_iso()

    with get_connection() as conn:
        upsert_asset(conn, asset)

        conn.execute(
            """
            INSERT OR IGNORE INTO asset_snapshots (
                asset_id,
                symbol,
                name,
                category,
                timestamp,
                current_price,
                market_cap,
                total_volume,
                price_change_1h,
                price_change_24h,
                high_24h,
                low_24h,
                ath,
                ath_change_percentage,
                source,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)
            """,
            (
                asset.get("id"),
                asset.get("symbol"),
                asset.get("name"),
                asset.get("category"),
                timestamp,
                safe_float(price),
                safe_float(market_cap),
                safe_float(total_volume),
                source,
                created_at,
            ),
        )


def save_defillama_snapshot(snapshot: dict[str, Any]) -> None:
    init_database()

    timestamp = snapshot.get("timestamp") or now_iso()
    created_at = now_iso()

    with get_connection() as conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO defillama_snapshots (
                timestamp,
                total_tvl,
                chain_count,
                protocol_count,
                top_chains_json,
                top_protocols_json,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                timestamp,
                safe_float(snapshot.get("totalTvl") or snapshot.get("totalTvlUsd")),
                safe_int(snapshot.get("chainCount")),
                safe_int(snapshot.get("protocolCount")),
                json.dumps(snapshot.get("topChains", []), ensure_ascii=False),
                json.dumps(snapshot.get("topProtocols", []), ensure_ascii=False),
                created_at,
            ),
        )


def get_database_summary() -> dict[str, Any]:
    init_database()

    with get_connection() as conn:
        total_assets = conn.execute("SELECT COUNT(*) AS total FROM assets").fetchone()["total"]

        total_asset_snapshots = conn.execute(
            "SELECT COUNT(*) AS total FROM asset_snapshots"
        ).fetchone()["total"]

        total_market_snapshots = conn.execute(
            "SELECT COUNT(*) AS total FROM market_snapshots"
        ).fetchone()["total"]

        total_sector_snapshots = conn.execute(
            "SELECT COUNT(*) AS total FROM sector_snapshots"
        ).fetchone()["total"]

        total_volatility_snapshots = conn.execute(
            "SELECT COUNT(*) AS total FROM volatility_snapshots"
        ).fetchone()["total"]

        total_volume_velocity_snapshots = conn.execute(
            "SELECT COUNT(*) AS total FROM volume_velocity_snapshots"
        ).fetchone()["total"]

        total_defillama_snapshots = conn.execute(
            "SELECT COUNT(*) AS total FROM defillama_snapshots"
        ).fetchone()["total"]

        period = conn.execute(
            """
            SELECT
                MIN(timestamp) AS first_timestamp,
                MAX(timestamp) AS last_timestamp
            FROM asset_snapshots
            """
        ).fetchone()

        assets = conn.execute(
            """
            SELECT
                id,
                symbol,
                name,
                category,
                market_cap_rank,
                updated_at
            FROM assets
            ORDER BY COALESCE(market_cap_rank, 999999), symbol
            """
        ).fetchall()

        latest_market = conn.execute(
            """
            SELECT *
            FROM market_snapshots
            ORDER BY timestamp DESC
            LIMIT 1
            """
        ).fetchone()

    return {
        "dbPath": str(DB_PATH),
        "totals": {
            "assets": total_assets,
            "assetSnapshots": total_asset_snapshots,
            "marketSnapshots": total_market_snapshots,
            "sectorSnapshots": total_sector_snapshots,
            "volatilitySnapshots": total_volatility_snapshots,
            "volumeVelocitySnapshots": total_volume_velocity_snapshots,
            "defillamaSnapshots": total_defillama_snapshots,
        },
        "period": {
            "firstTimestamp": period["first_timestamp"] if period else None,
            "lastTimestamp": period["last_timestamp"] if period else None,
        },
        "assets": [dict(row) for row in assets],
        "latestMarketSnapshot": dict(latest_market) if latest_market else None,
    }


def get_asset_history(asset_id: str, limit: int = 500) -> list[dict[str, Any]]:
    init_database()

    safe_limit = max(1, min(limit, 5000))

    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT
                asset_id,
                symbol,
                name,
                category,
                timestamp,
                current_price,
                market_cap,
                total_volume,
                price_change_1h,
                price_change_24h,
                source
            FROM asset_snapshots
            WHERE asset_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (asset_id, safe_limit),
        ).fetchall()

    return [dict(row) for row in rows]


def get_latest_asset_snapshots(limit: int = 100) -> list[dict[str, Any]]:
    init_database()

    safe_limit = max(1, min(limit, 1000))

    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT
                asset_id,
                symbol,
                name,
                category,
                timestamp,
                current_price,
                market_cap,
                total_volume,
                price_change_1h,
                price_change_24h,
                source
            FROM asset_snapshots
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (safe_limit,),
        ).fetchall()

    return [dict(row) for row in rows]


def _row_to_asset(row: sqlite3.Row) -> dict[str, Any]:
    keys = row.keys()

    return {
        "id": row["asset_id"],
        "symbol": row["symbol"],
        "name": row["name"],
        "image": row["image"] if "image" in keys else "",
        "category": row["category"],
        "currentPrice": safe_float(row["current_price"], 0),
        "priceChange24h": None,
        "priceChangePercentage24h": safe_float(row["price_change_24h"], 0),
        "priceChangePercentage1h": safe_float(row["price_change_1h"], 0),
        "marketCap": safe_float(row["market_cap"], 0),
        "marketCapRank": row["market_cap_rank"] if "market_cap_rank" in keys else None,
        "fullyDilutedValuation": None,
        "totalVolume": safe_float(row["total_volume"], 0),
        "high24h": safe_float(row["high_24h"], 0),
        "low24h": safe_float(row["low_24h"], 0),
        "circulatingSupply": 0,
        "totalSupply": None,
        "maxSupply": None,
        "lastUpdated": row["timestamp"],
        "ath": safe_float(row["ath"], 0),
        "athDate": None,
        "athChangePercentage": safe_float(row["ath_change_percentage"], 0),
    }


def _get_latest_defillama_snapshot(conn: sqlite3.Connection) -> Optional[dict[str, Any]]:
    row = conn.execute(
        """
        SELECT *
        FROM defillama_snapshots
        ORDER BY timestamp DESC
        LIMIT 1
        """
    ).fetchone()

    if not row:
        return None

    try:
        top_chains = json.loads(row["top_chains_json"] or "[]")
    except json.JSONDecodeError:
        top_chains = []

    try:
        top_protocols = json.loads(row["top_protocols_json"] or "[]")
    except json.JSONDecodeError:
        top_protocols = []

    total_tvl = safe_float(row["total_tvl"], 0) or 0

    return {
        "totalTvl": total_tvl,
        "totalTvlUsd": total_tvl,
        "tvlChange24h": None,
        "chainCount": safe_int(row["chain_count"], 0) or 0,
        "protocolCount": safe_int(row["protocol_count"], 0) or 0,
        "topChains": top_chains,
        "topProtocols": top_protocols,
        "timestamp": row["timestamp"],
    }


def get_latest_dashboard_snapshot() -> Optional[dict[str, Any]]:
    """
    Rebuilds the dashboard payload from the latest SQLite snapshot.
    Used as fallback when CoinGecko is unavailable or rate-limited.
    """
    init_database()

    with get_connection() as conn:
        latest_market = conn.execute(
            """
            SELECT *
            FROM market_snapshots
            ORDER BY timestamp DESC
            LIMIT 1
            """
        ).fetchone()

        if latest_market:
            timestamp = latest_market["timestamp"]

            asset_rows = conn.execute(
                """
                SELECT
                    s.*,
                    a.image,
                    a.market_cap_rank
                FROM asset_snapshots s
                LEFT JOIN assets a ON a.id = s.asset_id
                WHERE s.timestamp = ?
                ORDER BY COALESCE(a.market_cap_rank, 999999), s.symbol
                """,
                (timestamp,),
            ).fetchall()

            sector_rows = conn.execute(
                """
                SELECT *
                FROM sector_snapshots
                WHERE timestamp = ?
                ORDER BY market_share DESC
                """,
                (timestamp,),
            ).fetchall()

            volatility_rows = conn.execute(
                """
                SELECT *
                FROM volatility_snapshots
                WHERE timestamp = ?
                ORDER BY normalized DESC
                """,
                (timestamp,),
            ).fetchall()

            volume_rows = conn.execute(
                """
                SELECT *
                FROM volume_velocity_snapshots
                WHERE timestamp = ?
                ORDER BY ABS(volume_change_30m) DESC
                """,
                (timestamp,),
            ).fetchall()

        else:
            latest_timestamp_row = conn.execute(
                """
                SELECT MAX(timestamp) AS latest_timestamp
                FROM asset_snapshots
                """
            ).fetchone()

            timestamp = latest_timestamp_row["latest_timestamp"] if latest_timestamp_row else None

            if not timestamp:
                return None

            asset_rows = conn.execute(
                """
                SELECT
                    s.*,
                    a.image,
                    a.market_cap_rank
                FROM asset_snapshots s
                LEFT JOIN assets a ON a.id = s.asset_id
                INNER JOIN (
                    SELECT asset_id, MAX(timestamp) AS max_timestamp
                    FROM asset_snapshots
                    GROUP BY asset_id
                ) latest
                    ON latest.asset_id = s.asset_id
                    AND latest.max_timestamp = s.timestamp
                ORDER BY COALESCE(a.market_cap_rank, 999999), s.symbol
                """
            ).fetchall()

            sector_rows = []
            volatility_rows = []
            volume_rows = []
            latest_market = None

        if not asset_rows:
            return None

        assets = [_row_to_asset(row) for row in asset_rows]

        total_market_cap = sum(safe_float(asset.get("marketCap"), 0) or 0 for asset in assets)
        total_volume = sum(safe_float(asset.get("totalVolume"), 0) or 0 for asset in assets)

        if latest_market:
            market_kpis = {
                "totalMarketCap": safe_float(latest_market["total_market_cap"], total_market_cap),
                "totalVolume24h": safe_float(latest_market["total_volume_24h"], total_volume),
                "btcDominance": safe_float(latest_market["btc_dominance"], 0),
                "ethDominance": safe_float(latest_market["eth_dominance"], 0),
                "fearGreedIndex": safe_float(latest_market["fear_greed_index"], None),
                "fearGreedLabel": None,
                "activeAssets": safe_int(latest_market["active_assets"], len(assets)),
                "marketCapChange24h": safe_float(latest_market["market_cap_change_24h"], 0),
            }
        else:
            btc = next((asset for asset in assets if asset["id"] == "bitcoin"), None)
            eth = next((asset for asset in assets if asset["id"] == "ethereum"), None)

            market_kpis = {
                "totalMarketCap": total_market_cap,
                "totalVolume24h": total_volume,
                "btcDominance": round(btc["marketCap"] / total_market_cap * 100, 2)
                if btc and total_market_cap > 0
                else 0,
                "ethDominance": round(eth["marketCap"] / total_market_cap * 100, 2)
                if eth and total_market_cap > 0
                else 0,
                "fearGreedIndex": None,
                "fearGreedLabel": None,
                "activeAssets": len(assets),
                "marketCapChange24h": 0,
            }

        if sector_rows:
            sector_dominance = [
                {
                    "category": row["category"],
                    "totalMarketCap": safe_float(row["total_market_cap"], 0),
                    "marketShare": safe_float(row["market_share"], 0),
                    "assetCount": safe_int(row["asset_count"], 0),
                    "avgPriceChange24h": safe_float(row["avg_price_change_24h"], 0),
                    "color": "#64748b",
                }
                for row in sector_rows
            ]
        else:
            sector_map: dict[str, dict[str, Any]] = {}

            for asset in assets:
                category = asset.get("category") or "Other"

                if category not in sector_map:
                    sector_map[category] = {
                        "totalMarketCap": 0,
                        "assetCount": 0,
                        "changes": [],
                    }

                sector_map[category]["totalMarketCap"] += safe_float(asset.get("marketCap"), 0) or 0
                sector_map[category]["assetCount"] += 1
                sector_map[category]["changes"].append(
                    safe_float(asset.get("priceChangePercentage24h"), 0) or 0
                )

            sector_dominance = sorted(
                [
                    {
                        "category": category,
                        "totalMarketCap": item["totalMarketCap"],
                        "marketShare": round(item["totalMarketCap"] / total_market_cap * 100, 2)
                        if total_market_cap > 0
                        else 0,
                        "assetCount": item["assetCount"],
                        "avgPriceChange24h": round(sum(item["changes"]) / len(item["changes"]), 2)
                        if item["changes"]
                        else 0,
                        "color": "#64748b",
                    }
                    for category, item in sector_map.items()
                ],
                key=lambda item: item["marketShare"],
                reverse=True,
            )

        volatility_scores = [
            {
                "assetId": row["asset_id"],
                "symbol": row["symbol"],
                "score": safe_float(row["score"], 0),
                "normalized": safe_int(row["normalized"], 0),
                "level": row["level"],
            }
            for row in volatility_rows
        ]

        if not volatility_scores:
            volatility_scores = [
                {
                    "assetId": asset["id"],
                    "symbol": asset["symbol"],
                    "score": abs(safe_float(asset.get("priceChangePercentage1h"), 0) or 0),
                    "normalized": 0,
                    "level": "low",
                }
                for asset in assets
            ]

        volume_velocity = [
            {
                "assetId": row["asset_id"],
                "symbol": row["symbol"],
                "volumeChange30m": safe_float(row["volume_change_30m"], 0),
                "currentVolume": safe_float(row["current_volume"], 0),
                "previousVolume": safe_float(row["previous_volume"], 0),
                "isAnomaly": bool(row["is_anomaly"]),
            }
            for row in volume_rows
        ]

        if not volume_velocity:
            volume_velocity = [
                {
                    "assetId": asset["id"],
                    "symbol": asset["symbol"],
                    "volumeChange30m": 0,
                    "currentVolume": safe_float(asset.get("totalVolume"), 0),
                    "previousVolume": safe_float(asset.get("totalVolume"), 0),
                    "isAnomaly": False,
                }
                for asset in assets
            ]

        sorted_assets = sorted(
            assets,
            key=lambda asset: safe_float(asset.get("priceChangePercentage24h"), 0) or 0,
            reverse=True,
        )

        defi_llama = _get_latest_defillama_snapshot(conn)

        return {
            "assets": assets,
            "volatilityScores": volatility_scores,
            "sectorDominance": sector_dominance,
            "volumeVelocity": volume_velocity,
            "marketKPIs": market_kpis,
            "topGainer": sorted_assets[0] if sorted_assets else None,
            "topLoser": sorted_assets[-1] if sorted_assets else None,
            "fearGreed": None,
            "defiLlama": defi_llama,
            "lastFetchedAt": timestamp,
            "nextFetchAt": datetime.utcnow().isoformat(),
            "databaseWarning": (
                "Exibindo último snapshot salvo no SQLite porque a coleta ao vivo "
                "não está disponível no momento."
            ),
        }