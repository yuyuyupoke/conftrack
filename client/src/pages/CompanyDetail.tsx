import { useEffect, useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, TrendingUp, FileText, Users } from "lucide-react";

interface PresentationData {
  学会タイトル: string;
  発表タイトル: string;
  発表者: string;
  発表者の所属: string;
}

interface GroupedPresentation {
  conference: string;
  presentations: PresentationData[];
}

export default function CompanyDetail() {
  const [, params] = useRoute("/company/:companyName");
  const companyName = params?.companyName ? decodeURIComponent(params.companyName) : "";
  
  const [data, setData] = useState<PresentationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([]);

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
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading CSV:', error);
        setLoading(false);
      });
  }, []);

  // この企業の発表データのみをフィルタリング
  const companyPresentations = useMemo(() => {
    return data.filter(item => item.発表者の所属 === companyName);
  }, [data, companyName]);

  // 学会ごとにグループ化
  const groupedByConference = useMemo(() => {
    const groups = new Map<string, PresentationData[]>();
    
    companyPresentations.forEach(item => {
      const conference = item.学会タイトル;
      if (!groups.has(conference)) {
        groups.set(conference, []);
      }
      groups.get(conference)!.push(item);
    });

    return Array.from(groups.entries())
      .map(([conference, presentations]) => ({
        conference,
        presentations
      }))
      .sort((a, b) => b.presentations.length - a.presentations.length);
  }, [companyPresentations]);

  // マッチ度スコアの計算（仮）
  const matchScore = useMemo(() => {
    // TODO: 実際のマッチ度スコアを計算する
    return Math.floor(Math.random() * 30) + 70; // 仮のスコア（70-100%）
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (companyPresentations.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container py-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                戻る
              </Button>
            </Link>
          </div>
        </header>
        <div className="container py-12 text-center">
          <Building2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <h2 className="text-2xl font-bold mb-2">企業が見つかりません</h2>
          <p className="text-muted-foreground mb-6">
            「{companyName}」の発表データが見つかりませんでした。
          </p>
          <Link href="/">
            <Button>ホームに戻る</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b bg-card">
        <div className="container py-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              戻る
            </Button>
          </Link>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">{companyName}</h1>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">マッチ度:</span>
                  <Badge variant="default" className="text-base font-semibold">
                    {matchScore}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">発表数:</span>
                  <Badge variant="secondary" className="text-base font-semibold">
                    {companyPresentations.length}件
                  </Badge>
                </div>
              </div>
              
              {/* マッチしたキーワード（仮） */}
              {matchedKeywords.length > 0 && (
                <div className="mt-3">
                  <span className="text-sm text-muted-foreground mr-2">マッチしたキーワード:</span>
                  <div className="inline-flex flex-wrap gap-1.5">
                    {matchedKeywords.map((keyword, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="container py-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          学会別発表一覧
        </h2>

        <div className="space-y-8">
          {groupedByConference.map((group, groupIdx) => (
            <div key={groupIdx}>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-primary">■</span>
                {group.conference}
                <Badge variant="secondary" className="ml-2">
                  {group.presentations.length}件
                </Badge>
              </h3>
              
              <div className="space-y-3">
                {group.presentations.map((presentation, idx) => (
                  <Card key={idx} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-medium leading-relaxed">
                        {presentation.発表タイトル}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          {presentation.学会タイトル}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {presentation.発表者}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
