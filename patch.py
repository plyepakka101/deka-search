# -*- coding: utf-8 -*-
import io

with io.open('src/components/law-mate/components/SettingsView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add handleReset
content = content.replace(
    '  const updateSetting = (key: keyof AppSettings, value: any) => {',
    '''  const handleReset = () => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลโน้ต ไฮไลต์ และกฎหมายที่แก้ไขทั้งหมด?\\n\\nการกระทำนี้ไม่สามารถกู้คืนได้ (ยกเว้นคุณมีไฟล์ Backup)')) {
      resetData();
      alert('ล้างข้อมูลสำเร็จ ระบบจะรีโหลดหน้าเว็บ');
      window.location.reload();
    }
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {'''
)

# Add import resetData
content = content.replace(
    '''import { exportData, importData } from '../services/dataService';''',
    '''import { exportData, importData, resetData } from '../services/dataService';'''
)

# Add Line Height and Font Size
content = content.replace(
    '''              </div>
           </div>


        </div>''',
    '''              </div>
           </div>

           <hr className="border-gray-100 dark:border-gray-700" />

           {/* Font Size */}
           <div>
              <div className="flex justify-between items-center mb-2">
                 <div className="text-base font-medium text-gray-900 dark:text-gray-100">ขนาดตัวอักษร</div>
                 <div className="text-sm font-medium text-law-600 dark:text-law-400">{settings.fontSize || 16}px</div>
              </div>
              <input
                 type="range"
                 min="12"
                 max="32"
                 step="1"
                 value={settings.fontSize || 16}
                 onChange={(e) => {
                    const size = parseInt(e.target.value);
                    updateSetting('fontSize', size);
                    localStorage.setItem('preferred-font-size', size.toString());
                    document.documentElement.style.setProperty('--content-font-size', `${size}px`);
                 }}
                 className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-law-500"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                 <span>เล็ก (12px)</span>
                 <span>มาตรฐาน (16px)</span>
                 <span>ใหญ่ (32px)</span>
              </div>
           </div>

           <hr className="border-gray-100 dark:border-gray-700" />

           {/* Line Height */}
           <div>
              <div className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">ระยะห่างระหว่างบรรทัด</div>
              <div className="grid grid-cols-3 gap-3">
                 {[
                    { val: 1.5, label: 'แคบ' },
                    { val: 1.8, label: 'ปกติ' },
                    { val: 2.0, label: 'กว้าง' }
                 ].map((lh) => (
                    <button
                       key={lh.val}
                       onClick={() => updateSetting('lineHeight', lh.val)}
                       className={`py-2 rounded-lg border text-center transition-all ${settings.lineHeight === lh.val || (!settings.lineHeight && lh.val === 1.8) ? 'border-law-500 bg-law-50 dark:bg-law-900/30 text-law-700 dark:text-law-200 ring-1 ring-law-500' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                       <div className="text-sm font-medium">{lh.label}</div>
                    </button>
                 ))}
              </div>
           </div>

        </div>'''
)

# Add Danger Zone button
content = content.replace(
    '''              <input 
                  type="file" 
                  ref={fileInputRef}''',
    '''              <div className="mt-8 border-t border-gray-100 dark:border-gray-700 pt-6">
                  <h4 className="text-sm font-bold text-red-600 dark:text-red-400 mb-2">โซนอันตราย (Danger Zone)</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">ล้างข้อมูลทั้งหมดเพื่อให้แอปกลับไปเป็นค่าเริ่มต้น</p>
                  <button 
                      onClick={handleReset}
                      className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
                  >
                      ล้างข้อมูลทั้งหมด (Factory Reset)
                  </button>
              </div>
              
              <input 
                  type="file" 
                  ref={fileInputRef}'''
)

with io.open('src/components/law-mate/components/SettingsView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied.")