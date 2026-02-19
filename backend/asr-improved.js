import WebSocket from "ws";
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 从环境变量获取API密钥
const apiKey = process.env.DASHSCOPE_API_KEY;

// 检查API密钥是否存在
if (!apiKey) {
  console.error('❌ 错误：未设置 DASHSCOPE_API_KEY 环境变量');
  console.error('请在 backend/.env 文件中添加有效的API密钥');
} else {
  console.log('✅ API密钥已配置');
}

// 创建ASR连接的函数
export function createASRConnection(onText) {
  // 生成32位随机ID
  const TASK_ID = uuidv4().replace(/-/g, '').slice(0, 32);

  const ws = new WebSocket('wss://dashscope.aliyuncs.com/api-ws/v1/inference/', {
    headers: {
      Authorization: `bearer ${apiKey}`
    }
  });

  let taskStarted = false; // 标记任务是否已启动
  let readyToSendAudio = false; // 标记是否可以发送音频
  let accumulatedText = ''; // 累积识别结果

  // 连接打开时发送run-task指令
  ws.on('open', () => {
    console.log('ASR WebSocket: 连接到服务器');
    sendRunTask();
  });

  // 接收消息处理
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    switch (message.header.event) {
      case 'task-started':
        console.log('ASR WebSocket: 任务开始');
        taskStarted = true;
        readyToSendAudio = true; // 现在可以发送音频数据了
        break;
      case 'result-generated':
        console.log('ASR识别结果：', message.payload.output.sentence.text);
        // 累积识别结果
        accumulatedText += message.payload.output.sentence.text;

        // 如果句子结束，触发回调函数
        if (message.payload.output.sentence.is_end) {
          onText(accumulatedText);
          accumulatedText = ''; // 清空累积文本
        }
        if (message.payload.usage) {
          console.log('ASR任务计费时长（秒）：', message.payload.usage.duration);
        }
        break;
      case 'task-finished':
        console.log('ASR任务完成');
        readyToSendAudio = false;
        // 如果还有累积的文本，在任务结束时发送
        if (accumulatedText) {
          onText(accumulatedText);
          accumulatedText = '';
        }
        break;
      case 'task-finished':
        console.log('ASR任务完成');
        readyToSendAudio = false;
        break;
      case 'task-failed':
        console.error('ASR任务失败：', message.header.error_message);
        readyToSendAudio = false;
        break;
      default:
        console.log('ASR未知事件：', message.header.event);
    }
  });

  // 发送run-task指令
  function sendRunTask() {
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
          format: 'pcm'  // 前端发送的是PCM格式
        },
        input: {}
      }
    };
    ws.send(JSON.stringify(runTaskMessage));
  }

  // 错误处理
  ws.on('error', (error) => {
    console.error('ASR WebSocket错误：', error);
    readyToSendAudio = false;
  });

  // 连接关闭处理
  ws.on('close', () => {
    if (!taskStarted) {
      console.error('ASR任务未启动，关闭连接');
    }
    console.log('ASR连接已关闭');
    readyToSendAudio = false;
  });

  // 发送音频数据 - 只有在准备好的时候才发送
  ws.sendAudioData = (audioChunk) => {
    if (ws.readyState === WebSocket.OPEN && readyToSendAudio) {
      ws.send(audioChunk);
    } else if (ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket未连接，无法发送音频数据');
    } else if (!readyToSendAudio) {
      console.log('ASR尚未准备就绪，稍后再试...');
    }
  };

  // 发送结束信号
  ws.sendEndSignal = () => {
    if (ws.readyState === WebSocket.OPEN && readyToSendAudio) {
      // 发送结束音频数据
      const endMessage = {
        header: {
          action: 'push-data',
          task_id: TASK_ID
        },
        payload: {
          input: {
            end: true
          }
        }
      };
      ws.send(JSON.stringify(endMessage));
    }
  };

  // 返回是否准备好发送音频的方法
  ws.isReady = () => readyToSendAudio;

  return ws;
}