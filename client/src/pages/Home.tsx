import { useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Search, Building2 } from "lucide-react";

interface PresentationData {
  学会タイトル: string;
  発表タイトル: string;
  発表者: string;
  発表者の所属: string;
}

interface CompanyCount {
  company: string;
  count: number;
}

export default function Home() {
  const [data, setData] = useState<PresentationData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // CSVデータを読み込む
  useEffect(() => {
    fetch('/data.csv')
      .then(response => response.text())
      .then(csvText => {
        const lines = csvText.split('\n');
        
        const parsedData: PresentationData[] = [];
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            // CSVパーサー: カンマを含むフィールドを正しく処理
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

  // 企業リストを抽出（所属から企業名を抽出）
  const companies = useMemo(() => {
    const companySet = new Set<string>();
    data.forEach(item => {
      const affiliation = item.発表者の所属;
      if (affiliation) {
        companySet.add(affiliation);
      }
    });
    return Array.from(companySet).sort();
  }, [data]);

  // 検索フィルター
  const filteredCompanies = useMemo(() => {
    if (!searchTerm) return companies;
    return companies.filter(company => 
      company.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [companies, searchTerm]);

  // 選択された企業の学会発表データを集計
  const chartData = useMemo(() => {
    if (selectedCompanies.size === 0) return [];

    const conferenceCount = new Map<string, number>();
    
    data.forEach(item => {
      if (selectedCompanies.has(item.発表者の所属)) {
        const conference = item.学会タイトル;
        conferenceCount.set(conference, (conferenceCount.get(conference) || 0) + 1);
      }
    });

    return Array.from(conferenceCount.entries())
      .map(([conference, count]) => ({
        学会名: conference,
        発表数: count
      }))
      .sort((a, b) => b.発表数 - a.発表数);
  }, [data, selectedCompanies]);

  // 企業選択のトグル
  const toggleCompany = (company: string) => {
    const newSelected = new Set(selectedCompanies);
    if (newSelected.has(company)) {
      newSelected.delete(company);
    } else {
      newSelected.add(company);
    }
    setSelectedCompanies(newSelected);
  };

  // 全選択/全解除
  const toggleAllFiltered = () => {
    if (filteredCompanies.every(c => selectedCompanies.has(c))) {
      // 全て選択されている場合は解除
      const newSelected = new Set(selectedCompanies);
      filteredCompanies.forEach(c => newSelected.delete(c));
      setSelectedCompanies(newSelected);
    } else {
      // 一部または全て未選択の場合は全選択
      const newSelected = new Set(selectedCompanies);
      filteredCompanies.forEach(c => newSelected.add(c));
      setSelectedCompanies(newSelected);
    }
  };

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

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">企業学会発表トラッカー</h1>
              <p className="text-sm text-muted-foreground">博士就活生のための学会発表分析ツール</p>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左側: 企業選択パネル */}
          <div className="lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">企業選択</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="企業名で検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center justify-between mt-3 text-sm">
                  <span className="text-muted-foreground">
                    {filteredCompanies.length}件の企業
                  </span>
                  <button
                    onClick={toggleAllFiltered}
                    className="text-primary hover:underline"
                  >
                    {filteredCompanies.every(c => selectedCompanies.has(c)) ? '全解除' : '全選択'}
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] lg:max-h-[600px] overflow-y-auto">
                  {filteredCompanies.map((company) => (
                    <div
                      key={company}
                      className="flex items-start gap-3 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => toggleCompany(company)}
                    >
                      <Checkbox
                        checked={selectedCompanies.has(company)}
                        onCheckedChange={() => toggleCompany(company)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label className="text-sm cursor-pointer flex-1 leading-relaxed">
                        {company}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右側: ヒストグラム */}
          <div className="lg:col-span-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">学会発表分布</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedCompanies.size > 0 
                    ? `${selectedCompanies.size}社を選択中` 
                    : '企業を選択してください'}
                </p>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="w-full h-[400px] lg:h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 10, left: 10, bottom: 100 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis 
                          dataKey="学会名" 
                          angle={-45}
                          textAnchor="end"
                          height={120}
                          interval={0}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis 
                          label={{ value: '発表数', angle: -90, position: 'insideLeft' }}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="発表数" 
                          fill="hsl(var(--primary))" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[400px] lg:h-[500px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center px-4">
                      <Building2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
                      <p className="text-sm lg:text-base">企業を選択すると、学会発表の分布が表示されます</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
