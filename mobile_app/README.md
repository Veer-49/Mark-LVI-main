# JARVIS Mobile App

A mobile-optimized Progressive Web App (PWA) for controlling JARVIS AI Assistant from your phone.

## Features

- 🎤 **Voice Input** - Speak commands using your phone's microphone
- 💬 **Text Chat** - Type messages directly
- 📱 **Mobile-Optimized** - Designed for touch screens
- 🔗 **Remote Control** - Connect to desktop JARVIS over WiFi
- ⚙️ **Settings** - Configure server URL and pairing key
- 📲 **Installable** - Add to home screen on iOS and Android

## How to Use

### 1. Start JARVIS on Your Desktop

Make sure JARVIS is running on your computer:
```bash
cd "E:\Git hub\Mark-LVI-main"
py main.py
```

JARVIS will start the dashboard at `http://192.168.1.16:8000`

### 2. Open the Mobile App

Option A: **Local Testing**
- Open `mobile_app/index.html` in your browser
- Works on desktop and mobile browsers

Option B: **Serve the App**
```bash
cd mobile_app
python -m http.server 8080
```
Then open `http://YOUR_COMPUTER_IP:8080` on your phone

### 3. Configure Settings

- Tap the ⚙️ settings button
- Enter your JARVIS server URL (default: `http://192.168.1.16:8000`)
- If required, enter the pairing key from JARVIS desktop
- Tap "Save Settings"

### 4. Use the App

- **Type**: Enter text and tap the send button
- **Voice**: Tap the microphone button and speak
- JARVIS will respond in the chat

## Install as App (PWA)

### iOS (iPhone/iPad)
1. Open the app in Safari
2. Tap the Share button
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

### Android
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Tap "Add to Home Screen" or "Install App"
4. Tap "Install"

## Requirements

- JARVIS running on desktop (same WiFi network)
- Modern browser (Chrome, Safari, Firefox)
- WiFi connection between phone and computer

## Connection Issues

If the app can't connect:

1. **Check JARVIS is running** on your desktop
2. **Verify the IP address** - it should be your computer's local IP
3. **Check firewall** - Windows might block the connection
4. **Same WiFi network** - Phone and computer must be on the same network
5. **Test in browser** - Open `http://192.168.1.16:8000` in your phone's browser

## API Integration

The app connects to JARVIS's dashboard API. Currently it uses:

- `GET /api/status` - Check if JARVIS is online
- `POST /api/command` - Send commands to JARVIS

If these endpoints don't exist, you may need to add them to JARVIS's dashboard server.

## Customization

### Change Colors
Edit `style.css` to customize the theme:
- Primary color: `#00d2ff` and `#3a7bd5`
- Background: `#1a1a2e` and `#16213e`

### Change Server URL
Edit the default in `app.js`:
```javascript
this.serverUrl = localStorage.getItem('jarvisServerUrl') || 'http://YOUR_IP:8000';
```

## Future Enhancements

- [ ] Real-time audio streaming from JARVIS
- [ ] Push notifications for proactive messages
- [ ] Screen sharing/viewing
- [ ] File transfer support
- [ ] Multi-language support
- [ ] Dark/Light theme toggle

## Troubleshooting

**Voice input not working?**
- Ensure your browser supports Web Speech API
- Try Chrome or Safari (Firefox has limited support)
- Check microphone permissions

**App not connecting?**
- Verify both devices are on the same WiFi
- Check the IP address in settings
- Make sure JARVIS is running on desktop
- Try opening the server URL in your phone's browser

**App looks small on desktop?**
- The app is optimized for mobile
- Use browser DevTools to test mobile view
- Or resize your browser window

## License

This mobile app is part of the JARVIS project.
