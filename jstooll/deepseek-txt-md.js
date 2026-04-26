const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// 配置
const CONFIG = {
    inputDir: '../txt/测试文本',      // 输入文件夹
    outputDir: '../md/测试文本',    // 输出文件夹
    processedDir: './processed', // 处理完成后移动到此目录
    minFileSize: 102,        // 最小文件大小(1KB)
    apiKeyFileName:'deepseek-key.txt',
    apiUrl: 'https://api.deepseek.com/v1/chat/completions', // Deepseek : https://api.deepseek.com/v1/chat/completions
    model: 'deepseek-v4-flash',  // deepseek-reasoner
    delayMs: 1000             // 请求间隔
};

// 从key.txt读取API密钥
async function getApiKey() {
    try {
        const keyContent = await fs.readFile(CONFIG.apiKeyFileName, 'utf-8');
        const apiKey = keyContent.trim().split('\n')[0]; // 取第一行
        if (!apiKey) {
            throw new Error('key.txt文件为空');
        }
        console.log('✓ 已读取API密钥');
        return apiKey;
    } catch (error) {
        console.error('❌ 读取key.txt失败:', error.message);
        console.error('请确保key.txt文件存在，且第一行是您的API密钥');
        process.exit(1);
    }
}

// 创建必要的文件夹
async function ensureDirectories() {
    const dirs = [CONFIG.inputDir, CONFIG.outputDir, CONFIG.processedDir];
    for (const dir of dirs) {
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
            console.log(`创建文件夹: ${dir}`);
        }
    }
}

// 获取所有txt文件
async function getTxtFiles() {
    try {
        const files = await fs.readdir(CONFIG.inputDir);
        const txtFiles = files.filter(file =>
            file.toLowerCase().endsWith('.txt')
        );

        const validFiles = [];
        for (const file of txtFiles) {
            const filePath = path.join(CONFIG.inputDir, file);
            const stats = await fs.stat(filePath);
            if (stats.size >= CONFIG.minFileSize) {
                validFiles.push({
                    name: file,
                    path: filePath,
                    size: stats.size
                });
            } else {
                console.log(`跳过小文件: ${file} (${stats.size} bytes)`);
            }
        }

        return validFiles;
    } catch (error) {
        console.error('读取文件夹失败:', error);
        return [];
    }
}

// 读取文件内容
async function readFileContent(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return content;
    } catch (error) {
        console.error(`读取文件失败 ${filePath}:`, error);
        return null;
    }
}

// 调用API处理文本
async function processTextWithAPI(text, fileName, apiKey) {
    try {
        const response = await axios.post(
            CONFIG.apiUrl,
            {
                model: CONFIG.model,
                messages: [
                    { role: 'system', content: '整理以下文本为易读段落，修正错误的词汇，但是不要删减内容。在末尾写上备注，改了哪些词汇。' },
                    { role: 'user', content: text }
                ],

                reasoning_effort: "high",
                stream: false,
                temperature: 0.8,
                max_tokens: 81920
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            }
        );

        const processedText = response.data.choices[0].message.content;
        return processedText;
    } catch (error) {
        console.error(`API调用失败 (${fileName}):`, error.message);
        if (error.response) {
            console.error('API错误详情:', error.response.data);
        }
        return null;
    }
}

// 保存处理后的文件
async function saveProcessedFile(originalFileName, processedContent) {
    // 将原文件名中的.txt替换为.md
    const mdFileName = originalFileName.replace(/\.txt$/i, '.md');
    const outputPath = path.join(CONFIG.outputDir, mdFileName);

    try {
        await fs.writeFile(outputPath, processedContent, 'utf-8');
        console.log(`   保存成功: ${mdFileName}`);
        return outputPath;
    } catch (error) {
        console.error(`   保存文件失败:`, error);
        return null;
    }
}

// 移动原始文件到processed文件夹
async function moveOriginalFile(filePath, fileName) {
    const destPath = path.join(CONFIG.processedDir, fileName);
    try {
        await fs.rename(filePath, destPath);
        console.log(`移动原文件: ${fileName} -> ${CONFIG.processedDir}`);
        return true;
    } catch (error) {
        console.error(`移动文件失败 ${fileName}:`, error);
        return false;
    }
}

// 添加延迟
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 生成处理报告
async function generateReport(results) {
    const report = {
        timestamp: new Date().toISOString(),
        totalFiles: results.length,
        successCount: results.filter(r => r.success).length,
        failCount: results.filter(r => !r.success).length,
        details: results
    };

    const reportPath = path.join(CONFIG.outputDir, `report_${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n处理报告已生成: ${reportPath}`);

    // 打印摘要
    console.log('\n========== 处理摘要 ==========');
    console.log(`总文件数: ${report.totalFiles}`);
    console.log(`成功: ${report.successCount}`);
    console.log(`失败: ${report.failCount}`);
    console.log('==============================\n');
}

// 主函数
async function main() {
    console.log('开始批量处理TXT文件...\n');

    // 读取API密钥
    const apiKey = await getApiKey();

    // 创建必要的文件夹
    await ensureDirectories();

    // 获取所有txt文件
    const files = await getTxtFiles();

    if (files.length === 0) {
        console.log('没有找到符合条件的TXT文件');
        return;
    }

    console.log(`找到 ${files.length} 个需要处理的文件\n`);

    const results = [];

    // 逐个处理文件
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`\n[${i + 1}/${files.length}] 处理文件: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

        // 读取文件内容
        const content = await readFileContent(file.path);
        if (!content) {
            results.push({
                fileName: file.name,
                success: false,
                error: '读取文件失败'
            });
            continue;
        }

        // 检查内容是否为空
        if (!content.trim()) {
            console.log(`文件内容为空: ${file.name}`);
            results.push({
                fileName: file.name,
                success: false,
                error: '文件内容为空'
            });
            continue;
        }

        // 调用API处理
        console.log('正在调用API处理文本...');
        const processedContent = await processTextWithAPI(content, file.name, apiKey);

        if (!processedContent) {
            results.push({
                fileName: file.name,
                success: false,
                error: 'API处理失败'
            });
            continue;
        }

        // 保存处理后的文件
        const savedPath = await saveProcessedFile(file.name, '# '+file.name.replace(/\.txt$/i, '')+'\n\n'+processedContent);

        if (savedPath) {
            // 移动原文件到processed文件夹
         //   await moveOriginalFile(file.path, file.name);

            results.push({
                fileName: file.name,
                success: true,
                outputPath: savedPath,
                originalSize: file.size,
                processedSize: Buffer.byteLength(processedContent, 'utf-8')
            });

            console.log(`✓ 处理完成: ${file.name}`);
        } else {
            results.push({
                fileName: file.name,
                success: false,
                error: '保存文件失败'
            });
        }

        // 如果不是最后一个文件，添加延迟
        if (i < files.length - 1) {
            console.log(`等待 ${CONFIG.delayMs}ms 后处理下一个文件...`);
            await delay(CONFIG.delayMs);
        }
    }

    // 生成处理报告
    await generateReport(results);

    console.log('所有文件处理完毕！');
}

// 运行主函数
main().catch(error => {
    console.error('程序运行出错:', error);
});