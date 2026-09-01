import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { prisma } from "@/lib/prisma";
import { thaiToArabic } from "@/components/law-mate/utils/textUtils";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    // @ts-ignore
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { htmlContent, fileName } = await req.json();

    if (!htmlContent) {
      return NextResponse.json({ error: "No HTML content provided" }, { status: 400 });
    }

    const $ = cheerio.load(htmlContent);
    const textContent = $("body").text().replace(/\s+/g, ' '); // simple fallback text

    // Find all decision label nodes
    const decisionNodes = $("*:contains('เลขที่คำพิพากษาศาลฎีกา'), *:contains('คำพิพากษาศาลฎีกาที่')").filter(function() {
      // Keep only the deepest elements containing the text
      return $(this).children(":contains('เลขที่คำพิพากษาศาลฎีกา'), :contains('คำพิพากษาศาลฎีกาที่')").length === 0;
    });

    if (decisionNodes.length === 0) {
      return NextResponse.json({ error: "ไม่พบ 'เลขที่คำพิพากษาศาลฎีกา' ในไฟล์นี้" }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;

    // Create an import batch to track this session
    const importBatch = await prisma.importBatch.create({
      data: {
        fileName: fileName || "Unknown File",
      }
    });

    // Process each decision node found
    for (let i = 0; i < decisionNodes.length; i++) {
      const node = $(decisionNodes[i]);
      
      // Try to find the container for this specific decision
      // It's usually a table, a list item, or a div wrapper
      // If we can't find a clear container, we'll try to scope our search to the DOM segment between this node and the next
      let container: any = node.closest('table, tbody, li, tr').parent(); 
      if (container.length === 0 || container.prop("tagName") === "BODY" || container.prop("tagName") === "HTML") {
         // Fallback to table if parent search goes too high
         container = node.closest('table');
      }
      if (container.length === 0) {
         // Fallback to a large div wrapper
         container = node.parent().parent();
      }

      // Helper to extract field within the container
      const extractField = (labelPatterns: string[], maxLength?: number) => {
        let result = "";
        for (const pattern of labelPatterns) {
          const elements = container.find(`*:contains("${pattern}")`).filter(function(this: any) {
            return $(this).children(`:contains("${pattern}")`).length === 0;
          });
          
          elements.each((_: number, element: any) => {
            if (result) return false; // break loop
            
            const el = $(element);
            let candidate = "";
            
            // 1. Check for Supreme Court UI list structure: <label>Label</label><ul><li>...</li></ul>
            const nextUl = el.next("ul");
            if (nextUl.length > 0) {
              const listItems: string[] = [];
              nextUl.find("li").each((_, li) => {
                const txt = $(li).text().trim();
                if (txt) {
                   const labelText = $(li).find('label').text().trim();
                   if (labelText) {
                      const roleText = $(li).clone().children().remove().end().text().trim();
                      if (roleText) {
                         listItems.push(`${labelText} - ${roleText}`);
                         return;
                      }
                   }
                   listItems.push(txt);
                }
              });
              candidate = listItems.join("\n");
            }

            // 2. Check if parent is list item with next list item
            if (!candidate) {
              const td = el.closest("td, th");
              if (td.length > 0) {
                const nextTd = td.next("td");
                if (nextTd.length > 0) {
                  candidate = nextTd.text().trim();
                }
              }
            }
            
            // 3. Next sibling (general)
            if (!candidate) {
              const nextSibling = el.next();
              if (nextSibling.length > 0 && !nextSibling.is('br')) {
                candidate = nextSibling.text().trim();
              }
            }

            // 4. Split within the same element's text
            if (!candidate) {
              const fullText = el.text();
              const match = fullText.split(pattern);
              if (match.length > 1 && match[1].trim() !== "") {
                if (match[0].trim().length < 5) {
                  candidate = match[1].replace(/^[:\s]+/, '').trim();
                }
              }
            }

            // 5. Check parent text
            if (!candidate) {
              const parent = el.parent();
              if (parent.length > 0) {
                 const parentText = parent.text();
                 if (parentText.length < 500) {
                   const parentMatch = parentText.split(pattern);
                   if (parentMatch.length > 1 && parentMatch[1].trim() !== "") {
                     if (parentMatch[0].trim().length < 5) {
                       candidate = parentMatch[1].replace(/^[:\s]+/, '').trim();
                     }
                   }
                 }
              }
            }
            
            if (candidate && (!maxLength || candidate.length <= maxLength)) {
               result = candidate;
            }
          });
          
          if (result) return result;
        }
        return result;
      };

      // Extract the decision number from the node itself or its adjacent elements
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

      if (decisionNumber) {
        // Auto-fix typos in the year (e.g. 123/4515 -> 123/2515)
        const typoMatch = decisionNumber.match(/^(.+?\/)(\d{4})(.*)/);
        if (typoMatch) {
          let yearPart = parseInt(typoMatch[2], 10);
          if (yearPart > 2600) {
            // Replace the first two digits with 25
            const fixedYear = "25" + typoMatch[2].substring(2);
            decisionNumber = typoMatch[1] + fixedYear + typoMatch[3];
          }
        }

        // Clean up: extract only up to the 4-digit year (Thai or Arabic), handling ranges and prefixes
        const cleanMatch = decisionNumber.match(/^(.+?\/(?:24|25|๒๔|๒๕)[0-9๐-๙]{2})/);
        if (cleanMatch) {
          decisionNumber = cleanMatch[1].trim();
        }
        
        // Strict validation: Must contain a slash, and must not be a huge paragraph
        if (!decisionNumber.includes('/') || decisionNumber.length > 40) {
          decisionNumber = "";
        }
      }

      if (!decisionNumber) continue;

      const partiesPlaintiff = extractField(["โจทก์:", "โจทก์ :", "ชื่อคู่ความ", "คู่ความ"], 150);
      const partiesDefendant = extractField(["จำเลย:", "จำเลย :"], 150);
      let parties: string | null = partiesPlaintiff && partiesDefendant ? `โจทก์: ${partiesPlaintiff} จำเลย: ${partiesDefendant}` : (partiesPlaintiff || partiesDefendant || extractField(["ชื่อคู่ความ", "คู่ความ"], 150));
      
      // Strict validation to prevent garbage data
      if (parties) {
          const invalidPrefixes = ["พิพากษา", "ศาล", "คดีหมายเลข", "การที่", "สำหรับ", "ข้อเท็จจริง", "คดีนี้"];
          const isInvalid = invalidPrefixes.some(prefix => parties!.trim().startsWith(prefix));
          if (parties.length > 250 || isInvalid) {
              parties = null;
          }
      }
      let shortSummary = extractField(["ย่อสั้น"]);
      let longSummary = extractField(["ย่อยาว", "รายละเอียด"]);
      
      // Look for specific classes if labels aren't found
      if (!shortSummary) {
        const shortEl = container.find('.item_short_text');
        if (shortEl.length > 0) {
          shortSummary = shortEl.text().trim();
        } else {
          // Alternative approach: search subsequent siblings within the parent list
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
          // Look for hidden-item class which usually holds long text
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

      let law = extractField(["ชื่อกฎหมาย", "กฎหมายที่เกี่ยวข้อง", "แยกตามกฎหมายและมาตรา"], 2000);
      if (law) {
        law = thaiToArabic(law);
        // Deduplicate laws
        const parts = law.split(/,|\n/).map(l => l.trim()).filter(Boolean);
        law = Array.from(new Set(parts)).join(', ');
      }
      const judge = extractField(["ชื่อองค์คณะ", "องค์คณะผู้พิพากษา"], 500);
      const source = extractField(["แหล่งที่มา"], 200);
      const caseNumberSupreme = extractField(["หมายเลขคดีคำของศาลฎีกา"], 100);
      const caseNumberLower = extractField(["หมายเลขคดีคำและหมายเลขคดีแดงของศาลชั้นต้น"], 200);
      const department = extractField(["แผนก"], 100);
      const court = extractField(["ศาลชั้นต้นและศาลอุทธรณ์ที่ตัดสิน", "ศาลที่ตัดสิน", "ศาลที่ตัดสิน:"], 300);

      let decisionYear = null;
      const yearMatch = decisionNumber.match(/\/(24[0-9]{2}|25[0-9]{2})/);
      if (yearMatch) {
        const parsedYear = parseInt(yearMatch[1], 10);
        if (parsedYear <= new Date().getFullYear() + 543) {
          decisionYear = parsedYear;
        }
      }

      try {
        const existing = await prisma.decision.findUnique({
          where: { decisionNumber },
        });

        if (existing) {
          // Merge logic: only overwrite if the new data is longer/more complete
          const updateData: any = {};
          
          if (parties) {
            if (!existing.parties || existing.parties.length > 200) {
              updateData.parties = parties; // Replace garbage or empty with valid new data
            } else if (parties.length > existing.parties.length) {
              updateData.parties = parties;
            }
          } else if (existing.parties && existing.parties.length > 200) {
            updateData.parties = null; // Clear existing garbage if no valid new data is found
          }

          if (shortSummary && (!existing.shortSummary || shortSummary.length > existing.shortSummary.length)) updateData.shortSummary = shortSummary;
          if (longSummary && (!existing.longSummary || longSummary.length > existing.longSummary.length)) updateData.longSummary = longSummary;
          if (law && (!existing.law || law.length > existing.law.length)) updateData.law = law;
          if (judge && (!existing.judge || judge.length > existing.judge.length)) updateData.judge = judge;
          if (source && (!existing.source || source.length > existing.source.length)) updateData.source = source;
          if (caseNumberSupreme && (!existing.caseNumberSupreme || caseNumberSupreme.length > existing.caseNumberSupreme.length)) updateData.caseNumberSupreme = caseNumberSupreme;
          if (caseNumberLower && (!existing.caseNumberLower || caseNumberLower.length > existing.caseNumberLower.length)) updateData.caseNumberLower = caseNumberLower;
          if (department && (!existing.department || department.length > existing.department.length)) updateData.department = department;
          if (court && (!existing.court || court.length > existing.court.length)) updateData.court = court;
          if (decisionYear && !existing.decisionYear) updateData.decisionYear = decisionYear;

          if (Object.keys(updateData).length > 0) {
            await prisma.decision.update({
              where: { decisionNumber },
              data: updateData,
            });
            updatedCount++;
          }
        } else {
          await prisma.decision.create({
            data: {
              decisionNumber,
              parties,
              shortSummary,
              longSummary,
              law,
              judge,
              source,
              caseNumberSupreme,
              caseNumberLower,
              department,
              court,
              decisionYear,
              importBatchId: importBatch.id, // Track import batch
            },
          });
          createdCount++;
        }
      } catch (err) {
        console.error(`Failed to save decision ${decisionNumber}:`, err);
      }
    }

    // Update batch counts
    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: { createdCount, updatedCount }
    });

    return NextResponse.json({ 
      success: true, 
      message: `ค้นพบ ${decisionNodes.length} รายการ, เพิ่มใหม่ ${createdCount} รายการ, อัปเดต ${updatedCount} รายการ`,
    });

  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
