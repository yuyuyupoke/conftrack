/**
 * Script to aggregate extracted presentation data and seed to database
 * Usage: tsx scripts/aggregate-and-seed-presentations.ts
 */

import { 
  getConferenceByName, 
  insertOrganization, 
  insertPresentation,
  getDb 
} from "../server/db";
import * as fs from "fs";
import * as path from "path";

interface PresentationData {
  title: string;
  presenter: string;
  affiliation: string;
}

interface ConferenceMapping {
  conferenceName: string;
  jsonFile: string;
}

// Mapping of conference names to their extracted JSON files
const conferenceMappings: ConferenceMapping[] = [
  {
    conferenceName: "日本認知科学会第42回大会",
    jsonFile: "/home/ubuntu/extracted_json_files/0_vmPdUJBve6K1innn8Poi49_1762746386643_na1fn_L2hvbWUvdWJ1bnR1L2pjc3MyMDI1X3ByZXNlbnRhdGlvbnM.json"
  },
  {
    conferenceName: "日本睡眠学会第49回定期学術集会",
    jsonFile: "/home/ubuntu/extracted_json_files/1_NvOVtB1LjWpmpOvlqcsMn4_1762746382126_na1fn_L2hvbWUvdWJ1bnR1L2pzc3I0OV9wcmVzZW50YXRpb25z.json"
  },
  {
    conferenceName: "サービス学会第12回国内大会",
    jsonFile: "/home/ubuntu/extracted_json_files/2_eRqZ0dtSHIMaQKH3CqAiXF_1762746413384_na1fn_L2hvbWUvdWJ1bnR1L2V4dHJhY3RlZF9wcmVzZW50YXRpb25zX2ZpbmFsX3Yy.json"
  },
  {
    conferenceName: "日本経済学会2025年春季大会",
    jsonFile: "/home/ubuntu/extracted_json_files/3_DNDTrEUweeCdvZr2u3AVDO_1762746302664_na1fn_L2hvbWUvdWJ1bnR1L2V4dHJhY3RlZF9wcmVzZW50YXRpb25zX2ZpbmFs.json"
  },
  {
    conferenceName: "2025年度統計関連学会連合大会",
    jsonFile: "/home/ubuntu/extracted_json_files/4_4dtW9HGKGDSTYSBMXjgJe5_1762747122206_na1fn_L2hvbWUvdWJ1bnR1L2pmc3NhMjAyNV9wcmVzZW50YXRpb25z.json"
  },
  {
    conferenceName: "第32回日本時間生物学会学術大会ポスター発表",
    jsonFile: "/home/ubuntu/extracted_json_files/5_0RamM2wHtinL1t5ln2ScIr_1762746274313_na1fn_L2hvbWUvdWJ1bnR1L2V4dHJhY3RlZF9wcmVzZW50YXRpb25z.json"
  },
  {
    conferenceName: "第63回日本生体医工学大会",
    jsonFile: "/home/ubuntu/extracted_json_files/6_BLT9XZWAbPqParPDeW1MWL_1762746541112_na1fn_L2hvbWUvdWJ1bnR1L2V4dHJhY3RlZF9wcmVzZW50YXRpb25z.json"
  },
  {
    conferenceName: "超異分野学会大阪2025",
    jsonFile: "/home/ubuntu/extracted_json_files/7_FXeHzWAorgl2Cxnmev5Nbb_1762746303582_na1fn_L2hvbWUvdWJ1bnR1L2Nob3VpYnVueWFfb3Nha2FfMjAyNV9wcmVzZW50YXRpb25z.json"
  },
  {
    conferenceName: "KDD2025 research track",
    jsonFile: "/home/ubuntu/extracted_json_files/8_qeGIedFUIZ4uGr7ITlWl5y_1762747009120_na1fn_L2hvbWUvdWJ1bnR1L2tkZDIwMjVfcHJlc2VudGF0aW9ucw.json"
  },
  {
    conferenceName: "APS2025",
    jsonFile: "/home/ubuntu/extracted_json_files/9_lYvataVKefCJNaID0zhMFb_1762748558592_na1fn_L2hvbWUvdWJ1bnR1L0FQUzIwMjVfZXh0cmFjdGVkX2RhdGE.json"
  },
  {
    conferenceName: "第16回プライマリ・ケア連合大会学術大会",
    jsonFile: "/home/ubuntu/extracted_json_files/10_ok5LRLu5mAfyPUPdXPfnoc_1762748147735_na1fn_L2hvbWUvdWJ1bnR1L3ByZXNlbnRhdGlvbnM.json"
  },
  {
    conferenceName: "第72回日本生態学会大会口頭発表",
    jsonFile: "/home/ubuntu/extracted_json_files/11_NXuTrmXlcV8Bwvx0KhpCAE_1762746687346_na1fn_L2hvbWUvdWJ1bnR1L2V4dHJhY3RlZF9wcmVzZW50YXRpb25z.json"
  }
];

async function seedPresentations() {
  console.log("Starting presentation data seeding...\n");
  
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed. Please check DATABASE_URL environment variable.");
    process.exit(1);
  }

  let totalPresentations = 0;
  let totalOrganizations = 0;
  let successCount = 0;
  let errorCount = 0;

  for (const mapping of conferenceMappings) {
    console.log(`\n=== Processing: ${mapping.conferenceName} ===`);
    
    try {
      // Get conference ID
      const conference = await getConferenceByName(mapping.conferenceName);
      if (!conference) {
        console.error(`  ✗ Conference not found: ${mapping.conferenceName}`);
        errorCount++;
        continue;
      }

      // Read JSON file
      if (!fs.existsSync(mapping.jsonFile)) {
        console.error(`  ✗ JSON file not found: ${mapping.jsonFile}`);
        errorCount++;
        continue;
      }

      const fileContent = fs.readFileSync(mapping.jsonFile, 'utf-8');
      const presentations: PresentationData[] = JSON.parse(fileContent);

      console.log(`  Found ${presentations.length} presentations`);

      let conferenceSuccessCount = 0;
      const organizationCache = new Map<string, number>();

      for (const presentation of presentations) {
        try {
          // Skip if missing required fields
          if (!presentation.title || !presentation.affiliation) {
            continue;
          }

          // Get or create organization
          let organizationId: number;
          if (organizationCache.has(presentation.affiliation)) {
            organizationId = organizationCache.get(presentation.affiliation)!;
          } else {
            const org = await insertOrganization(presentation.affiliation);
            if (!org || !org.id) {
              console.error(`  ✗ Failed to insert organization: ${presentation.affiliation}`);
              continue;
            }
            organizationId = org.id;
            organizationCache.set(presentation.affiliation, organizationId);
            totalOrganizations++;
          }

          // Insert presentation
          await insertPresentation(
            conference.id,
            organizationId,
            presentation.title,
            presentation.presenter || null,
            null // keywords will be added later
          );

          conferenceSuccessCount++;
          totalPresentations++;
        } catch (error) {
          console.error(`  ✗ Error processing presentation:`, error);
        }
      }

      console.log(`  ✓ Inserted ${conferenceSuccessCount} presentations`);
      successCount++;
    } catch (error) {
      console.error(`  ✗ Error processing conference: ${mapping.conferenceName}`, error);
      errorCount++;
    }
  }

  console.log(`\n=== Seeding Summary ===`);
  console.log(`Conferences processed: ${successCount}/${conferenceMappings.length}`);
  console.log(`Total presentations inserted: ${totalPresentations}`);
  console.log(`Total organizations created: ${totalOrganizations}`);
  console.log(`Errors: ${errorCount}`);
}

seedPresentations().catch(console.error);
