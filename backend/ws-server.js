import { WebSocketServer } from "ws";
import { startConversation } from "./conversation.js";

const wss = new WebSocketServer({ port: 3001 });

wss.on("connection", client => {
  console.log("🎤 Client connected for audio conversation");

  // 创建新的ASR会话，每个客户端连接都有自己独立的ASR连接
  const asr = startConversation(client);

  client.on("message", (data) => {
    // 检查是否为特殊控制信号
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'user_done_speaking') {
        console.log('收到用户完成说话信号');
        // 用户已完成说话，通知ASR处理最后的音频
        if (asr.sendEndSignal) {
          asr.sendEndSignal();
        }
        return; // 控制信号不需要进一步处理
      }
      if (message.type === 'ping' || message.type === 'status') {
        // 夺理其他可能的控制信号
        return;
      }
    } catch (e) {
      // 不是JSON数据，继续处理为音频数据
      console.log('Received audio data, forwarding to ASR');
    }

    // 只有当 ASR 连接准备就绪后再转发音频数据
    if (asr.isReady && asr.isReady()) {
      if (asr.sendAudioData) {
        asr.sendAudioData(data);
      } else {
        asr.send(data);
      }
    } else if (asr.sendAudioData) {
      console.log('ASR not ready, waiting for task-started event...');
      // 暂时不发送，等待连接就绪
    } else {
      asr.send(data);
    }
  });

  client.on("close", () => {
    console.log("🔌 Client disconnected - keeping ASR connection alive for completion");
    // 客户端断开不应立即影响ASR连接
    // ASR连接应继续运行直到任务完成或超时
    // 系统应允许ASR完成当前识别任务，然后再清理资源
    console.log("等待ASR完成当前任务...");
  });
});

console.log("✅ WebSocket ASR server running at ws://localhost:3001");
