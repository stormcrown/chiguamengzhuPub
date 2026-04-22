const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const writeFile = promisify(fs.writeFile);

// ===================== 配置 =====================
const ROOT = './docs/';
const OUTPUT_FILE = path.join(ROOT, 'SUMMARY.md');

// 忽略的目录 & 文件
const IGNORE_DIRS = ['_book', 'node_modules', '.git', 'clean'];
const IGNORE_FILES = ['SUMMARY.md', 'README.md', 'GLOSSARY.md'];
// ===============================================

// 格式化标题
function getTitle(name) {
    return name.replace(/\.md$/i, '').replace(/[ \d@,，“”《》？：；——【】！]/g, '').replace(/['@好好学习天天向上']/g, '').replace(/['≠']/g,'不等于')  ;;
}

// 稳定排序：数字 + 字母 自然排序（不会乱）
function stableSort(entries) {
    return entries.sort((a, b) => {
        // 文件夹永远排前面
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;

        // 统一小写 + 自然排序（保证每次顺序一样）
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
}

// 递归扫描
async function scanDir(currentDir, indent = '') {
    let lines = [];
    const entries = await readdir(currentDir, { withFileTypes: true });

    // ========== 核心：稳定排序 ==========
    const sortedEntries = stableSort(entries);

    for (const entry of sortedEntries) {
        const fullPath = path.join(currentDir, entry.name);

        // 跳过忽略目录
        if (entry.isDirectory()) {
            const lowerName = entry.name.toLowerCase();
            if (IGNORE_DIRS.some(d => lowerName.includes(d))) continue;

            // 检查是否有 README.md
            const subFiles = await readdir(fullPath);
            const hasReadme = subFiles.some(f => f.toLowerCase() === 'readme.md');
            const relPath = path.relative(ROOT, fullPath).replace(/\\/g, '/');
            const title = getTitle(entry.name);

            // 分卷（你要的格式）
            if (hasReadme) {
                lines.push(`${indent}* [${title}](${relPath}/README.md)`);
            } else {
                lines.push(`${indent}* ${title}`);
            }

            // 递归子目录
            const subLines = await scanDir(fullPath, indent + '    ');
            lines.push(...subLines);
            continue;
        }

        // 只处理 md，跳过 README / SUMMARY
        const lowName = entry.name.toLowerCase();
        if (!lowName.endsWith('.md')) continue;
        if (IGNORE_FILES.includes(lowName)) continue;

        const relPath = path.relative(ROOT, fullPath).replace(/\\/g, '/');
        const title = getTitle(entry.name);
        lines.push(`${indent}* [${title}](${relPath})`);
    }

    return lines;
}

// 生成 SUMMARY
async function generateSummary() {
    console.log('🔍 正在生成 SUMMARY.md（稳定排序）...');
    const lines = await scanDir(ROOT);
    const content = `# Summary\n\n${lines.join('\n')}`;

    await writeFile(OUTPUT_FILE, content, 'utf8');
    console.log('✅ SUMMARY.md 生成成功！顺序永远固定！');
}

generateSummary().catch(err => console.error('❌ 错误：', err));