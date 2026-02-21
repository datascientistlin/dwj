document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const chickenImg = document.getElementById('chicken-img');
    const voiceBtn = document.getElementById('voice-btn');
    const speechText = document.getElementById('speech-text');
    const speechBubble = document.getElementById('speech-bubble');
    const asrStatusIndicator = document.getElementById('asr-status-indicator');
    const asrStatusText = document.getElementById('asr-status-text');
    const chatLog = document.getElementById('chat-log');
    const voiceBtnText = document.getElementById('voice-btn-text');

    // 大湾鸡图片数组
    const chickenViews = [
        'assets/images/Front.jpeg',
        'assets/images/Back.jpeg',
        'assets/images/Side.jpeg'
    ];

    // 当前显示的图片索引
    let currentViewIndex = 0;

    // 保存原始大湾鸡图片路径
    const originalChickenSrc = 'assets/images/Front.jpeg';

    // WebSocket connection
    let ws;
    let isRecording = false;
    let isPushToTalkActive = false;
    let audioContext;
    let processor;
    let inputStream;
    let pressTimer = null;

    // Track the last interaction time to prevent random speech during active conversation
    let lastInteractionTime = Date.now();

    // 预设的大湾鸡话语
    const chickenResponses = [
        "你好呀小朋友！",
        "我喜欢和你一起玩！",
        "今天天气真好呢！",
        "我们一起唱歌吧！",
        "咯咯咯~",
        "你今天开心吗？",
        "我可以陪你聊天哦！",
        "要不要听个故事？",
        "我最喜欢小朋友啦！",
        "我们做好朋友吧！"
    ];

    // 语音合成对象
    let speechSynthesis;
    let isSpeechSupported = true;
    const useQwenTTS = true;

    // 检查浏览器是否支持语音合成
    if ('speechSynthesis' in window) {
        speechSynthesis = window.speechSynthesis;
    } else {
        console.warn('浏览器不支持语音合成功能');
        isSpeechSupported = false;
    }

    // 通义千问TTS API函数
    async function speakWithQwenTTS(text) {
        try {
            console.log('🎵 正在调用通义千问TTS...', text);

            const response = await fetch("http://localhost:3000/api/tts", {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text })
            });

            if (!response.ok) throw new Error("TTS failed");

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            const audio = new Audio(audioUrl);
            audio.play();

            speechText.textContent = text;
        } catch (e) {
            console.warn("后端 TTS 失败，回退 Web Speech API");
            speakFallback(text);
        }
    }

    // 原始Web Speech API函数（回退选项）
    function speakFallback(text) {
        if (!isSpeechSupported) {
            speechText.textContent = text;
            return;
        }

        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.2;
        utterance.volume = 1;

        const voices = speechSynthesis.getVoices();
        const chineseVoice = voices.find(voice =>
            voice.lang.includes('zh') ||
            voice.name.includes('Chinese') ||
            voice.name.includes('Ting-Ting') ||
            voice.name.includes('Mei-Jia')
        );

        if (chineseVoice) {
            utterance.voice = chineseVoice;
        }

        speechText.textContent = text;
        speechSynthesis.speak(utterance);
    }

    // 统一的说话函数
    function speak(text) {
        if (useQwenTTS) {
            speakWithQwenTTS(text);
        } else {
            speakFallback(text);
        }
    }

    // 更新最后交互时间
    function updateLastInteraction() {
        lastInteractionTime = Date.now();
    }

    // 检查是否可以随机说话
    function canSpeakRandomly() {
        const now = Date.now();
        const timeSinceLastInteraction = now - lastInteractionTime;
        return timeSinceLastInteraction > 30000;
    }

    // 让大湾鸡说话
    function chickenSaySomething() {
        updateLastInteraction();
        const randomIndex = Math.floor(Math.random() * chickenResponses.length);
        const response = chickenResponses[randomIndex];
        speak(response);
    }

    // 切换大湾鸡视图
    function switchChickenView() {
        updateLastInteraction();
        currentViewIndex = (currentViewIndex + 1) % chickenViews.length;
        chickenImg.src = chickenViews[currentViewIndex];

        chickenImg.style.opacity = '0';
        setTimeout(() => {
            chickenImg.style.opacity = '1';
        }, 100);

        let response;
        switch(currentViewIndex) {
            case 0:
                response = "这是我的正面照，好看吗？";
                break;
            case 1:
                response = "这是我的背面，你觉得像什么？";
                break;
            case 2:
                response = "这是我的侧面，是不是很可爱？";
                break;
            default:
                response = chickenResponses[Math.floor(Math.random() * chickenResponses.length)];
        }
        speak(response);
    }

    // 播放动画效果
    function playAnimation() {
        updateLastInteraction();
        const animations = ['bounce', 'wiggle', 'eye-blink', 'talk-animation'];
        const randomAnimation = animations[Math.floor(Math.random() * animations.length)];

        animations.forEach(anim => {
            chickenImg.classList.remove(anim);
        });

        chickenImg.classList.add(randomAnimation);

        setTimeout(() => {
            chickenImg.classList.remove(randomAnimation);
        }, 2000);

        speak("你看我厉害吗？");
    }

    // 点击大湾鸡图片的交互 - 显示体育图片并播放TTS
    chickenImg.addEventListener('click', function() {
        updateLastInteraction();
        interactWithSports();
    });

    // 触摸事件（移动端优化）
    chickenImg.addEventListener('touchstart', function(e) {
        e.preventDefault();
        updateLastInteraction();
        interactWithSports();
    });

    // 体育图片交互功能
    function interactWithSports() {
        const sportsImages = [
            '举重', '乒乓球', '体操', '冲浪', '击剑', '垒球', '射击', '射箭',
            '帆船', '手球', '拳击', '排球', '摔跤', '攀岩', '曲棍球', '柔道',
            '棒球', '橄榄球', '武术套路', '武术散打', '水球', '游泳', '滑板',
            '现代五项', '田径', '皮划艇', '篮球', '网球', '羽毛球', '自行车',
            '艺术体操', '花样游泳', '赛艇', '足球', '跆拳道', '跳水', '蹦床',
            '铁人三项', '霹雳舞', '马拉松游泳', '马术', '高尔夫球'
        ];

        const randomSport = sportsImages[Math.floor(Math.random() * sportsImages.length)];
        showSportsImage(randomSport);
        speak(`我会${randomSport}，你可以吗？`);
    }

    // 显示体育图片 - 直接替换大湾鸡图片
    function showSportsImage(sportName) {
        chickenImg.src = `assets/images/Sports/${sportName}.png`;

        setTimeout(() => {
            chickenImg.src = originalChickenSrc;
        }, 5000);
    }

    // 更新ASR状态显示
    function updateASRStatus(status) {
        const statusClasses = {
            'connected': 'connected',
            'connecting': 'connecting',
            'disconnected': 'disconnected'
        };

        Object.values(statusClasses).forEach(cls => {
            asrStatusIndicator.classList.remove(cls);
        });

        if (status in statusClasses) {
            asrStatusIndicator.classList.add(statusClasses[status]);
        }

        const statusTexts = {
            'connected': '已连接',
            'connecting': '连接中...',
            'disconnected': '未连接'
        };

        asrStatusText.textContent = statusTexts[status] || '等待连接...';
    }

    // 初始化连接状态为连接中
    updateASRStatus('connecting');

    // 连接到对话WebSocket
    function connectConversationWS() {
        ws = new WebSocket("ws://localhost:3001");

        ws.onopen = () => {
            console.log("🎤 Conversation WS connected");
            updateASRStatus('connected');
        };

        ws.onmessage = e => {
            const msg = JSON.parse(e.data);
            console.log('Received WebSocket message:', msg);

            if (msg.type === "user") {
                console.log('Adding user message to chat:', msg.text);
                addChat("user", msg.text);
                updateLastInteraction();
            } else if (msg.type === "assistant") {
                console.log('Adding assistant message to chat:', msg.text);
                addChat("assistant", msg.text);
                playAudioFromBase64(msg.audio);
                updateLastInteraction();
            }
        };

        ws.onclose = () => {
            console.log("Connection lost, reconnecting...");
            updateASRStatus('disconnected');

            setTimeout(() => {
                console.log("Attempting to reconnect...");
                updateASRStatus('connecting');
                connectConversationWS();
            }, 3000);
        };

        ws.onerror = (err) => {
            console.error("WS error:", err);
            updateASRStatus('disconnected');
        };
    }

    connectConversationWS();

    // Microphone capture
    async function startMic() {
        inputStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(inputStream);

        processor = audioContext.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = e => {
            if (!isRecording || ws.readyState !== WebSocket.OPEN) return;

            const input = e.inputBuffer.getChannelData(0);
            const pcm = new Int16Array(input.length);

            for (let i = 0; i < input.length; i++) {
                pcm[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
            }

            ws.send(pcm.buffer);
            console.log('Sending audio chunk to WebSocket');
        };
    }

    // 语音按钮事件处理器 - 按住说话
    voiceBtn.addEventListener('mousedown', (e) => {
        updateLastInteraction();
        pressTimer = setTimeout(async () => {
            if (!audioContext) await startMic();
            isRecording = true;
            isPushToTalkActive = true;
            voiceBtn.classList.add('recording');
            voiceBtn.innerHTML = '🔴';
            voiceBtnText.textContent = '松开结束对话';
        }, 300);
    });

    voiceBtn.addEventListener('mouseup', () => {
        if (pressTimer) clearTimeout(pressTimer);

        if (isPushToTalkActive) {
            isRecording = false;
            isPushToTalkActive = false;
            voiceBtn.classList.remove('recording');
            voiceBtn.innerHTML = '🎤';
            voiceBtnText.textContent = '按住说话';

            setTimeout(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'user_done_speaking' }));
                }
            }, 100);
        } else {
            updateLastInteraction();
            chickenSaySomething();
        }
    });

    voiceBtn.addEventListener('mouseleave', () => {
        if (pressTimer) clearTimeout(pressTimer);

        if (isPushToTalkActive) {
            isRecording = false;
            isPushToTalkActive = false;
            voiceBtn.classList.remove('recording');
            voiceBtn.innerHTML = '🎤';
            voiceBtnText.textContent = '按住说话';

            setTimeout(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'user_done_speaking' }));
                }
            }, 100);
        }
    });

    // 触摸事件支持（移动端）
    voiceBtn.addEventListener('touchstart', async (e) => {
        e.preventDefault();
        updateLastInteraction();
        pressTimer = setTimeout(async () => {
            if (!audioContext) await startMic();
            isRecording = true;
            isPushToTalkActive = true;
            voiceBtn.classList.add('recording');
            voiceBtn.innerHTML = '🔴';
            voiceBtnText.textContent = '松开结束对话';
        }, 300);
    });

    voiceBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (pressTimer) clearTimeout(pressTimer);

        if (isPushToTalkActive) {
            isRecording = false;
            isPushToTalkActive = false;
            voiceBtn.classList.remove('recording');
            voiceBtn.innerHTML = '🎤';
            voiceBtnText.textContent = '按住说话';

            setTimeout(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'user_done_speaking' }));
                }
            }, 100);
        } else {
            updateLastInteraction();
            chickenSaySomething();
        }
    });

    // 页面加载时说一句欢迎语
    setTimeout(() => {
        updateLastInteraction();
        speak("你好！我是大湾鸡，很高兴见到你！");
    }, 1000);

    // 定期随机说话
    setInterval(() => {
        if (!isRecording && canSpeakRandomly() && !speechSynthesis.speaking) {
            const randomChance = Math.random();
            if (randomChance > 0.7) {
                chickenSaySomething();
            }
        }
    }, 30000);

    // Chat UI Helpers
    function addChat(role, text) {
        const p = document.createElement("p");
        p.className = role;
        p.textContent = text;
        chatLog.appendChild(p);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    // Audio playback helper
    function playAudioFromBase64(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: "audio/wav" });
        const audio = new Audio(URL.createObjectURL(blob));
        audio.play();
    }
});
