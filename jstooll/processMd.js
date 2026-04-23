const fs = require('fs').promises;
const path = require('path');

// 配置：处理当前目录下所有 .md 文件
const TARGET_DIR = '../md/吃瓜蒙主本人原视频Md';

// 判断是否全空白行
const isBlankLine = (str) => /^\s*$/.test(str);

async function startProcess() {
    try {
        const files = await fs.readdir(TARGET_DIR);
        const mdFiles = files.filter(f => path.extname(f).toLowerCase() === '.md');

        if (mdFiles.length === 0) {
            console.log('📂 未找到任何 md 文件');
            return;
        }

        console.log(`✅ 找到 ${mdFiles.length} 个 md 文件，开始处理...\n`);

        for (const file of mdFiles) {
            await processFile(file);
        }

        console.log('\n🎉 所有文件处理完成！');
    } catch (err) {
        console.error('❌ 错误：', err);
    }
}

async function processFile(filename) {
    const filePath = path.join(TARGET_DIR, filename);
    console.log(`━━━━━━ 处理：${filename} ━━━━━━`);

    try {
        // 1. 读取文件
        const content = await fs.readFile(filePath, 'utf8');
        const originalLines = content.split(/\r?\n/);

        // 2. 备份原文件
        await fs.writeFile(filePath + '.bak', content, 'utf8');

        // --------------------------
        // 步骤1：处理第一行标题
        // --------------------------
        let lines = [...originalLines];
        if (lines.length > 0) {
            let first = lines[0].trim();

            // 去掉 # + 3个数字
            first = first.replace(/^#\s*\d{3}/, '# ');

            // 去掉结尾 .txt
            first = first.replace(/\.txt$/, '');

            lines[0] = first;
        }

        // --------------------------
        // 步骤2：每行去前后空格 + 清理空白行
        // --------------------------
        const trimmedLines = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed !== '') {
                trimmedLines.push(trimmed);
            }
        }

        // --------------------------
        // 步骤3：文本之间自动加空行（保证分段正常）
        // --------------------------
        const finalLines = [];
        for (let i = 0; i < trimmedLines.length; i++) {
            finalLines.push(trimmedLines[i]);
            if (i < trimmedLines.length - 1) {
                finalLines.push(''); // 自动加空行分隔
            }
        }

        // --------------------------
        // 步骤4：检测是否有【备注】或【**备注】开头的行
        // --------------------------
        const hasRemark = finalLines.some(line =>
            line.startsWith('备注') || line.startsWith('**备注')
        );

        if (!hasRemark) {
            console.log(`⚠️  无备注行：${filename}`);
        } else {
            console.log(`✅ 已找到备注行：${filename}`);
        }

        // --------------------------
        // 写入处理后的内容
        // --------------------------
        const resultContent = finalLines.join('\n');
        await fs.writeFile(filePath, resultContent, 'utf8');

        console.log(`✅ ${filename} 处理完成\n`);

    } catch (err) {
        console.error(`❌ 处理失败 ${filename}：`, err);
    }
}

// 启动
startProcess();