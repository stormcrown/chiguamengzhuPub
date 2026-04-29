const fs = require('fs');
const path = require('path');

/**
 * 递归获取目录下的所有 .md 文件，并按文件夹和文件名排序
 * @param {string} dir 当前目录路径
 * @param {string} rootDir 根目录路径（用于计算相对路径）
 * @returns {Array} 排序后的文件列表，每个元素包含绝对路径和相对根目录的文件夹名
 */
function getSortedMarkdownFiles(dir, rootDir = dir) {
    let results = [];
    const items = fs.readdirSync(dir);

    // 分离文件夹和文件
    const folders = [];
    const files = [];
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            folders.push(item);
        } else if (stat.isFile() && item.toLowerCase().endsWith('.md')) {
            files.push(item);
        }
    }
    // 按名称排序（中文/英文自然排序）
    folders.sort((a, b) => a.localeCompare(b, 'zh'));
    files.sort((a, b) => a.localeCompare(b, 'zh'));

    // 先处理子文件夹
    for (const folder of folders) {
        const folderPath = path.join(dir, folder);
        const nested = getSortedMarkdownFiles(folderPath, rootDir);
        results = results.concat(nested);
    }

    // 再处理当前目录下的文件
    for (const file of files) {
        const absPath = path.join(dir, file);
        // 计算相对于根目录的文件夹路径（不包含根目录本身）
        let relativeFolder = path.relative(rootDir, dir);
        // 如果是根目录下的文件，relativeFolder 为空字符串
        results.push({
            absPath: absPath,
            folder: relativeFolder,
            fileName: file
        });
    }
    return results;
}

/**
 * 将 Markdown 内容中的所有标题级别提升一级（增加一个 #）
 * 例如：# 标题 -> ## 标题， ## 标题 -> ### 标题
 * 注意：只处理行首的标题标记（前面可以有空格，但标准 markdown 通常顶格）
 * @param {string} content 原始内容
 * @returns {string} 处理后的内容
 */
function demoteHeadings(content) {
    // 匹配行首任意数量的空白后跟 # 号并至少一个空格，后面是标题文字
    // 使用正则替换，每检测到一组 #，就在前面加一个 #
    // 注意：不处理代码块内的标题（简化版，为了精确可能需要复杂解析，但通常够用）
    return content.replace(/^( *)(#+)( +)/gm, (match, spaces, hashes, after) => {
        // 增加一个 #
        return spaces + '#' + hashes + after;
    });
}

/**
 * 合并所有 Markdown 文件，并输出到目标文件
 * @param {string} targetDir 要扫描的根目录
 * @param {string} outputFile 输出文件路径
 */
function mergeMarkdownFiles(targetDir, outputFile) {
    // 1. 校验目标目录是否存在
    if (!fs.existsSync(targetDir)) {
        console.error(`错误：目录 ${targetDir} 不存在。`);
        process.exit(1);
    }

    // 2. 获取排序后的文件列表（按文件夹和文件排序）
    const files = getSortedMarkdownFiles(targetDir, targetDir);

    if (files.length === 0) {
        console.log('未找到任何 .md 文件。');
        return;
    }

    // 3. 开始合并
    let mergedContent = '';
    let lastFolder = null;

    for (const item of files) {
        const { absPath, folder, fileName } = item;
        // 如果文件夹发生变化，添加文件夹标题（一级标题）
        if (folder !== lastFolder) {
            if (lastFolder !== null) {
                // 不同文件夹之间添加换行分隔
                mergedContent += '\n\n';
            }
            // 文件夹名作为一级标题（如果 folder 为空字符串，表示根目录，不添加标题？但也可添加"根目录"标题，根据需求选择）
            // 这里为了保持树状结构，仅当 folder 非空时添加标题
            if (folder) {
                // 显示相对路径作为标题，例如 "子文件夹" 或 "子文件夹/孙文件夹"
                mergedContent += `# ${folder}\n\n`;
            } else {
                // 根目录下的文件，可以不加额外标题，或者加一个"根目录"标题，这里选择不加
                // 为了清晰，可选添加一个 "# 根目录" 注释，但保持简洁此处跳过
            }
            lastFolder = folder;
        }

        // 读取文件内容
        let content = fs.readFileSync(absPath, 'utf8');
        // 标题降级（每个标题多加一个 #）
        content = demoteHeadings(content);

        // 添加文件分隔标记（可选，方便阅读）
        // 可以添加注释说明该文件来源，但不加也符合常规合并需求
        mergedContent += `\n## ${fileName}\n\n`;
        mergedContent += content;
        mergedContent += '\n\n';
    }

    // 4. 写入输出文件
    fs.writeFileSync(outputFile, mergedContent, 'utf8');
    console.log(`合并完成！共处理 ${files.length} 个文件，输出至：${outputFile}`);
}

// ========== 使用示例 ==========
// 请根据实际需要修改下面的路径
const targetDirectory = '../docs/md/v4';   // 要扫描的根文件夹
const outputMarkdownFile = './merged.md';      // 合并后的输出文件

// 执行合并
mergeMarkdownFiles(targetDirectory, outputMarkdownFile);