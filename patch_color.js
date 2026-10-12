const fs = require('fs');
let content = fs.readFileSync('src/app/admin/import-law/page.tsx', 'utf8');

const replaceTarget = `<div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">สีสัญลักษณ์</label>
              <div className="flex flex-wrap gap-2">
                {colors.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={\`w-8 h-8 rounded-full \${c.value} flex items-center justify-center transition-transform hover:scale-110 focus:outline-none \${color === c.value ? 'ring-2 ring-offset-2 ring-slate-400' : ''}\`}
                    title={c.name}
                  >
                    {color === c.value && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>`;

const newColorPicker = `<div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">สีสัญลักษณ์</label>
              <div className="flex flex-wrap gap-2 items-center">
                {colors.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={\`w-8 h-8 rounded-full \${c.value} flex items-center justify-center transition-transform hover:scale-110 focus:outline-none \${color === c.value ? 'ring-2 ring-offset-2 ring-slate-400' : ''}\`}
                    title={c.name}
                  >
                    {color === c.value && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
                
                <div className="w-px h-8 bg-slate-200 mx-1"></div>
                
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full overflow-hidden border border-slate-200 shadow-sm transition-transform hover:scale-110 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-slate-400" title="เลือกสีอื่นๆ">
                  <input
                    type="color"
                    value={color.startsWith('#') ? color : '#3b82f6'}
                    onChange={(e) => setColor(e.target.value)}
                    className="absolute inset-0 w-16 h-16 -top-2 -left-2 cursor-pointer border-0 p-0"
                  />
                  {color.startsWith('#') && <Check className="w-4 h-4 text-white absolute pointer-events-none drop-shadow-md" />}
                </div>
              </div>
            </div>`;

content = content.replace(replaceTarget, newColorPicker);
fs.writeFileSync('src/app/admin/import-law/page.tsx', content, 'utf8');
console.log('import-law page updated');