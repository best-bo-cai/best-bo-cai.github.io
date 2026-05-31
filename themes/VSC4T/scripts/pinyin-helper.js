/**
 * 汉字转拼音首字母 Helper
 * 优先使用 pinyin-pro 库（准确率99.846%）
 * 备用方案：使用常用汉字 Unicode 映射 + 区间判断
 * 支持所有 Unicode CJK 字符（基本区 + 扩展区 A-H）
 */

'use strict';

// 尝试加载 pinyin-pro 库
let pinyinPro = null;
try {
  pinyinPro = require('pinyin-pro');
  console.log('[pinyin-helper] 已加载 pinyin-pro 库，使用高精度拼音转换');
} catch (e) {
  console.log('[pinyin-helper] pinyin-pro 未安装，使用备用方案。建议运行 npm install pinyin-pro 以获得更准确的拼音转换');
}

/**
 * 检查字符是否为 CJK 统一汉字（包括所有扩展区）
 * @param {number} code - 字符的 Unicode 码点
 * @returns {boolean}
 */
function isCJKCharacter(code) {
  return (
    // CJK 基本区：U+4E00 - U+9FFF（20,992字）
    (code >= 0x4E00 && code <= 0x9FFF) ||
    // CJK 扩展 A 区：U+3400 - U+4DBF（6,592字）
    (code >= 0x3400 && code <= 0x4DBF) ||
    // CJK 扩展 B 区：U+20000 - U+2A6DF（42,720字）
    (code >= 0x20000 && code <= 0x2A6DF) ||
    // CJK 扩展 C 区：U+2A700 - U+2B73F（4,153字）
    (code >= 0x2A700 && code <= 0x2B73F) ||
    // CJK 扩展 D 区：U+2B740 - U+2B81F（222字）
    (code >= 0x2B740 && code <= 0x2B81F) ||
    // CJK 扩展 E 区：U+2B820 - U+2CEAF（5,762字）
    (code >= 0x2B820 && code <= 0x2CEAF) ||
    // CJK 扩展 F 区：U+2CEB0 - U+2EBEF（7,473字）
    (code >= 0x2CEB0 && code <= 0x2EBEF) ||
    // CJK 扩展 G 区：U+30000 - U+3134F（4,939字）
    (code >= 0x30000 && code <= 0x3134F) ||
    // CJK 扩展 H 区：U+31350 - U+323AF（4,192字）
    (code >= 0x31350 && code <= 0x323AF) ||
    // CJK 兼容汉字：U+F900 - U+FAFF
    (code >= 0xF900 && code <= 0xFAFF) ||
    // CJK 兼容汉字补充：U+2F800 - U+2FA1F
    (code >= 0x2F800 && code <= 0x2FA1F)
  );
}

// 常用标签/分类汉字首字母映射（扩展版本）
// 覆盖博客常用词汇
const COMMON_CHARS = {
  // A
  '安': 'A', '暗': 'A',
  // B
  '博': 'B', '部': 'B', '编': 'B', '板': 'B', '宝': 'B',
  // C
  '程': 'C', '测': 'C', '藏': 'C', '产': 'C', '传': 'C', '处': 'C', '窗': 'C', '财': 'C',
  // D
  '代': 'D', '电': 'D', '端': 'D', '动': 'D', '度': 'D', '典': 'D',
  // E
  // （E开头的常用字较少）
  // F
  '发': 'F', '方': 'F', '服': 'F', '分': 'F',
  // G
  '工': 'G', '官': 'G', '感': 'G', '购': 'G',
  // H
  '后': 'H', '活': 'H', '合': 'H',
  // J
  '技': 'J', '计': 'J', '截': 'J', '具': 'J', '件': 'J', '据': 'J', '教': 'J', '健': 'J', '交': 'J', '经': 'J',
  // K
  '开': 'K', '客': 'K', '库': 'K', '口': 'K', '卡': 'K', '康': 'K',
  // L
  '理': 'L', '络': 'L', '论': 'L', '旅': 'L', '乐': 'L',
  // M
  '密': 'M', '码': 'M', '美': 'M',
  // N
  '能': 'N',
  // P
  '片': 'P', '品': 'P', '频': 'P',
  // Q
  '去': 'Q', '器': 'Q', '全': 'Q', '前': 'Q', '情': 'Q', '企': 'Q',
  // R
  '软': 'R',
  // S
  '术': 'S', '水': 'S', '设': 'S', '数': 'S', '示': 'S', '试': 'S', '社': 'S', '食': 'S', '生': 'S', '收': 'S', '深': 'S', '视': 'S', '神': 'S', '上': 'S', '算': 'S',
  // T
  '图': 'T', '塔': 'T', '题': 'T', '统': 'T', '讨': 'T',
  // W
  '网': 'W', '文': 'W', '务': 'W', '物': 'W', '闻': 'W',
  // X
  '序': 'X', '系': 'X', '学': 'X', '习': 'X', '戏': 'X', '下': 'X', '享': 'X', '新': 'X', '行': 'X', '响': 'X',
  // Y
  '印': 'Y', '硬': 'Y', '云': 'Y', '运': 'Y', '影': 'Y', '音': 'Y', '娱': 'Y', '游': 'Y', '页': 'Y', '业': 'Y',
  // Z
  '站': 'Z', '章': 'Z', '主': 'Z', '智': 'Z', '综': 'Z', '载': 'Z',
};

/**
 * 备用方案：使用 Unicode 区间近似判断拼音首字母
 * 注意：这不是完全准确的，仅作为 pinyin-pro 不可用时的备选
 * @param {string} char - 单个汉字
 * @returns {string} - 拼音首字母（大写）
 */
function getFirstLetterFallback(char) {
  // 优先查找常用字映射
  if (COMMON_CHARS[char]) {
    return COMMON_CHARS[char];
  }
  
  // 使用 codePointAt 以正确处理增补平面字符（扩展区 B-H）
  const code = char.codePointAt(0);
  
  // 非基本区的汉字，返回默认值
  if (code < 0x4E00 || code > 0x9FFF) {
    // 扩展区字符返回 '#'（因为无法准确判断）
    return '#';
  }
  
  // 使用 Unicode 区间近似判断（仅适用于基本区）
  // 按照从高到低的顺序判断
  if (code >= 0x9EA0) return 'Z';
  if (code >= 0x9E3F) return 'Y'; 
  if (code >= 0x9C7C) return 'X';
  if (code >= 0x9876) return 'W';
  if (code >= 0x96E8) return 'Y';
  if (code >= 0x9274) return 'X';
  if (code >= 0x8FBE) return 'W';
  if (code >= 0x8D2F) return 'T';
  if (code >= 0x8BA8) return 'S';
  if (code >= 0x88C5) return 'R';
  if (code >= 0x8721) return 'Q';
  if (code >= 0x8303) return 'P';
  if (code >= 0x80A1) return 'N';
  if (code >= 0x7EDF) return 'M';
  if (code >= 0x7B14) return 'L';
  if (code >= 0x77EE) return 'K';
  if (code >= 0x7231) return 'J';
  if (code >= 0x6C49) return 'H';
  if (code >= 0x6784) return 'G';
  if (code >= 0x626F) return 'F';
  if (code >= 0x6076) return 'E';
  if (code >= 0x5927) return 'D';
  if (code >= 0x54C8) return 'C';
  if (code >= 0x5175) return 'B';
  
  return 'A';
}

/**
 * 获取单个字符的拼音首字母
 * @param {string} char - 单个字符（可能是代理对）
 * @returns {string} - 拼音首字母（大写）或 '#'
 */
function getFirstLetter(char) {
  if (!char) return '#';
  
  // 使用 codePointAt 获取完整的 Unicode 码点
  const code = char.codePointAt(0);
  
  // 检查是否为 CJK 字符
  if (!isCJKCharacter(code)) {
    const upper = char.toUpperCase();
    return /^[A-Z]$/.test(upper) ? upper : '#';
  }
  
  // 优先使用 pinyin-pro（高精度）
  if (pinyinPro) {
    try {
      const result = pinyinPro.pinyin(char, { 
        pattern: 'first', 
        toneType: 'none' 
      });
      if (result && result.length > 0) {
        const letter = result.charAt(0).toUpperCase();
        if (/^[A-Z]$/.test(letter)) {
          return letter;
        }
      }
    } catch (e) {
      // pinyin-pro 转换失败，使用备用方案
    }
  }
  
  // 备用方案
  return getFirstLetterFallback(char);
}

/**
 * 获取字符串首字符的拼音首字母
 * @param {string} str - 输入字符串
 * @returns {string} - 拼音首字母（大写）
 */
function getPinyinFirstLetter(str) {
  if (!str || str.length === 0) {
    return '#';
  }
  
  // 获取第一个字符（考虑代理对）
  // 对于增补平面字符（如扩展B区），需要正确处理代理对
  const firstCodePoint = str.codePointAt(0);
  let firstChar;
  if (firstCodePoint > 0xFFFF) {
    // 增补平面字符，占用2个UTF-16码元
    firstChar = String.fromCodePoint(firstCodePoint);
  } else {
    firstChar = str.charAt(0);
  }
  
  // 如果是英文字母，直接返回大写
  if (/^[A-Za-z]$/.test(firstChar)) {
    return firstChar.toUpperCase();
  }
  
  // 如果是数字，归类到 #
  if (/^[0-9]$/.test(firstChar)) {
    return '#';
  }
  
  // 获取拼音首字母
  return getFirstLetter(firstChar);
}

/**
 * 获取字符串的完整拼音排序键
 * 用于实现中英文混合按拼音排序
 * @param {string} str - 输入字符串
 * @returns {string} - 拼音排序键（小写）
 */
function getPinyinSortKey(str) {
  if (!str || str.length === 0) {
    return '';
  }
  
  // 如果 pinyin-pro 可用，获取完整拼音
  if (pinyinPro) {
    try {
      // 获取完整拼音（无声调，空格分隔）
      const result = pinyinPro.pinyin(str, {
        toneType: 'none',
        type: 'array'
      });
      if (result && Array.isArray(result)) {
        return result.join('').toLowerCase();
      }
    } catch (e) {
      // pinyin-pro 转换失败，使用备用方案
    }
  }
  
  // 备用方案：逐字符获取拼音首字母
  let sortKey = '';
  for (let i = 0; i < str.length; i++) {
    const codePoint = str.codePointAt(i);
    let char;
    if (codePoint > 0xFFFF) {
      char = String.fromCodePoint(codePoint);
      i++; // 跳过代理对的第二个码元
    } else {
      char = str.charAt(i);
    }
    
    // 如果是英文字母，直接添加
    if (/^[A-Za-z]$/.test(char)) {
      sortKey += char.toLowerCase();
    } else if (isCJKCharacter(codePoint)) {
      // CJK 字符，获取拼音首字母
      sortKey += getFirstLetter(char).toLowerCase();
    } else {
      // 其他字符保持原样
      sortKey += char;
    }
  }
  
  return sortKey;
}

// 注册 Hexo Helper
hexo.extend.helper.register('getPinyinFirstLetter', function(str) {
  return getPinyinFirstLetter(str);
});

hexo.extend.helper.register('getPinyinSortKey', function(str) {
  return getPinyinSortKey(str);
});

// 导出函数供其他脚本使用
module.exports = {
  getPinyinFirstLetter,
  getPinyinSortKey,
  getFirstLetter
};
