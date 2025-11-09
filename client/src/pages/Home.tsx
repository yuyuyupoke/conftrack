import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, TrendingUp, Sparkles } from "lucide-react";

interface PresentationData {
  学会タイトル: string;
  発表タイトル: string;
  発表者: string;
  発表者の所属: string;
}

interface CompanyRanking {
  company: string;
  matchScore: number;
  presentationCount: number;
  matchedKeywords: string[];
}

export default function Home() {
  const { user, loading: authLoading, error, isAuthenticated, logout } = useAuth();

  const [data, setData] = useState<PresentationData[]>([]);
  const [researchTheme, setResearchTheme] = useState("");
  const [extractedKeywords, setExtractedKeywords] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // CSVデータを読み込む
  useEffect(() => {
    fetch('/data.csv')
      .then(response => response.text())
      .then(csvText => {
        const lines = csvText.split('\n');
        
        const parsedData: PresentationData[] = [];
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < lines[i].length; j++) {
              const char = lines[i][j];
              
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current);
            
            if (values.length >= 4) {
              parsedData.push({
                学会タイトル: values[0].trim(),
                発表タイトル: values[1].trim(),
                発表者: values[2].trim(),
                発表者の所属: values[3].trim()
              });
            }
          }
        }
        
        setData(parsedData);
        setDataLoading(false);
      })
      .catch(error => {
        console.error('Error loading CSV:', error);
        setDataLoading(false);
      });
  }, []);

  // 改善されたキーワード抽出（助詞・助動詞で分割）
  const extractKeywords = (text: string): string[] => {
    // 助詞・助動詞・接続詞のパターン
    const particlePatterns = [
      'を用いた', 'に基づく', 'における', 'について', 'による',
      'を', 'に', 'が', 'の', 'は', 'と', 'で', 'や', 'へ', 'から', 'まで', 'より',
      'など', 'などの', 'および', 'または', 'あるいは'
    ];
    
    // 正規表現で助詞・助動詞を区切り文字に変換
    let processed = text;
    particlePatterns.forEach(pattern => {
      processed = processed.replace(new RegExp(pattern, 'g'), '|');
    });
    
    // 区切り文字で分割
    const words = processed.split(/[|\s、。,・・・]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
    
    // 2文字以上のキーワードのみ
    const filtered = words.filter(word => word.length >= 2);
    
    // 重複を除去
    const unique = Array.from(new Set(filtered));
    
    return unique.slice(0, 5); // 最大5キーワード
  };

  // キーワード抽出を実行
  const handleAnalyze = () => {
    if (!researchTheme.trim()) return;
    
    setIsAnalyzing(true);
    setTimeout(() => {
      const keywords = extractKeywords(researchTheme);
      setExtractedKeywords(keywords);
      setIsAnalyzing(false);
    }, 500);
  };

  // 類似度スコアリング（簡易版）
  const companyRankings = useMemo((): CompanyRanking[] => {
    if (extractedKeywords.length === 0) return [];

    const companyMap = new Map<string, { count: number; matchedKeywords: Set<string> }>();

    data.forEach(item => {
      const company = item.発表者の所属;
      const title = item.発表タイトル.toLowerCase();
      
      const matchedKeywords = extractedKeywords.filter(keyword => 
        title.includes(keyword.toLowerCase())
      );

      if (matchedKeywords.length > 0) {
        if (!companyMap.has(company)) {
          companyMap.set(company, { count: 0, matchedKeywords: new Set() });
        }
        const companyData = companyMap.get(company)!;
        companyData.count++;
        matchedKeywords.forEach(kw => companyData.matchedKeywords.add(kw));
      }
    });

    const rankings: CompanyRanking[] = Array.from(companyMap.entries()).map(([company, data]) => {
      // スコア計算: (マッチしたキーワード数 / 総キーワード数) * 100 + (発表数 * 2)
      const keywordMatchRatio = data.matchedKeywords.size / extractedKeywords.length;
      const matchScore = Math.round(keywordMatchRatio * 70 + Math.min(data.count * 2, 30));
      
      return {
        company,
        matchScore,
        presentationCount: data.count,
        matchedKeywords: Array.from(data.matchedKeywords)
      };
    });

    return rankings.sort((a, b) => b.matchScore - a.matchScore);
  }, [data, extractedKeywords]);

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">ConferenceTracker</h1>
                <p className="text-sm text-muted-foreground">博士就活生のための企業研究マッチングツール</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="container py-8">
        {/* 研究テーマ入力エリア */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              あなたの研究テーマを入力してください
            </CardTitle>
            <CardDescription>
              研究テーマを入力すると、類似した研究を行っている企業をマッチ度順に表示します
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="例: 生体情報を用いた機械学習"
                  value={researchTheme}
                  onChange={(e) => setResearchTheme(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  className="text-base"
                />
              </div>
              <Button 
                onClick={handleAnalyze}
                disabled={!researchTheme.trim() || isAnalyzing}
                className="px-6"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    分析中...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    企業を検索
                  </>
                )}
              </Button>
            </div>

            {/* 抽出されたキーワード */}
            {extractedKeywords.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">抽出されたキーワード:</p>
                <div className="flex flex-wrap gap-2">
                  {extractedKeywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 企業ランキング表示エリア */}
        {companyRankings.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                マッチ度ランキング
              </h2>
              <p className="text-sm text-muted-foreground">
                {companyRankings.length}社が見つかりました
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {companyRankings.map((ranking, index) => (
                <Card key={ranking.company} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="text-lg font-bold px-3 py-1">
                            #{index + 1}
                          </Badge>
                          <h3 className="text-lg font-semibold text-foreground">
                            {ranking.company}
                          </h3>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="default" className="text-sm">
                            マッチ度: {ranking.matchScore}%
                          </Badge>
                          <Badge variant="secondary" className="text-sm">
                            発表数: {ranking.presentationCount}件
                          </Badge>
                        </div>

                        <div className="mt-3">
                          <p className="text-sm text-muted-foreground mb-1">マッチしたキーワード:</p>
                          <div className="flex flex-wrap gap-1">
                            {ranking.matchedKeywords.map((keyword, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="ml-4">
                        <Button variant="outline" size="sm">
                          詳細を見る
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : extractedKeywords.length > 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground">
                マッチする企業が見つかりませんでした。<br />
                別のキーワードで検索してみてください。
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground">
                研究テーマを入力して、あなたにマッチする企業を見つけましょう
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
