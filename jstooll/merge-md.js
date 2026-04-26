const fs = require('fs').promises;
const path = require('path');

// 配置项
const CONFIG = {
    // 要读取的目录（当前目录）
    targetDir: '../md/吃瓜蒙主本人原视频Md',
    outPutDir: '.',
    // 合并后的输出文件名
    outputFile: 'merged.md',
    // 只处理 .md 文件
    fileExt: '.md',
    // 标题降级级数（1级 = h1变h2）
    headingLevel: 1
};

// 降级标题：# 变成 ##，## 变成 ###，以此类推
function downgradeHeadings(content, level = 1) {
    const prefix = '#'.repeat(level);
    // 正则匹配所有 markdown 标题
    return content.replace(/^(#{1,6})/gm, (match) => {
        return prefix + match;
    });
}

// 主合并函数
async function mergeMarkdownFiles() {
    try {
        // 1. 读取目录所有文件
        const files = await fs.readdir(CONFIG.targetDir);

        // 2. 筛选出 .md 文件 + 排除输出文件本身
        const mdFiles = files
            .filter(file =>
                path.extname(file).toLowerCase() === CONFIG.fileExt &&
                file !== CONFIG.outputFile
            )
            // 3. 排序（保证每次顺序一致）
            .sort();

        if (mdFiles.length === 0) {
            console.log('❌ 未找到任何 Markdown 文件');
            return;
        }

        console.log(`✅ 找到 ${mdFiles.length} 个 Markdown 文件：`);
        console.log(mdFiles.join('\n'));

        // 4. 依次读取、处理、合并内容
        const mergedContent = [];
        for (const file of mdFiles) {
            const filePath = path.join(CONFIG.targetDir, file);
            let content = await fs.readFile(filePath, 'utf8');

            // 标题降级
            content = downgradeHeadings(content, CONFIG.headingLevel);

            // 添加文件名作为分隔（可选，方便查看来源）
         //   mergedContent.push(`\n---\n# 来源：${file}\n---\n`);
            mergedContent.push(content);
        }

        // 5. 写入最终合并文件
        await fs.writeFile(
            path.join(CONFIG.outPutDir, CONFIG.outputFile),
            mergedContent.join('\n\n'),
            'utf8'
        );

        console.log(`\n🎉 合并完成！输出文件：${CONFIG.outputFile}`);

    } catch (err) {
        console.error('❌ 合并失败：', err);
    }
}

// 执行
mergeMarkdownFiles();