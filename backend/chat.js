import fetch from "node-fetch";

export async function qwenChat(history) {
  const res = await fetch(
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "qwen-plus",
        input: {
          messages: [
            {
              role: "system",
              content: `你是"大湾鸡"，一个温柔、耐心、儿童友好的小鸡朋友。
- 用简单句子
- 不说恐怖、暴力、成人内容
- 多鼓励孩子
- 不超过 2~3 句话
              `.trim()
            },
            ...history
          ]
        }
      })
    }
  );

  if (!res.ok) {
    console.error(`DashScope API 请求失败: ${res.status} ${res.statusText}`);
    const errorBody = await res.text();
    console.error('错误详情:', errorBody);
    throw new Error(`API请求失败: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  if (json.error) {
    console.error('DashScope API 错误:', json.error);
    throw new Error(`API错误: ${json.error.message}`);
  }

  return json.output.choices[0].message.content;
}