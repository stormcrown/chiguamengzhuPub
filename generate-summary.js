const fs = require('fs');
const path = require('path');

// ===================== 核心配置 =====================
// 你的文档根目录（所有 md 放在这里）
const MD_ROOT_DIR = path.join('.', 'docs');

// SUMMARY.md 生成位置
const SUMMARY_OUTPUT_PATH = path.join('.', 'docs', 'SUMMARY.md');

// 忽略项
const IGNORE_FILES = ['SUMMARY.md', 'node_modules', '.git'];
// ====================================================

/**
 * 清理标题：去掉 # 和首尾空格
 */
function cleanTitle(line) {
    return line.replace(/^#+\s*/, '').trim();
}

/**
 * 读取文件第一行作为标题
 */
function getFileTitle(filePath) {
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath, 'utf8');
        let title = '';

        stream.on('data', (chunk) => {
            const lines = chunk.split('\n');
            title = cleanTitle(lines[0] || '未命名');
            stream.destroy();
            resolve(title);
        });

        stream.on('error', () => resolve('未命名'));
    });
}

/**
 * 递归遍历目录，自动识别 README.md
 */
function traverseDir(dir) {
    let results = [];
    const files = fs.readdirSync(dir);

    // 自然排序
    files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    // 检查当前目录是否有 README.md
    const hasReadme = files.includes('README.md');
    const readmeRelPath = hasReadme ? path.relative(MD_ROOT_DIR, path.join(dir, 'README.md')).replace(/\\/g, '/') : null;

    let childItems = [];

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        // 跳过忽略项 + 跳过 README（已经单独处理）
        if (IGNORE_FILES.includes(file) || file === 'README.md') continue;

        if (stat.isDirectory()) {
            const sub = traverseDir(fullPath);
            childItems.push({ type: 'dir', name: file, ...sub });
        } else if (file.toLowerCase().endsWith('.md')) {
            const relPath = path.relative(MD_ROOT_DIR, fullPath).replace(/\\/g, '/');
            childItems.push({ type: 'file', path: fullPath, relPath });
        }
    }

    return { hasReadme, readmeRelPath, children: childItems };
}

/**
 * 递归生成 SUMMARY 内容
 */
async function buildSummary(tree, indent = 0) {
    const lines = [];
    const prefix = '  '.repeat(indent);

    for (const item of tree.children) {
        if (item.type === 'file') {
            // 文件：正常生成
            const title = await getFileTitle(item.path);
            lines.push(`${prefix}- [${title}](${item.relPath})`);
        }
        else if (item.type === 'dir') {
            // 目录：判断是否有 README
            if (item.hasReadme) {
                // 有 README → 目录作为链接
                const dirTitle = await getFileTitle(path.join(MD_ROOT_DIR, item.readmeRelPath));
                lines.push(`${prefix}- [${dirTitle}](${item.readmeRelPath})`);
            } else {
                // 无 README → 普通目录分组
                lines.push(`${prefix}- **${item.name}**`);
            }

            // 子项目缩进 +1
            const subLines = await buildSummary(item, indent + 1);
            lines.push(...subLines);
        }
    }

    return lines;
}

/**
 * 生成 SUMMARY.md
 */
async function generateSummary() {
    try {
        console.log('🔍 扫描目录：', MD_ROOT_DIR);

        const rootTree = traverseDir(MD_ROOT_DIR);
        const summaryLines = await buildSummary(rootTree);

        const content = `# Summary

- [首页](README.md)

${summaryLines.join('\n')}
`;

        fs.writeFileSync(SUMMARY_OUTPUT_PATH, content, 'utf8');
        console.log('✅ 生成成功！');
        console.log('📄 路径：', SUMMARY_OUTPUT_PATH);

    } catch (err) {
        console.error('❌ 生成失败：', err);
    }
}

generateSummary();