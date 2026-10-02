const fs = require('fs');
const readline = require('readline');

async function run() {
  const filePath = "C:/Users/BL0080/.gemini/antigravity/brain/e11bab07-19e7-4e68-aaee-6fa60b1f7299/.system_generated/logs/transcript_full.jsonl";
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes("Test Case Specification (EP + BVA)")) {
      const parsed = JSON.parse(line);
      const text = parsed.content || "";
      fs.writeFileSync("C:/Users/BL0080/.gemini/antigravity/scratch/parshwa_platinum_security/test_spec_full.md", text, "utf8");
      console.log("Successfully extracted test_spec_full.md, size:", text.length);
      return;
    }
  }
  console.log("Could not find line with test case specification");
}

run().catch(console.error);
