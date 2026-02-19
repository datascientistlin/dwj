// 测试脚本，用于验证 ASR 连接是否正常工作
import { createASRConnection } from './asr.js';

console.log('测试 ASR 连接...');

const testASR = createASRConnection((text) => {
  console.log('接收到识别文本:', text);
});

// 等待连接建立
setTimeout(() => {
  console.log('ASR 连接测试完成');
  testASR.close();
}, 5000);