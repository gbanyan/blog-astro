#!/usr/bin/env node
/**
 * 字体子集化脚本
 * 使用 pyftsubset (需要安装 fonttools: pip install fonttools brotli)
 * 
 * 用法: node scripts/subset-font.mjs
 * 
 * 注意：此脚本需要先下载字体文件，或使用 Google Fonts API
 * 由于我们使用 next/font/google，Next.js 会自动优化字体加载
 * 此脚本主要用于本地字体文件的子集化
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// 常用繁体中文字符集（约3000-5000字）
const commonTCChars = `
的一是在不了有和人這中大為上個國我以要他時來用們生到作地於出就分對成會可主發年動同工也能下過子說產種面而方後多定行學法所民得經十三之進著等部度家電力裡如水化高自二理起小物實現加量都兩體制機當使點從業本去把性好應開它合還因由其些然前外天政四日那社義事平形相全表間樣與關各重新線內數正心反你明看原又麼利比或但質氣第向道命此變條只沒結解問意建月公無系軍很情者最立代想已通並提直題黨程展五果料象員革位入常文總次品式活設及管特件長求老頭基資邊流路級少圖山統接知較將組見計別她手角期根論運農指幾九區強放決西被幹做必戰先回則任取據處隊南給色光門即保治北造百規熱領七海口東導器壓志世金增爭濟階油思術極交受聯什認六共權收證改清己美再轉更單風切打白教速花帶安場身車例真務具萬每目至達走積示議聲報鬥完類離離戶科懸空需廠商校連斷深難近礦千週委素技備半辦青省列習響約支般史感勞便團往酸歷市克何除消構府稱太準精值號率族維劃選標寫存候毛親快效斯院查江型眼王按格養易置派層片始卻專狀育廠京識適屬圓包火住調滿縣局照參紅細引聽該鐵價嚴龍飛
`.trim().replace(/\s+/g, '');

async function subsetFont() {
  console.log('开始字体子集化...');
  
  // 注意：这个脚本需要你先下载字体文件到 fonts/ 目录
  // 或者使用 Google Fonts API 下载
  const fontsDir = join(process.cwd(), 'fonts');
  const fontPath = join(fontsDir, 'LXGWWenKaiTC-Regular.ttf');
  const outputDir = join(process.cwd(), 'public', 'fonts');
  
  if (!existsSync(fontPath)) {
    console.log('⚠️  字体文件不存在，跳过子集化');
    console.log(`   预期路径: ${fontPath}`);
    console.log('   提示: 由于使用 next/font/google，Next.js 会自动优化字体加载');
    return;
  }
  
  try {
    // 检查 pyftsubset 是否安装
    execSync('which pyftsubset', { stdio: 'ignore' });
    
    const outputPath = join(outputDir, 'LXGWWenKaiTC-Regular-subset.woff2');
    
    // 创建输出目录
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    // 生成 Unicode 范围
    const unicodes = Array.from(new Set(commonTCChars))
      .map(c => `U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`)
      .join(',');
    
    // 执行子集化
    const command = `pyftsubset "${fontPath}" --unicodes="${unicodes}" --flavor=woff2 --output-file="${outputPath}"`;
    
    execSync(command, { stdio: 'inherit' });
    
    console.log(`✅ 子集化完成: ${outputPath}`);
  } catch (error) {
    console.error('❌ 子集化失败:', error.message);
    console.log('\n提示: 需要安装 fonttools: pip install fonttools brotli');
  }
}

subsetFont();
