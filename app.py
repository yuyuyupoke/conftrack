
import os
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from janome.tokenizer import Tokenizer
from wordcloud import WordCloud
import matplotlib.pyplot as plt

# --- Page Config ---
st.set_page_config(
    page_title="ConfTrack",
    page_icon="🎓",
    layout="wide"
)

# --- Custom CSS for "Instagram DM-like" and modern feel ---
st.markdown("""
<style>
    .main {
        background-color: #f8f9fa;
    }
    h1 {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        color: #333;
        font-weight: 700;
        text-align: center;
        margin-bottom: 30px;
    }
    /* Fix text color in selectbox - targeting the value container and input */
    .stSelectbox div[data-baseweb="select"] {
        background-color: white !important;
        border-radius: 20px !important;
        color: #333 !important;
    }
    .stSelectbox div[data-baseweb="select"] span {
        color: #333 !important;
    }
    /* Ensure dropdown options are also visible */
    ul[data-baseweb="menu"] {
        background-color: white !important;
    }
    li[data-baseweb="option"] {
        color: #333 !important;
    }
    li[data-baseweb="option"]:hover {
        background-color: #f0f0f0 !important;
    }
    /* Metric styling */
    .metric-label {
        color: #777;
        font-size: 0.9em;
    }
    .metric-value {
        color: #333;
        font-size: 2em;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

# --- Header ---
st.title("ConfTrack")
st.markdown("<p style='text-align: center; color: #666;'>博士就活生のための学会トレンド分析</p>", unsafe_allow_html=True)

# --- Data Loading & Preprocessing ---
@st.cache_data
def load_and_process_data(filepath):
    df = pd.read_csv(filepath)
    
    # Fill NaN
    cols = ['所属1', '所属2', '所属3', '所属4']
    df[cols] = df[cols].fillna('')
    
    # Academia Keywords for Exclusion (Expanded for better accuracy)
    academia_keywords = [
        '大学', 'University', 'College', 'Institute of Technology', '高専', '高等専門学校', 'School', 'Academy', 'Polytechnic',
        '研究所', '研究センター', '機構', 'Institute', 'Laboratory', 'Center', 'CNRS', 'INRIA', 'UCLA', 'MIT', '振興会'
    ]
    
    def is_academia(affiliation):
        if not affiliation: return False
        return any(keyword in str(affiliation) for keyword in academia_keywords)

    def is_company(affiliation):
        if not affiliation: return False
        # If it's not academia, we treat it as a potential company for this MVP
        return not is_academia(affiliation)

    # Extract all companies involved in each paper
    # And determine if it's a collaboration
    
    processed_rows = []
    
    for idx, row in df.iterrows():
        affiliations = [row[c] for c in cols if row[c]]
        
        has_academia = any(is_academia(aff) for aff in affiliations)
        companies_in_paper = [aff for aff in affiliations if is_company(aff)]
        
        # Normalize company names (simple trimming for now)
        companies_in_paper = list(set([c.strip() for c in companies_in_paper]))
        
        if not companies_in_paper:
            continue # Skip if no company involved (Pure Academia)
            
        is_collaboration = has_academia
        
        for company in companies_in_paper:
            # Partners logic: All affiliations excluding the current company
            partners = [a for a in affiliations if a != company]
            partners_str = ", ".join(partners) if partners else "-"

            processed_rows.append({
                'Original_Index': idx,
                'Company': company,
                'Year': row['年度'],
                'Title': row['タイトル'],
                'Is_Collaboration': is_collaboration,
                'Conf_Name': row.get('学会名', 'Unknown'),
                'Partners': partners_str
            })
            
    return pd.DataFrame(processed_rows)

try:
    # Use absolute path relative to this script file to ensure it works on Cloud Run
    data_path = os.path.join(os.path.dirname(__file__), 'database', 'jsiam.csv')
    df_processed = load_and_process_data(data_path)
except Exception as e:
    st.error(f"データの読み込みに失敗しました: {e}")
    st.stop()

# --- Search Area ---
company_list = sorted(df_processed['Company'].unique())

col1, col2, col3 = st.columns([1, 2, 1])
with col2:
    search_query = st.text_input(
        "企業名を検索...",
        placeholder="例: NTT (該当する企業が自動でリストアップされます)",
    )
    
    # Tabs (Visual only for MVP as per design)
    tab_selection = st.radio("Search Mode", ["企業", "学会"], index=0, horizontal=True, label_visibility="collapsed")
    if tab_selection == "学会":
        st.info("現在、日本応用数理学会(JSIAM)のデータのみを表示しています。")

# Search Logic & Result List UI
selected_companies = []

if search_query:
    # 1. Find all partial matches
    matches = [c for c in company_list if search_query.lower() in c.lower()]
    
    # 2. Session State for Exclusions
    if 'excluded_companies' not in st.session_state:
        st.session_state.excluded_companies = set()
        
    # Reset exclusion if search query changes significantly? 
    # For now, we keep the exclusion list global or per session. 
    # To be user-friendly, maybe we provide a "Reset Filter" button.
    
    # 3. Filter out excluded ones
    active_matches = [m for m in matches if m not in st.session_state.excluded_companies]
    
    # 4. Display Logic (Right side / Below search)
    st.write(f"検索結果: {len(active_matches)}件 ヒット")
    
    # Limit display
    max_display = 10
    if 'show_all_results' not in st.session_state:
        st.session_state.show_all_results = False
        
    display_list = active_matches
    if not st.session_state.show_all_results:
        display_list = active_matches[:max_display]
        
    # Display Chips/Rows with 'x' button
    if active_matches:
        st.markdown("##### 対象企業リスト (xボタンで除外)")
        
        # Use a container for the list
        with st.container(border=True):
            for company in display_list:
                c1, c2 = st.columns([8, 1])
                with c1:
                    st.text(company)
                with c2:
                    if st.button("✕", key=f"btn_ex_{company}", help=f"{company}を集計から除外"):
                        st.session_state.excluded_companies.add(company)
                        st.rerun()
            
            # Show More Button
            if len(active_matches) > max_display and not st.session_state.show_all_results:
                if st.button(f"全{len(active_matches)}件を表示"):
                    st.session_state.show_all_results = True
                    st.rerun()

    # Reset Button (Recover excluded items)
    if st.session_state.excluded_companies:
        if st.button("除外フィルターをリセット"):
            st.session_state.excluded_companies = set()
            st.rerun()

    selected_companies = active_matches

# --- Dashboard Area ---
if selected_companies:
    # Filter data
    company_data = df_processed[df_processed['Company'].isin(selected_companies)]
    
    # Display names (truncate if too many)
    display_name = ", ".join(selected_companies)
    if len(selected_companies) > 3:
        display_name = f"{selected_companies[0]} 他{len(selected_companies)-1}件"
        
    st.markdown(f"### 🔍 分析結果: {display_name}")
    
    # Layout: 3 Columns
    viz_col1, viz_col2, viz_col3 = st.columns(3)
    
    # --- 1. Trend Chart (Bar) ---
    with viz_col1:
        with st.container(border=True):
            st.subheader("発表件数の推移")
            
            trend_data = company_data.groupby('Year').size().reset_index(name='Count')
            
            fig_trend = px.bar(
                trend_data, x='Year', y='Count',
                text='Count',
                color_discrete_sequence=['#5D9CEC']
            )
            fig_trend.update_layout(
                xaxis_title="年度",
                yaxis_title="件数",
                plot_bgcolor='white',
                margin=dict(l=20, r=20, t=30, b=20),
                height=300
            )
            # Make x-axis discrete (integers)
            fig_trend.update_xaxes(type='category')
            
            st.plotly_chart(fig_trend, use_container_width=True)

    # --- 2. Collaboration Ratio (Donut) ---
    with viz_col2:
        with st.container(border=True):
            st.subheader("産学連携比率")
            
            collab_counts = company_data['Is_Collaboration'].value_counts()
            # Map boolean to string
            labels = {True: '共同 (産学連携)', False: '単独 (企業のみ)'}
            collab_df = pd.DataFrame({
                'Type': [labels.get(x, str(x)) for x in collab_counts.index],
                'Count': collab_counts.values
            })
            
            total_count = collab_df['Count'].sum()
            
            fig_donut = px.pie(
                collab_df, values='Count', names='Type',
                hole=0.6,
                color_discrete_sequence=['#5D9CEC', '#ACD1F9']
            )
            fig_donut.update_layout(
                annotations=[dict(text=f'総計<br>{total_count}件', x=0.5, y=0.5, font_size=20, showarrow=False)],
                showlegend=True,
                legend=dict(orientation="h", yanchor="bottom", y=-0.2, xanchor="center", x=0.5),
                margin=dict(l=20, r=20, t=30, b=50),
                height=300
            )
            st.plotly_chart(fig_donut, use_container_width=True)

    # --- 3. Word Cloud ---
    with viz_col3:
        with st.container(border=True):
            st.subheader("頻出キーワード")
            
            text_content = " ".join(company_data['Title'].dropna().astype(str))
            
            # Tokenize using Janome
            t = Tokenizer()
            tokens = t.tokenize(text_content)
            words = []
            for token in tokens:
                part_of_speech = token.part_of_speech.split(',')[0]
                if part_of_speech in ['名詞']:
                    # Exclude common stop words (stopwords setting is simple here)
                    if token.surface not in ['の', 'こと', '研究', '解析', 'データ', '手法', '検討', '開発', '提案', '利用', '評価', '構築', 'モデル', 'シミュレーション', '応用', '計算']: 
                        words.append(token.surface)
            
            text_space_separated = " ".join(words)
            
            if text_space_separated.strip():
                # Generate WordCloud
                # note: font_path might need regular font if Hiragino is not available in container, but usually ok on local Mac
                wc = WordCloud(
                    background_color="white",
                    width=400,
                    height=300,
                    font_path='/System/Library/Fonts/Hiragino Sans GB.ttc', # Mac font
                    # colormap='Blues'
                ).generate(text_space_separated)
                
                # Use st.image to display directly, avoiding matplotlib conflicts
                st.image(wc.to_image(), use_column_width=True)
            else:
                st.info("キーワードを抽出できませんでした。")

    # --- 4. Data Table ---
    st.subheader("発表リストと共同研究パートナー")
    st.markdown("選択された企業の発表一覧です。「Partners」列には、共同研究先の機関（企業名を除いた所属）が表示されます。")
    
    # Sort by Year Descending
    display_df = company_data[['Year', 'Title', 'Company', 'Partners', 'Is_Collaboration', 'Conf_Name']].sort_values(by='Year', ascending=False)
    
    st.dataframe(
        display_df,
        column_config={
            "Year": st.column_config.NumberColumn("年度", format="%d"),
            "Title": "タイトル",
            "Company": "対象企業",
            "Partners": "共同研究パートナー (他所属)",
            "Is_Collaboration": "産学連携",
            "Conf_Name": "学会"
        },
        use_container_width=True,
        hide_index=True
    )

else:
    # Empty State / Landing
    st.markdown("""
    <div style="text-align: center; margin-top: 50px; color: #888;">
        <h3>👈 企業を選択して分析を開始してください</h3>
        <p>例: NTT, 日立製作所, 豊田中央研究所 など（複数選択可）</p>
    </div>
    """, unsafe_allow_html=True)

# --- Footer ---
st.markdown("---")
st.markdown("<p style='text-align: center; font-size: 0.8em;'>© 2025 ConfTrack | JSIAM Edition</p>", unsafe_allow_html=True)
