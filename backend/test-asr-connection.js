import WebSocket from "ws";
import { v4 as uuidv4 } from 'uuid';

// 从环境变量获取API密钥
const apiKey = process.env.DASHSCOPE_API_KEY || 'sk-35183a8161fc4c81afdd09dda9f1579f';

// 生成32位随机ID
const TASK_ID = uuidv4().replace(/-/g, '').slice(0, 32);

console.log('尝试连接到ASR服务...');
console.log('API Key:', apiKey ? '已配置' : '未配置');

const ws = new WebSocket('wss://dashscope.aliyuncs.com/api-ws/v1/inference/', {
  headers: {
    Authorization: `bearer ${apiKey}`
  }
});

ws.on('open', () => {
  console.log('✅ ASR WebSocket: 成功连接到服务器');

  // 发送run-task指令
  const runTaskMessage = {
    header: {
      action: 'run-task',
      task_id: TASK_ID,
      streaming: 'duplex'
    },
    payload: {
      task_group: 'audio',
      task: 'asr',
      function: 'recognition',
      model: 'fun-asr-realtime',
      parameters: {
        sample_rate: 16000,
        format: 'pcm'
      },
      input: {}
    }
  };
  ws.send(JSON.stringify(runTaskMessage));
  console.log('✅ Run-task消息已发送');
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📊 收到消息:', message.header.event);

  if (message.header.event === 'task-started') {
    console.log('🎉 ASR任务已成功启动！');
    // 关闭连接
    ws.close();
  } else if (message.header.event === 'task-failed') {
    console.error('❌ ASR任务失败：', message.header.error_message);
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('🚨 ASR WebSocket错误：', error.message);
  if (error.message.includes('401')) {
    console.error('⚠️  可能是API密钥无效或未授权');
  } else if (error.message.includes('ECONNREFUSED')) {
    console.error('⚠️  无法连接到ASR服务器，可能是网络问题');
  }
  ws.close();
});

ws.on('close', () => {
  console.log('🔒 ASR连接已关闭');
});