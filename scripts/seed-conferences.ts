/**
 * Script to seed conference data from Excel file
 * Usage: tsx scripts/seed-conferences.ts
 */

import { insertConference, getDb } from "../server/db";

interface ConferenceData {
  name: string;
  url: string;
  type: string;
}

const conferences: ConferenceData[] = [
  {
    name: "日本認知科学会第42回大会",
    url: "https://www.jcss.gr.jp/meetings/jcss2025/program.html",
    type: "国内会議"
  },
  {
    name: "日本睡眠学会第49回定期学術集会",
    url: "https://www.c-linkage.co.jp/jssr49/program/files/program.pdf",
    type: "国内会議"
  },
  {
    name: "サービス学会第12回国内大会",
    url: "http://ja.serviceology.org/events/domestic2024/sfs12_program_240221.pdf",
    type: "国内会議"
  },
  {
    name: "日本経済学会2025年春季大会",
    url: "https://pub-files.atlas.jp/public/jea2025s/pdf/jea2025s_program_all_ja_20250522145335193.pdf",
    type: "国内会議"
  },
  {
    name: "2025年度統計関連学会連合大会",
    url: "https://pub.confit.atlas.jp/ja/event/jfssa2025/sessions/program/WWJXMT",
    type: "国内会議"
  },
  {
    name: "第32回日本時間生物学会学術大会ポスター発表",
    url: "https://www.k-gakkai.jp/jsc32/common/pdf/program_poster.pdf",
    type: "国内会議"
  },
  {
    name: "第63回日本生体医工学大会",
    url: "https://pcojapan-online.com/uploads/program_0521.pdf",
    type: "国内会議"
  },
  {
    name: "超異分野学会大阪2025",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdXYmMo3_kRcZ6xxU4RFXRD4xpDQZ3vJQtRSekQ2XKXciNaxAItHLr4gkOa7KbpDtnb65sWXGUTjiS/pubhtml",
    type: "国内会議"
  },
  {
    name: "KDD2025 research track",
    url: "https://docs.google.com/spreadsheets/u/0/d/1uJOUeknUiPzjfmpakvRVkErtVQAA-n9vjBuYxFo9a_U/htmlview#gid=334659487",
    type: "国際会議"
  },
  {
    name: "APS2025",
    url: "https://www.psychologicalscience.org/redesign/wp-content/uploads/2025/06/ProgramBook_Export_6_4_2025.pdf",
    type: "国際会議"
  },
  {
    name: "第16回プライマリ・ケア連合大会学術大会",
    url: "https://plaza.umin.ac.jp/jpca2025/program/JPCA2025_program.pdf",
    type: "国内会議（優先順位低め）"
  },
  {
    name: "第72回日本生態学会大会口頭発表",
    url: "https://esj.ne.jp/meeting/72//wp-content/uploads/2024/12/JP_ESJ72_Oral_20241212.pdf",
    type: "国内会議"
  }
];

async function seedConferences() {
  console.log("Starting conference data seeding...");
  
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed. Please check DATABASE_URL environment variable.");
    process.exit(1);
  }

  let successCount = 0;
  let errorCount = 0;

  for (const conf of conferences) {
    try {
      await insertConference(conf.name, conf.url);
      console.log(`✓ Inserted: ${conf.name}`);
      successCount++;
    } catch (error) {
      console.error(`✗ Failed to insert: ${conf.name}`, error);
      errorCount++;
    }
  }

  console.log(`\nSeeding completed:`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Total: ${conferences.length}`);
}

seedConferences().catch(console.error);
