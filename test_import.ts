import * as cheerio from "cheerio";
import * as fs from "fs";

function testParse() {
  const htmlContent = fs.readFileSync("D:/Downloads/judgments_output.html", "utf-8");
  const $ = cheerio.load(htmlContent);

  const decisionNodes = $("*:contains('เลขที่คำพิพากษาศาลฎีกา'), *:contains('คำพิพากษาศาลฎีกาที่')").filter(function() {
    return $(this).children(":contains('เลขที่คำพิพากษาศาลฎีกา'), :contains('คำพิพากษาศาลฎีกาที่')").length === 0;
  });

  console.log("Found decision nodes:", decisionNodes.length);

  for (let i = 0; i < Math.min(2, decisionNodes.length); i++) {
    const node = $(decisionNodes[i]);
    
    let container: any = node.closest('table, tbody, li, tr').parent(); 
    if (container.length === 0 || container.prop("tagName") === "BODY" || container.prop("tagName") === "HTML") {
       container = node.closest('table');
    }
    if (container.length === 0) {
       container = node.parent().parent();
    }

    const extractField = (labelPatterns: string[]) => {
      let result = "";
      for (const pattern of labelPatterns) {
        const elements = container.find(`*:contains("${pattern}")`).filter(function(this: any) {
          return $(this).children(`:contains("${pattern}")`).length === 0;
        });
        
        if (elements.length > 0) {
          const el = $(elements[0]);
          
          const td = el.closest("td, th");
          if (td.length > 0) {
            const nextTd = td.next("td");
            if (nextTd.length > 0) {
              result = nextTd.text().trim();
              if (result) return result;
            }
          }
          
          const fullText = el.text();
          const match = fullText.split(pattern);
          if (match.length > 1 && match[1].trim() !== "") {
            result = match[1].replace(/^[:\s]+/, '').trim();
            if (result) return result;
          }

          // Check parent text (useful for <p><b>Label:</b> Value</p>)
          const parentText = el.parent().text();
          const parentMatch = parentText.split(pattern);
          if (parentMatch.length > 1 && parentMatch[1].trim() !== "") {
            result = parentMatch[1].replace(/^[:\s]+/, '').trim();
            if (result) return result;
          }
          
          const nextSibling = el.next();
          if (nextSibling.length > 0) {
            result = nextSibling.text().trim();
            if (result) return result;
          }
        }
      }
      return result;
    };

    let decisionNumber = "";
    const td = node.closest("td, th");
    if (td.length > 0) {
      const nextTd = td.next("td");
      if (nextTd.length > 0) {
        decisionNumber = nextTd.text().trim();
      }
    }
    if (!decisionNumber) {
      const match = node.text().split(/เลขที่คำพิพากษาศาลฎีกา|คำพิพากษาศาลฎีกาที่/);
      if (match.length > 1 && match[1].trim() !== "") {
        decisionNumber = match[1].replace(/^[:\s]+/, '').trim();
      } else {
        const nextSibling = node.next();
        if (nextSibling.length > 0) {
          decisionNumber = nextSibling.text().trim();
        }
      }
    }

    const partiesPlaintiff = extractField(["โจทก์", "ชื่อคู่ความ", "คู่ความ"]);
    const partiesDefendant = extractField(["จำเลย"]);
    const parties = partiesPlaintiff && partiesDefendant ? `โจทก์: ${partiesPlaintiff} จำเลย: ${partiesDefendant}` : (partiesPlaintiff || partiesDefendant || extractField(["ชื่อคู่ความ", "คู่ความ"]));
    let shortSummary = extractField(["ย่อสั้น"]);
    let longSummary = extractField(["ย่อยาว", "รายละเอียด"]);
    
    if (!shortSummary) {
      const shortEl = container.find('.item_short_text');
      if (shortEl.length > 0) {
        shortSummary = shortEl.text().trim();
      } else {
        const nextShort = node.closest('li').nextAll('.item_short_text').first();
        if (nextShort.length > 0) {
           shortSummary = nextShort.text().trim();
        }
      }
    }
    
    if (!longSummary) {
      const longEl = container.find('.item_long_text');
      if (longEl.length > 0) {
        longSummary = longEl.text().trim();
      } else {
        const hiddenEl = container.find('.hidden-item');
        if (hiddenEl.length > 0) {
          longSummary = hiddenEl.text().trim();
        } else {
           const nextLong = node.closest('li').nextAll('.item_long_text').first();
           if (nextLong.length > 0) {
              longSummary = nextLong.text().trim();
           }
        }
      }
    }

    let law = extractField(["ชื่อกฎหมาย", "กฎหมายที่เกี่ยวข้อง", "แยกตามกฎหมายและมาตรา"]);
    
    console.log("Decision:", decisionNumber);
    console.log("Parties:", parties);
    console.log("Law:", law);
    console.log("Short:", shortSummary.substring(0, 100).replace(/\n/g, ' '));
    console.log("Long:", longSummary.substring(0, 100).replace(/\n/g, ' '));
    console.log("---");
  }
}

testParse();
