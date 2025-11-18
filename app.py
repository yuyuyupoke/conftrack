from __future__ import annotations

import os
import re
from io import BytesIO
from pathlib import Path
from typing import List, Optional

import pandas as pd
import streamlit as st

BASE_DIR = Path(__file__).resolve().parent
LOCAL_CSV_PATH = BASE_DIR / "presentations.csv"

# Environment-driven GCS settings (optional)
USE_GCS = os.getenv("USE_GCS", "0") == "1"
GCS_BUCKET = os.getenv("GCS_BUCKET")
GCS_BLOB = os.getenv("GCS_BLOB", "presentations.csv")


def normalize_keywords(raw_text: str) -> List[str]:
    if not raw_text:
        return []
    tokens = re.split(r"[,\s、。・/／;；]+", raw_text)
    cleaned: List[str] = []
    for token in tokens:
        word = token.strip()
        if len(word) < 2:
            continue
        if word not in cleaned:
            cleaned.append(word)
    return cleaned


def annotate_matches(df: pd.DataFrame, keywords: List[str]) -> pd.DataFrame:
    if not keywords:
        empty = df.copy()
        empty["matched_keywords"] = [[] for _ in range(len(empty))]
        empty["has_match"] = False
        return empty

    def extract_hits(title: str) -> List[str]:
        text = str(title)
        return [kw for kw in keywords if kw in text]

    annotated = df.copy()
    annotated["matched_keywords"] = annotated["title"].apply(extract_hits)
    annotated["has_match"] = annotated["matched_keywords"].apply(bool)
    return annotated


def build_rankings(annotated_df: pd.DataFrame) -> List[dict]:
    rankings: List[dict] = []
    for company, subset in annotated_df.groupby("organization"):
        total = len(subset)
        if total == 0:
            continue

        matched_rows = subset[subset["has_match"]]
        matched_count = len(matched_rows)
        if matched_count == 0:
            continue

        match_score = round((matched_count / total) * 100)
        matched_keywords = sorted(
            {kw for kw_list in matched_rows["matched_keywords"] for kw in kw_list}
        )

        rankings.append(
            {
                "company": company,
                "match_score": match_score,
                "matched_presentations": matched_count,
                "total_presentations": total,
                "matched_keywords": matched_keywords,
            }
        )

    rankings.sort(key=lambda r: (-r["match_score"], -r["matched_presentations"], r["company"]))
    return rankings


def rename_and_validate(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalize the CSV columns to the names used in the app.
    Expected input columns (from Manus export):
    - conference_name, title, author_name, organization_name
    """
    column_map = {
        "conference_name": "conference",
        "title": "title",
        "author_name": "author",
        "organization_name": "organization",
    }
    missing = [src for src in column_map if src not in df.columns]
    if missing:
        raise ValueError(f"CSV に必要なカラムが見つかりません: {missing}")
    renamed = df.rename(columns=column_map)
    return renamed[["conference", "title", "author", "organization"]]


def load_from_local(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"ローカル CSV が見つかりません: {path}")
    df = pd.read_csv(path)
    return rename_and_validate(df)


def load_from_gcs(bucket: str, blob_name: str) -> pd.DataFrame:
    try:
        from google.cloud import storage  # type: ignore
    except Exception as e:
        raise RuntimeError(
            "google-cloud-storage がインストールされていません。`pip install google-cloud-storage` を実行してください。"
        ) from e

    client = storage.Client()
    bucket_obj = client.bucket(bucket)
    blob = bucket_obj.blob(blob_name)
    if not blob.exists():
        raise FileNotFoundError(f"GCS オブジェクトが見つかりません: gs://{bucket}/{blob_name}")
    data_bytes = blob.download_as_bytes()
    df = pd.read_csv(BytesIO(data_bytes))
    return rename_and_validate(df)


@st.cache_data(show_spinner=False)
def load_presentations(use_gcs: bool) -> pd.DataFrame:
    if use_gcs:
        if not GCS_BUCKET:
            raise RuntimeError("GCS_BUCKET が設定されていません。")
        return load_from_gcs(GCS_BUCKET, GCS_BLOB)
    return load_from_local(LOCAL_CSV_PATH)


def main() -> None:
    st.set_page_config(page_title="Conference Tracker", layout="wide")
    st.title("Conference Tracker")
    st.caption("研究キーワードから企業のマッチ度を計算するツール")

    st.sidebar.header("データソース")
    st.sidebar.write(f"ローカル: `{LOCAL_CSV_PATH.name}`")
    st.sidebar.write(f"GCS 使用: {'ON' if USE_GCS else 'OFF'}")
    if USE_GCS:
        st.sidebar.write(f"バケット: `{GCS_BUCKET}`")
        st.sidebar.write(f"オブジェクト: `{GCS_BLOB}`")
        if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            st.sidebar.warning("GOOGLE_APPLICATION_CREDENTIALS が設定されていません。")

    try:
        presentations = load_presentations(USE_GCS)
    except Exception as e:
        st.error(f"データの読み込みに失敗しました: {e}")
        return

    with st.expander("使い方", expanded=True):
        st.markdown(
            """
            1. 研究キーワードを入力（スペース・カンマ区切り可）  
            2. 「マッチ度を計算」を押すと、企業ごとのマッチ度ランキングを表示  
            3. ランキングから企業を選ぶと、学会別の発表一覧を確認できます
            """
        )

    keyword_input = st.text_input(
        "研究キーワード",
        placeholder="例：生体情報, 機械学習, 医用画像",
    )
    compute_button = st.button("マッチ度を計算", type="primary")

    keywords = normalize_keywords(keyword_input)
    if compute_button and not keywords:
        st.warning("2文字以上のキーワードを入力してください。")

    if not keywords:
        st.info("キーワードを入力すると、マッチ度ランキングが表示されます。")
        return

    annotated = annotate_matches(presentations, keywords)
    rankings = build_rankings(annotated)

    st.subheader("マッチ度ランキング")
    if not rankings:
        st.write("該当する企業は見つかりませんでした。")
        return

    ranking_df = pd.DataFrame(
        [
            {
                "企業": r["company"],
                "マッチ度(%)": r["match_score"],
                "一致発表数": r["matched_presentations"],
                "総発表数": r["total_presentations"],
                "マッチしたキーワード": " / ".join(r["matched_keywords"]),
            }
            for r in rankings
        ]
    )
    st.dataframe(ranking_df, use_container_width=True)

    st.subheader("企業別の発表詳細")
    company_names = [r["company"] for r in rankings]
    selected_company = st.selectbox("企業を選択", company_names)

    company_records = annotated[annotated["organization"] == selected_company]
    matched_records = company_records[company_records["has_match"]]

    col1, col2, col3 = st.columns(3)
    col1.metric("総発表数", len(company_records))
    col2.metric("マッチした発表数", len(matched_records))
    match_ratio = 0
    if len(company_records) > 0:
        match_ratio = round((len(matched_records) / len(company_records)) * 100)
    col3.metric("マッチ度", f"{match_ratio}%")

    tab_match, tab_all = st.tabs(["マッチした発表", "全ての発表"])

    with tab_match:
        if matched_records.empty:
            st.write("この企業のマッチする発表はありません。")
        else:
            st.markdown("**マッチしたキーワード**")
            keywords_text = sorted(
                {kw for row in matched_records["matched_keywords"] for kw in row}
            )
            st.write(" / ".join(keywords_text) or "―")
            st.write("**発表一覧**")
            st.dataframe(
                matched_records[["conference", "title", "author"]]
                .rename(
                    columns={
                        "conference": "学会",
                        "title": "発表タイトル",
                        "author": "発表者",
                    }
                ),
                use_container_width=True,
            )

    with tab_all:
        st.dataframe(
            company_records[["conference", "title", "author", "has_match"]]
            .rename(
                columns={
                    "conference": "学会",
                    "title": "発表タイトル",
                    "author": "発表者",
                    "has_match": "キーワード一致",
                }
            )
            .assign(キーワード一致=lambda df: df["キーワード一致"].map({True: "◎", False: "―"})),
            use_container_width=True,
        )


if __name__ == "__main__":
    main()
