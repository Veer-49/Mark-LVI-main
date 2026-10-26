// JARVIS Mobile App - Main JavaScript

class JarvisMobile {
    constructor() {
        this.serverUrl = localStorage.getItem('jarvisServerUrl') || 'http://192.168.1.16:8000';
        this.pairingKey = localStorage.getItem('jarvisPairingKey') || '';
        this.isConnected = false;
        this.isRecording = false;
        this.recognition = null;
        
        this.initElements();
        this.initEventListeners();
        this.initSpeechRecognition();
        this.connectToServer();
    }

    initElements() {
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusDot = this.statusIndicator.querySelector('.status-dot');
        this.statusText = this.statusIndicator.querySelector('.status-text');
        this.chatContainer = document.getElementById('chatContainer');
        this.messageInput = document.getElementById('messageInput');
        this.voiceBtn = document.getElementById('voiceBtn');
        this.sendBtn = document.getElementById('sendBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettings = document.getElementById('closeSettings');
        this.saveSettings = document.getElementById('saveSettings');
        this.serverUrlInput = document.getElementById('serverUrl');
        this.pairingKeyInput = document.getElementById('pairingKey');
        this.voiceIndicator = document.getElementById('voiceIndicator');
    }

    initEventListeners() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        this.voiceBtn.addEventListener('click', () => this.toggleVoiceRecording());
        
        this.settingsBtn.addEventListener('click', () => {
            this.settingsModal.classList.add('active');
            this.serverUrlInput.value = this.serverUrl;
            this.pairingKeyInput.value = this.pairingKey;
        });
        
        this.closeSettings.addEventListener('click', () => {
            this.settingsModal.classList.remove('active');
        });
        
        this.saveSettings.addEventListener('click', () => this.saveSettings());
        
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.settingsModal.classList.remove('active');
            }
        });
    }

    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onstart = () => {
                this.isRecording = true;
                this.voiceBtn.classList.add('recording');
                this.voiceIndicator.classList.add('active');
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.messageInput.value = transcript;
                this.sendMessage();
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.stopRecording();
            };
            
            this.recognition.onend = () => {
                this.stopRecording();
            };
        } else {
            this.voiceBtn.style.display = 'none';
            console.log('Speech recognition not supported');
        }
    }

    toggleVoiceRecording() {
        if (this.isRecording) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    stopRecording() {
        this.isRecording = false;
        this.voiceBtn.classList.remove('recording');
        this.voiceIndicator.classList.remove('active');
    }

    async connectToServer() {
        this.updateStatus('connecting');
        
        try {
            const response = await fetch(`${this.serverUrl}/api/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (response.ok) {
                this.isConnected = true;
                this.updateStatus('connected');
                this.addSystemMessage('Connected to JARVIS');
            } else {
                throw new Error('Server not responding');
            }
        } catch (error) {
            this.isConnected = false;
            this.updateStatus('disconnected');
            this.addSystemMessage('Could not connect to JARVIS. Check settings.');
            console.error('Connection error:', error);
        }
    }

    updateStatus(status) {
        this.statusDot.className = 'status-dot';
        
        switch (status) {
            case 'connected':
                this.statusDot.classList.add('connected');
                this.statusText.textContent = 'Connected';
                break;
            case 'connecting':
                this.statusDot.classList.add('connecting');
                this.statusText.textContent = 'Connecting...';
                break;
            case 'disconnected':
                this.statusText.textContent = 'Disconnected';
                break;
        }
    }

    saveSettings() {
        this.serverUrl = this.serverUrlInput.value.trim();
        this.pairingKey = this.pairingKeyInput.value.trim();
        
        localStorage.setItem('jarvisServerUrl', this.serverUrl);
        localStorage.setItem('jarvisPairingKey', this.pairingKey);
        
        this.settingsModal.classList.remove('active');
        this.connectToServer();
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        this.addUserMessage(message);
        this.messageInput.value = '';
        
        // Send to JARVIS
        try {
            const response = await fetch(`${this.serverUrl}/api/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    pairing_key: this.pairingKey,
                }),
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.response) {
                    this.addJarvisMessage(data.response);
                }
            } else {
                throw new Error('Failed to send message');
            }
        } catch (error) {
            console.error('Send error:', error);
            this.addSystemMessage('Failed to send message. Check connection.');
        }
    }

    addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'user-message';
        messageDiv.innerHTML = `
            <div class="avatar">👤</div>
            <div class="message-content">
                <p>${this.escapeHtml(text)}</p>
            </div>
        `;
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addJarvisMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'jarvis-message';
        messageDiv.innerHTML = `
            <div class="avatar">🤖</div>
            <div class="message-content">
                <p>${this.escapeHtml(text)}</p>
            </div>
        `;
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'jarvis-message';
        messageDiv.innerHTML = `
            <div class="avatar">ℹ️</div>
            <div class="message-content">
                <p style="font-style: italic; color: rgba(255,255,255,0.7);">${this.escapeHtml(text)}</p>
            </div>
        `;
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new JarvisMobile();
});
