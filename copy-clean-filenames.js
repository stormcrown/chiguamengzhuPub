const fs = require('fs').promises;
const path = require('path');

// ===================== 【你只需要改这2个路径】 =====================
const SOURCE_DIR = './md/吃瓜蒙主本人原视频Md'; // 原目录
const TARGET_DIR = './docs/files/Yuan'; // 输出目录
// =================================================================

/**
 * 清理文件名：只保留 字母/数字/-/_/.
 * @param {string} fileName 原文件名
 * @returns {string} 干净的文件名
 */
function cleanFileName(fileName) {
    const ext = path.extname(fileName);
    const name = path.basename(fileName, ext);

    // 核心：替换所有 非英文/数字/-/_ 的字符
    const cleanName = name.replace(/[ @,，“”《》？：；——【】！]/g, '').replace(/['@好好学习天天向上']/g, '').replace(/['≠']/g,'不等于')  ;//≠
    return cleanName + ext;
}

/**
 * 递归复制文件 + 清理文件名
 */
async function copyAndCleanFiles(src, dest) {
    try {
        // 创建目标目录（递归）
        await fs.mkdir(dest, { recursive: true });

        // 读取源目录
        const entries = await fs.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            let destFileName = entry.name;

            // 文件：清理文件名
            if (entry.isFile()) {
                destFileName = cleanFileName(entry.name);
            }

            const destPath = path.join(dest, destFileName);

            if (entry.isDirectory()) {
                // 递归复制子目录
                await copyAndCleanFiles(srcPath, destPath);
            } else {
                // 复制文件
                await fs.copyFile(srcPath, destPath);
                console.log(`✅ 已复制：\n原：${srcPath}\n新：${destPath}\n`);
            }
        }
    } catch (err) {
        console.error('❌ 出错：', err);
    }
}

// 执行
copyAndCleanFiles(SOURCE_DIR, TARGET_DIR).then(() => {
    console.log('🎉 全部完成！所有文件已清理文件名并复制到目标目录');
});