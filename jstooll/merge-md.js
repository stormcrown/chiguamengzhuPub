const fs = require('fs');
const path = require('path');

/**
 * 将中文数字（一、二、三……十、十一、二十）转换为整数
 * 支持范围：一 ~ 九九九九（但通常卷数不会太大）
 * @param {string} chineseNum 中文数字字符串
 * @returns {number} 对应的整数，如果无法解析则返回 Infinity
 */
function chineseNumberToInt(chineseNum) {
    const chineseMap = {
        '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
        '十': 10, '百': 100, '千': 1000, '万': 10000
    };
    // 简单处理：先匹配十、百、千等
    let result = 0;
    let temp = 0;
    for (let i = 0; i < chineseNum.length; i++) {
        const char = chineseNum[i];
        const num = chineseMap[char];
        if (num === undefined) continue; // 忽略非数字字符
        if (num >= 10) {
            if (temp === 0) temp = 1;
            result += temp * num;
            temp = 0;
        } else {
            temp = num;
        }
    }
    result += temp;
    return result;
}

/**
 * 从文件夹名中提取卷号（如“第一卷” → 1，“第十二卷” → 12）
 * @param {string} folderName 文件夹名
 * @returns {number} 卷号数字，提取失败返回 Infinity
 */
function extractVolumeNumber(folderName) {
    // 匹配中文数字：第?卷 或 直接以中文数字开头？这里假设格式为“第一卷”、“第二卷”等
    const match = folderName.match(/^第?([零一二三四五六七八九十百千万]+)卷?$/);
    if (match) {
        return chineseNumberToInt(match[1]);
    }
    // 备用：尝试提取阿拉伯数字
    const numMatch = folderName.match(/\d+/);
    if (numMatch) return parseInt(numMatch[0], 10);
    return Infinity;
}

/**
 * 从文件名中提取章数（如“第1章.md” → 1，“第12章.md” → 12）
 * @param {string} filename 文件名
 * @returns {number} 章数数字，提取失败返回 Infinity
 */
function extractEpisodeNumber(filename) {
    const match = filename.match(/第(\d+)章/);
    if (match) return parseInt(match[1], 10);
    const numMatch = filename.match(/\d+/);
    if (numMatch) return parseInt(numMatch[0], 10);
    return Infinity;
}

/**
 * 获取根目录下的所有子文件夹，并按卷号排序
 * @param {string} rootDir 根目录
 * @returns {Array} 排序后的文件夹名数组
 */
function getSortedSubfolders(rootDir) {
    const items = fs.readdirSync(rootDir);
    const folders = [];
    for (const item of items) {
        const fullPath = path.join(rootDir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            folders.push(item);
        }
    }
    // 按卷号排序
    folders.sort((a, b) => {
        const numA = extractVolumeNumber(a);
        const numB = extractVolumeNumber(b);
        return numA - numB;
    });
    return folders;
}

/**
 * 获取指定文件夹下的所有 .md 文件，并按章数排序
 * @param {string} folderPath 文件夹路径
 * @returns {Array} 排序后的文件名数组
 */
function getSortedMarkdownFiles(folderPath) {
    const items = fs.readdirSync(folderPath);
    const mdFiles = [];
    for (const item of items) {
        const fullPath = path.join(folderPath, item);
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && item.toLowerCase().endsWith('.md')) {
            mdFiles.push(item);
        }
    }
    // 按章数数字排序
    mdFiles.sort((a, b) => {
        const numA = extractEpisodeNumber(a);
        const numB = extractEpisodeNumber(b);
        return numA - numB;
    });
    return mdFiles;
}

/**
 * 将 Markdown 内容中的所有标题级别提升两级（增加两个 #）
 * 例如：# 标题 -> ### 标题， ## 标题 -> #### 标题
 * @param {string} content 原始内容
 * @returns {string} 处理后的内容
 */
function demoteHeadingsByTwo(content) {
    // 匹配行首的 # 号（可前导空格），增加两个 #
    return content.replace(/^( *)(#+)( +)/gm, (match, spaces, hashes, after) => {
        return spaces + '##' + hashes + after;
    });
}

/**
 * 合并所有 Markdown 文件，输出到目标文件
 * @param {string} rootDir 根目录（包含“第一卷”、“第二卷”等子文件夹）
 * @param {string} outputFile 输出文件路径
 */
function mergeMarkdownFiles(rootDir, outputFile) {
    // 1. 校验根目录
    if (!fs.existsSync(rootDir)) {
        console.error(`错误：目录 ${rootDir} 不存在。`);
        process.exit(1);
    }

    // 2. 获取排序后的子文件夹（卷）
    const folders = getSortedSubfolders(rootDir);
    if (folders.length === 0) {
        console.log('根目录下没有子文件夹。');
        return;
    }

    let mergedContent = '';
    let totalFileCount = 0;

    // 3. 遍历每个卷文件夹
    for (const folder of folders) {
        const folderPath = path.join(rootDir, folder);
        // 获取该卷下排序后的 .md 文件
        const mdFiles = getSortedMarkdownFiles(folderPath);
        if (mdFiles.length === 0) continue;

        // 添加二级标题（## 文件夹名）
        mergedContent += `## ${folder}\n\n`;

        // 处理该卷下的每个文件
        for (const mdFile of mdFiles) {
            const filePath = path.join(folderPath, mdFile);
            let content = fs.readFileSync(filePath, 'utf8');
            // 标题降两级
            content = demoteHeadingsByTwo(content);
            mergedContent += content;
            // 确保文件之间有空行分隔
            if (!content.endsWith('\n\n')) {
                mergedContent += '\n';
            }
            mergedContent += '\n';
            totalFileCount++;
        }
    }

    // 4. 写入输出文件
    fs.writeFileSync(outputFile, mergedContent, 'utf8');
    console.log(`合并完成！共处理 ${totalFileCount} 个文件，输出至：${outputFile}`);

    // 显示处理顺序以便确认
    console.log('\n处理顺序：');
    for (const folder of folders) {
        const folderPath = path.join(rootDir, folder);
        const mdFiles = getSortedMarkdownFiles(folderPath);
        if (mdFiles.length === 0) continue;
        console.log(`\n📁 ${folder}`);
        mdFiles.forEach((file, idx) => {
            console.log(`  ${idx + 1}. ${file}`);
        });
    }
}

// ========== 配置参数（请根据实际情况修改） ==========
const sourceDirectory = '../docs/md/v4/第零卷';   // 包含“第一卷”、“第二卷”等子文件夹的根目录
const outputMarkdown = '../docs/merge/第零卷.md';  // 合并后的输出文件

// 执行合并
mergeMarkdownFiles(sourceDirectory, outputMarkdown);