import { createASRConnection } from "./asr.js";
import { qwenChat } from "./chat.js";
import fetch from "node-fetch";

export function startConversation(wsClient) {
  const history = [];

  console.log("Creating new ASR connection for WebSocket client");

  const asrWS = createASRConnection(async userText => {
    console.log("ASR回调函数被调用，接收到文本:", userText);

    // 确保WebSocket客户端对象存在
    if (!wsClient) {
      console.error('WebSocket客户端对象不存在');
      return;
    }

    // 过滤掉可能的空白文本
    if (!userText || userText.trim() === '') {
      console.log('忽略空白的ASR识别结果');
      return;
    }

    console.log('收到ASR识别结果:', userText);

    // 检查WebSocket客户端是否存在且连接
    if (!wsClient || typeof wsClient.readyState === 'undefined') {
      console.error('WebSocket客户端状态无法检查');
      return;
    }

    console.log('WebSocket当前状态码:', wsClient.readyState, 'OPEN状态码:', wsClient.OPEN);
    if (wsClient.readyState !== wsClient.OPEN) {
      console.warn('WebSocket客户端未处于OPEN状态，状态码:', wsClient.readyState);

      // 尝试等待一段时间，看是否能恢复连接
      // 但在当前架构下，连接断开后无法恢复，只能记录问题
      return;
    }

    // 向前端发送用户语音转文字结果
    try {
      wsClient.send(JSON.stringify({
          type: "user",
          text: userText
      }));
      console.log('成功发送用户消息到前端:', userText);
    } catch (error) {
      console.error('发送用户消息到前端失败:', error);
      return;
    }

    history.push({ role: "user", content: userText });

    console.log('发送给AI模型的输入:', userText);

    try {
      const reply = await qwenChat(history);

      console.log('AI模型回复:', reply);

      // 再次检查WebSocket连接状态
      if (!wsClient || typeof wsClient.readyState === 'undefined' || wsClient.readyState !== wsClient.OPEN) {
        console.warn('WebSocket客户端在AI处理后已关闭或状态异常');
        return;
      }

      history.push({ role: "assistant", content: reply });

      // TTS（复用你已有逻辑）
      const ttsResp = await fetch("http://localhost:3000/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply })
      });

      const audio = await ttsResp.arrayBuffer();

      wsClient.send(JSON.stringify({
        type: "assistant",
        text: reply,
        audio: Buffer.from(audio).toString("base64")
      }));

      console.log('已发送AI回复到前端');
    } catch (error) {
      console.error('处理AI回复时出错:', error);

      // 尝试发送错误消息到前端（如果连接可用）
      if (wsClient && typeof wsClient.readyState !== 'undefined' && wsClient.readyState === wsClient.OPEN) {
        try {
          wsClient.send(JSON.stringify({
            type: "assistant",
            text: "抱歉，我现在有点忙，稍后再聊好吗？",
            audio: ""
          }));
        } catch (sendError) {
          console.error('发送错误消息也失败了:', sendError);
        }
      }
    }
  });

  // 返回包含asrWS及其关闭方法的对象
  return {
    ...asrWS,
    close: () => {
      if (asrWS.close) {
        asrWS.close();
      }
    }
  };
}
