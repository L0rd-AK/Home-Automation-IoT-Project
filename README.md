# 🏠 Smart Home Automation IoT Project

![Smart Home](https://img.shields.io/badge/Smart%20Home-IoT-blue.svg)
![ESP8266](https://img.shields.io/badge/ESP8266-WiFi-green.svg)
![Firebase](https://img.shields.io/badge/Firebase-Realtime%20DB-orange.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

A comprehensive **Internet of Things (IoT)** project that creates an intelligent home automation system using **ESP8266/ESP32**, **Firebase Realtime Database**, and a professional web interface. The system features automated lighting control based on ambient light and motion detection, along with manual device control capabilities.

## 🌟 Features

### 🤖 Smart Automation
- **Automatic Light Control**: LDR sensor automatically controls lighting based on ambient light levels
- **Motion Detection**: PIR sensor triggers lights when movement is detected
- **Smart Thresholds**: Configurable sensitivity for both light and motion sensors
- **Auto-Off Timer**: Motion-triggered lights automatically turn off after a set delay

### 🎛️ Device Control
- **4 Relay Control**: Individual control of up to 4 connected devices
- **Real-time Status**: Live status updates for all connected devices
- **Emergency Shutdown**: One-click emergency stop for all devices
- **Manual Override**: Override automatic controls when needed

### 🌐 Professional Web Interface
- **Modern UI**: Clean, responsive design with professional aesthetics
- **Real-time Dashboard**: Live sensor readings and device status
- **Notification System**: Real-time alerts and system notifications
- **Mobile Responsive**: Optimized for desktop, tablet, and mobile devices
- **Secure Authentication**: Firebase-based user authentication

### 📱 Monitoring & Analytics
- **Sensor Visualization**: Live charts and indicators for sensor data
- **System Health**: Real-time monitoring of device connectivity
- **Activity Logs**: Historical tracking of device operations
- **Performance Metrics**: Active device count and system statistics

## 🛠️ Hardware Requirements

### 📟 Microcontroller
- **ESP8266** (NodeMCU, Wemos D1 Mini) or **ESP32** development board
- USB cable for programming and power

### 🔌 Relay Module
- **4-Channel Relay Module** (5V or 3.3V compatible)
- Supports both high and low trigger modes
- Optically isolated for safety

### 📊 Sensors
- **LDR (Light Dependent Resistor)** with 10kΩ pull-down resistor
- **HC-SR501 PIR Motion Sensor** module
- Jumper wires and breadboard for connections

### ⚡ Power Supply
- **5V Power Adapter** (2A minimum for relay module)
- **3.3V** for ESP8266 (usually from onboard regulator)

## 🔧 Circuit Diagram & Wiring

### 💡 LDR Sensor Wiring
```
ESP8266/ESP32 Pin Layout:
┌─────────────────────┐
│   LDR Sensor        │
│  ┌─────────────┐    │
│  │    LDR      │    │ ── 3.3V
│  │   (Light    │    │ ── A0 (Analog)
│  │  Sensor)    │    │ ── GND
│  └─────────────┘    │
└─────────────────────┘
           │
      10kΩ Resistor
           │
         GND
```

### 🚶 PIR Motion Sensor
```
HC-SR501 PIR Sensor:
┌─────────────────────┐
│  VCC  │  OUT  │ GND │
└───────┼───────┼─────┘
        │       │
     3.3V    D8(GPIO15)
```

### 🔌 Relay Module Connections
```
4-Channel Relay Module:
┌──────────────────────────────┐
│ VCC  GND  IN1  IN2  IN3  IN4 │
└──┬────┬────┬────┬────┬────┬───┘
   │    │    │    │    │    │
  5V   GND   D1   D2   D5   D6
             ↓    ↓    ↓    ↓
          Relay Relay Relay Relay
            1    2    3    4
```

## 📋 Pin Configuration

| Component | ESP8266 Pin | ESP32 Pin | Function |
|-----------|-------------|-----------|----------|
| **LDR Sensor** | A0 | GPIO36 (A0) | Analog light reading |
| **PIR Sensor** | D8 (GPIO15) | GPIO19 | Digital motion detection |
| **Relay 1** | D1 (GPIO5) | GPIO18 | LDR-controlled light |
| **Relay 2** | D2 (GPIO4) | GPIO19 | Motion-controlled light |
| **Relay 3** | D5 (GPIO14) | GPIO21 | Manual control device |
| **Relay 4** | D6 (GPIO12) | GPIO22 | Manual control device |
| **Power (3.3V)** | 3V3 | 3V3 | Sensor power supply |
| **Ground** | GND | GND | Common ground |

## 🚀 Software Setup

### 1️⃣ Arduino IDE Configuration
```bash
# Install ESP8266 Board Package
1. Open Arduino IDE
2. Go to File → Preferences
3. Add board manager URL:
   http://arduino.esp8266.com/stable/package_esp8266com_index.json
4. Go to Tools → Board → Boards Manager
5. Search "ESP8266" and install
```

### 2️⃣ Required Libraries
Install these libraries via Library Manager:

**For ESP8266:**
```cpp
#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
```

**For ESP32:**
```cpp
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
```

### 3️⃣ Firebase Configuration
1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project
   - Enable Realtime Database

2. **Get Configuration**:
   - Project Settings → General → Your apps
   - Copy the configuration object

3. **Database Rules** (for development):
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```

### 4️⃣ Code Configuration
Update these values in your Arduino code:
```cpp
// WiFi Credentials
const char* ssid = "Your_WiFi_Name";
const char* password = "Your_WiFi_Password";

// Firebase Configuration
const char* firebaseHost = "your-project.firebaseio.com";
const char* firebaseAuth = "your-database-secret";
```

## 🌐 Web Interface Setup

### 📁 File Structure
```
IoT Project/
├── index.html          # Main dashboard page
├── styles.css          # Professional CSS styling
├── script.js           # JavaScript functionality
├── README.md           # This documentation
└── Arduino Code/
    └── main.ino        # ESP8266/ESP32 firmware
```

### 🔐 Authentication
- **Demo Credentials**: 
  - Email: `amit@gmail.com`
  - Password: `amit1234`
- **Secure Access**: Modify credentials in `script.js`

### 🎨 Design Features
- **Responsive Layout**: Works on all device sizes
- **Modern UI**: Professional design with smooth animations
- **Real-time Updates**: Live sensor data and device status
- **Interactive Controls**: Touch-friendly buttons and controls
- **Visual Feedback**: Color-coded status indicators

## ⚙️ Configuration & Customization

### 🎛️ Sensor Thresholds
Adjust these values in the Arduino code:
```cpp
// Light sensor threshold (0-1024)
#define LDR_DARK_THRESHOLD 500    // Lower = more sensitive to darkness

// PIR sensor delay (milliseconds)
#define PIR_DELAY_TIME 5000       // 5 seconds motion timeout

// Sampling intervals
#define SENSOR_READ_INTERVAL 1000  // Read sensors every 1 second
```

### 🔧 Advanced Settings
```cpp
// WiFi connection settings
#define WIFI_TIMEOUT 10000        // 10 seconds connection timeout
#define RECONNECT_INTERVAL 30000  // 30 seconds between reconnection attempts

// Firebase settings
#define DB_UPDATE_INTERVAL 2000   // Update database every 2 seconds
#define MAX_RETRY_ATTEMPTS 3      // Maximum connection retry attempts
```

## 🧪 Testing & Troubleshooting

### ✅ System Testing Checklist

**Hardware Test:**
- [ ] All connections are secure and correct
- [ ] Power supply provides stable voltage
- [ ] LEDs on ESP board indicate proper operation
- [ ] Relay module LEDs respond to controls

**Sensor Testing:**
- [ ] LDR responds to light changes (cover/uncover)
- [ ] PIR detects motion in its range
- [ ] Serial monitor shows sensor readings
- [ ] Firebase database updates with sensor data

**Network Testing:**
- [ ] ESP connects to WiFi successfully
- [ ] Web interface loads without errors
- [ ] Real-time updates work bidirectionally
- [ ] Authentication functions properly

### 🐛 Common Issues & Solutions

**Connection Problems:**
```cpp
// Issue: ESP won't connect to WiFi
// Solution: Check credentials and signal strength
if (WiFi.status() != WL_CONNECTED) {
  Serial.println("WiFi connection failed!");
  Serial.println("Check SSID and password");
}
```

**Sensor Issues:**
```cpp
// Issue: LDR readings are unstable
// Solution: Add smoothing filter
int smoothedLDR = (previousReading * 0.8) + (currentReading * 0.2);
```

**Firebase Errors:**
```cpp
// Issue: Database connection fails
// Solution: Verify Firebase configuration
if (!Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH)) {
  Serial.println("Firebase connection failed!");
}
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

## 📄 License

This project is licensed under the **MIT License**.

## 👥 Team

**Developed with ❤️ by Team-X**

- **Hardware Design**: IoT circuit design and sensor integration
- **Firmware Development**: ESP8266/ESP32 programming and optimization
- **Web Development**: Professional frontend and user experience
- **Database Architecture**: Firebase integration and real-time synchronization

---

**🏠 Transform your home into a smart home with this comprehensive IoT solution!**

*This project demonstrates the power of IoT technology in creating intelligent, automated environments that enhance comfort, security, and energy efficiency.*
