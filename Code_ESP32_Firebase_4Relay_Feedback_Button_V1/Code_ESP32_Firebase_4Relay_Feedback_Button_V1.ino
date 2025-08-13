/*
  ESP8266 Smart Home Automation System
  Complete IoT system with Firebase integration
  
  Components:
  - DHT11 Temperature & Humidity Sensor
  - PIR Motion Sensor  
  - LDR Light Sensor
  - DC Motor Fan with L298N Driver
  - LED Lights controlled via relays
  - Physical control buttons
  
  Features:
  - Real-time Firebase sync
  - Automatic temperature-based fan control
  - Motion detection with notifications
  - Light level automation
  - Manual device control via dashboard
  - Comprehensive notification system
*/

#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <DHT.h>
#include "secrets.h"

// WiFi credentials
const char* ssid = WIFI_SSID;
const char* password = WIFI_PASS;

// Pin definitions optimized for NodeMCU/ESP8266
#define DHT_PIN 2        // D4 (GPIO2) - DHT11 sensor
#define PIR_PIN 0        // D3 (GPIO0) - PIR motion sensor  
#define LDR_PIN A0       // A0 - LDR light sensor
#define TEST_LED_PIN 15  // D8 (GPIO15) - Test LED for Firebase connectivity
#define LED_LIGHT_PIN 4  // D2 (GPIO4) - LED light relay
#define FAN_IN1 5        // D1 (GPIO5) - L298N Motor driver IN1
#define FAN_IN2 16       // D0 (GPIO16) - L298N Motor driver IN2  
#define FAN_ENA 14       // D5 (GPIO14) - L298N Motor driver Enable/Speed

// Control buttons (optional physical controls)
#define BUTTON_LIGHT 12  // D6 (GPIO12) - Light control button
#define BUTTON_FAN 13    // D7 (GPIO13) - Fan control button

// DHT11 sensor setup
#define DHT_TYPE DHT11
DHT dht(DHT_PIN, DHT_TYPE);

// System configuration
#define TEMP_HIGH_THRESHOLD 28.0    // Auto turn on fan above 28°C
#define TEMP_LOW_THRESHOLD 25.0     // Auto turn off fan below 25°C  
#define LDR_DARK_THRESHOLD 300      // Turn on light when LDR < 300
#define PIR_TRIGGER_DELAY 5000      // Keep motion light on for 5 seconds
#define SENSOR_READ_INTERVAL 2000   // Read sensors every 2 seconds
#define FIREBASE_UPDATE_INTERVAL 5000 // Update Firebase every 5 seconds

// System state variables
struct SensorData {
  float temperature;
  float humidity;
  int lightLevel;
  bool motionDetected;
  unsigned long lastMotionTime;
} sensors;

struct DeviceStates {
  bool testLedOn;         // Test LED for Firebase connectivity
  bool lightOn;
  bool fanOn;
  int fanSpeed;           // 0-255 PWM value
  bool fanDirection;      // true = forward, false = reverse
  bool autoLightEnabled;
  bool autoFanEnabled;
  bool motionLightEnabled;
  bool relay1;            // LDR Auto Light Controller
  bool relay2;            // Motion Light Controller  
  bool relay3;            // Auto Light Device
  bool relay4;            // Motion Light Device
} devices;

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Timing variables
unsigned long lastSensorRead = 0;
unsigned long lastFirebaseUpdate = 0;
unsigned long lastButtonCheck = 0;

// Button state tracking
bool lastLightButton = HIGH;
bool lastFanButton = HIGH;

// System status
bool systemInitialized = false;
bool wifiConnected = false;
bool firebaseConnected = false;

// Function declarations
void initializeSystem();
void connectWiFi();
void initializeFirebase();
void readSensors();
void updateDevices();
void handleAutomation();
void publishToFirebase();
void handleFirebaseCommands();
void sendNotification(const String& message, const String& type = "info");
void controlLight(bool state);
void controlFan(bool state, int speed = 128);
void handleButtons();

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Smart Home System Starting ===");
  
  initializeSystem();
  connectWiFi();
  initializeFirebase();
  
  Serial.println("=== System Ready ===");
  sendNotification("Smart Home System Online", "success");
}

void loop() {
  // Handle Firebase connection
  handleFirebaseCommands();
  
  // Read sensors periodically
  if (millis() - lastSensorRead >= SENSOR_READ_INTERVAL) {
    readSensors();
    lastSensorRead = millis();
  }
  
  // Update devices and automation
  updateDevices();
  handleAutomation();
  
  // Update Firebase periodically
  if (millis() - lastFirebaseUpdate >= FIREBASE_UPDATE_INTERVAL) {
    publishToFirebase();
    lastFirebaseUpdate = millis();
  }
  
  // Handle physical buttons
  handleButtons();
  
  delay(100); // Small delay for system stability
}

// Initialize system pins and defaults
void initializeSystem() {
  Serial.println("Initializing system...");
  
  // Initialize sensor pins
  pinMode(PIR_PIN, INPUT);
  pinMode(BUTTON_LIGHT, INPUT_PULLUP);
  pinMode(BUTTON_FAN, INPUT_PULLUP);
  
  // Initialize output pins
  pinMode(TEST_LED_PIN, OUTPUT);
  pinMode(LED_LIGHT_PIN, OUTPUT);
  pinMode(FAN_IN1, OUTPUT);
  pinMode(FAN_IN2, OUTPUT);
  pinMode(FAN_ENA, OUTPUT);
  
  // Initialize DHT sensor
  dht.begin();
  
  // Set default device states
  devices.testLedOn = false;
  devices.lightOn = false;
  devices.fanOn = false;
  devices.fanSpeed = 128; // 50% default speed
  devices.fanDirection = true; // Forward
  devices.autoLightEnabled = true;
  devices.autoFanEnabled = true;
  devices.motionLightEnabled = true;
  devices.relay1 = false;
  devices.relay2 = false;
  devices.relay3 = false;
  devices.relay4 = false;
  
  // Turn off all devices initially
  digitalWrite(TEST_LED_PIN, LOW);
  controlLight(false);
  controlFan(false);
  
  Serial.println("System initialized successfully");
}

// Connect to WiFi
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println();
    Serial.print("WiFi connected! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
  }
}

// Initialize Firebase connection
void initializeFirebase() {
  Serial.println("Connecting to Firebase...");
  
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  // Test Firebase connection
  if (Firebase.ready()) {
    firebaseConnected = true;
    Serial.println("Firebase connected successfully!");
    
    // Load saved device states
    loadDeviceStates();
  } else {
    Serial.println("Firebase connection failed!");
  }
}

// Read all sensors
void readSensors() {
  // Read DHT11 temperature and humidity
  sensors.temperature = dht.readTemperature();
  sensors.humidity = dht.readHumidity();
  
  // Read LDR light level
  sensors.lightLevel = analogRead(LDR_PIN);
  
  // Read PIR motion sensor
  bool currentMotion = digitalRead(PIR_PIN) == HIGH;
  if (currentMotion && !sensors.motionDetected) {
    sensors.lastMotionTime = millis();
    sendNotification("Motion detected in the room!", "warning");
  }
  sensors.motionDetected = currentMotion;
  
  // Debug output
  if (!isnan(sensors.temperature) && !isnan(sensors.humidity)) {
    Serial.print("Temp: ");
    Serial.print(sensors.temperature);
    Serial.print("°C, Humidity: ");
    Serial.print(sensors.humidity);
    Serial.print("%, Light: ");
    Serial.print(sensors.lightLevel);
    Serial.print(", Motion: ");
    Serial.println(sensors.motionDetected ? "YES" : "NO");
  }
}

// Control LED light
void controlLight(bool state) {
  devices.lightOn = state;
  digitalWrite(LED_LIGHT_PIN, state ? HIGH : LOW);
  Serial.print("Light turned ");
  Serial.println(state ? "ON" : "OFF");
}

// Control DC fan with direction support
void controlFan(bool state, int speed) {
  devices.fanOn = state;
  devices.fanSpeed = constrain(speed, 0, 255);
  
  if (state && devices.fanSpeed > 0) {
    // Set direction based on fanDirection flag
    if (devices.fanDirection) {
      // Forward direction
      digitalWrite(FAN_IN1, HIGH);
      digitalWrite(FAN_IN2, LOW);
    } else {
      // Reverse direction
      digitalWrite(FAN_IN1, LOW);
      digitalWrite(FAN_IN2, HIGH);
    }
    analogWrite(FAN_ENA, devices.fanSpeed);
    
    Serial.print("Fan turned ON - Speed: ");
    Serial.print((devices.fanSpeed * 100) / 255);
    Serial.print("% - Direction: ");
    Serial.println(devices.fanDirection ? "Forward" : "Reverse");
  } else {
    digitalWrite(FAN_IN1, LOW);
    digitalWrite(FAN_IN2, LOW);
    analogWrite(FAN_ENA, 0);
    
    Serial.println("Fan turned OFF");
  }
}

// Handle automatic device control based on sensors
void handleAutomation() {
  // Automatic light control based on LDR
  if (devices.autoLightEnabled) {
    bool shouldLightBeOn = sensors.lightLevel < LDR_DARK_THRESHOLD;
    if (shouldLightBeOn != devices.lightOn) {
      controlLight(shouldLightBeOn);
      String msg = shouldLightBeOn ? "Lights turned ON automatically (dark detected)" : 
                                     "Lights turned OFF automatically (sufficient light)";
      sendNotification(msg, "info");
    }
  }
  
  // Motion-based lighting
  if (devices.motionLightEnabled && sensors.motionDetected) {
    if (!devices.lightOn) {
      controlLight(true);
      sendNotification("Motion detected - Light turned ON", "info");
    }
    sensors.lastMotionTime = millis();
  }
  
  // Turn off motion light after delay
  if (devices.motionLightEnabled && devices.lightOn && !sensors.motionDetected) {
    if (millis() - sensors.lastMotionTime > PIR_TRIGGER_DELAY) {
      // Only turn off if it was turned on by motion (not by other automation)
      if (sensors.lightLevel >= LDR_DARK_THRESHOLD || !devices.autoLightEnabled) {
        controlLight(false);
        sendNotification("No motion detected - Light turned OFF", "info");
      }
    }
  }
  
  // Automatic fan control based on temperature
  if (devices.autoFanEnabled && !isnan(sensors.temperature)) {
    if (sensors.temperature > TEMP_HIGH_THRESHOLD && !devices.fanOn) {
      controlFan(true, 200); // 78% speed for high temperature
      String msg = "High temperature (" + String(sensors.temperature, 1) + "°C) - Fan turned ON automatically";
      sendNotification(msg, "warning");
    }
    else if (sensors.temperature < TEMP_LOW_THRESHOLD && devices.fanOn) {
      controlFan(false);
      String msg = "Temperature normalized (" + String(sensors.temperature, 1) + "°C) - Fan turned OFF automatically";
      sendNotification(msg, "info");
    }
  }
}

// Send notification to Firebase with timestamp
void sendNotification(const String& message, const String& type) {
  if (!firebaseConnected) return;
  
  unsigned long timestamp = millis();
  
  // Create notification object
  Firebase.setString(fbdo, "/notifications/latest/message", message);
  Firebase.setString(fbdo, "/notifications/latest/type", type);
  Firebase.setInt(fbdo, "/notifications/latest/timestamp", timestamp);
  
  // Add to notifications history
  String historyPath = "/notifications/history/" + String(timestamp);
  Firebase.setString(fbdo, historyPath + "/message", message);
  Firebase.setString(fbdo, historyPath + "/type", type);
  Firebase.setInt(fbdo, historyPath + "/timestamp", timestamp);
  
  Serial.print("Notification sent: ");
  Serial.println(message);
}

// Publish all sensor data and device states to Firebase
void publishToFirebase() {
  if (!firebaseConnected) return;
  
  // Publish sensor data
  Firebase.setFloat(fbdo, "/sensors/temperature", sensors.temperature);
  Firebase.setFloat(fbdo, "/sensors/humidity", sensors.humidity);
  Firebase.setInt(fbdo, "/sensors/ldr", sensors.lightLevel);
  Firebase.setBool(fbdo, "/sensors/pir", sensors.motionDetected);
  Firebase.setInt(fbdo, "/sensors/lastMotionTime", sensors.lastMotionTime);
  
  // Publish device states
  Firebase.setBool(fbdo, "/testLed", devices.testLedOn);
  Firebase.setBool(fbdo, "/relay1", devices.relay1);
  Firebase.setBool(fbdo, "/relay2", devices.relay2);
  Firebase.setBool(fbdo, "/relay3", devices.relay3);
  Firebase.setBool(fbdo, "/relay4", devices.relay4);
  
  // Publish motor/fan states
  Firebase.setBool(fbdo, "/motor/enabled", devices.fanOn);
  Firebase.setInt(fbdo, "/motor/speed", devices.fanSpeed);
  Firebase.setBool(fbdo, "/motor/direction", devices.fanDirection);
  
  // Publish legacy device states for compatibility
  Firebase.setBool(fbdo, "/devices/light", devices.lightOn);
  Firebase.setBool(fbdo, "/devices/fan", devices.fanOn);
  Firebase.setInt(fbdo, "/devices/fanSpeed", devices.fanSpeed);
  
  // Publish automation settings
  Firebase.setBool(fbdo, "/automation/autoLight", devices.autoLightEnabled);
  Firebase.setBool(fbdo, "/automation/autoFan", devices.autoFanEnabled);
  Firebase.setBool(fbdo, "/automation/motionLight", devices.motionLightEnabled);
  
  // System status
  Firebase.setBool(fbdo, "/system/online", true);
  Firebase.setInt(fbdo, "/system/lastUpdate", millis());
  Firebase.setBool(fbdo, "/system/wifiConnected", wifiConnected);
}

// Handle commands received from Firebase (dashboard)
void handleFirebaseCommands() {
  if (!Firebase.ready()) return;
  
  // Check for test LED control commands
  if (Firebase.getBool(fbdo, "/testLed")) {
    bool testLedCommand = fbdo.boolData();
    if (testLedCommand != devices.testLedOn) {
      devices.testLedOn = testLedCommand;
      digitalWrite(TEST_LED_PIN, testLedCommand ? HIGH : LOW);
      sendNotification(testLedCommand ? "Test LED turned ON" : "Test LED turned OFF", "info");
    }
  }
  
  // Check for relay control commands
  if (Firebase.getBool(fbdo, "/relay1")) {
    bool relay1Command = fbdo.boolData();
    if (relay1Command != devices.relay1) {
      devices.relay1 = relay1Command;
      devices.autoLightEnabled = relay1Command;
      sendNotification(relay1Command ? "LDR Auto Light Controller ENABLED" : "LDR Auto Light Controller DISABLED", "info");
    }
  }
  
  if (Firebase.getBool(fbdo, "/relay2")) {
    bool relay2Command = fbdo.boolData();
    if (relay2Command != devices.relay2) {
      devices.relay2 = relay2Command;
      devices.motionLightEnabled = relay2Command;
      sendNotification(relay2Command ? "Motion Light Controller ENABLED" : "Motion Light Controller DISABLED", "info");
    }
  }
  
  if (Firebase.getBool(fbdo, "/relay3")) {
    bool relay3Command = fbdo.boolData();
    if (relay3Command != devices.relay3) {
      devices.relay3 = relay3Command;
      controlLight(relay3Command);
      sendNotification(relay3Command ? "Auto Light Device turned ON" : "Auto Light Device turned OFF", "info");
    }
  }
  
  if (Firebase.getBool(fbdo, "/relay4")) {
    bool relay4Command = fbdo.boolData();
    if (relay4Command != devices.relay4) {
      devices.relay4 = relay4Command;
      // relay4 can control another light or device
      sendNotification(relay4Command ? "Motion Light Device turned ON" : "Motion Light Device turned OFF", "info");
    }
  }
  
  // Check for motor control commands
  if (Firebase.getBool(fbdo, "/motor/enabled")) {
    bool motorCommand = fbdo.boolData();
    if (motorCommand != devices.fanOn) {
      controlFan(motorCommand, devices.fanSpeed);
      sendNotification(motorCommand ? "DC Motor turned ON" : "DC Motor turned OFF", "info");
    }
  }
  
  // Check for motor speed commands
  if (Firebase.getInt(fbdo, "/motor/speed")) {
    int speedCommand = fbdo.intData();
    if (speedCommand != devices.fanSpeed && speedCommand >= 0 && speedCommand <= 255) {
      devices.fanSpeed = speedCommand;
      if (devices.fanOn) {
        controlFan(true, devices.fanSpeed);
        sendNotification("Motor speed changed to " + String((devices.fanSpeed * 100) / 255) + "%", "info");
      }
    }
  }
  
  // Check for motor direction commands
  if (Firebase.getBool(fbdo, "/motor/direction")) {
    bool directionCommand = fbdo.boolData();
    if (directionCommand != devices.fanDirection) {
      devices.fanDirection = directionCommand;
      if (devices.fanOn) {
        controlFan(true, devices.fanSpeed);
        sendNotification(directionCommand ? "Motor direction: Forward" : "Motor direction: Reverse", "info");
      }
    }
  }
  
  // Check for automation setting changes
  if (Firebase.getBool(fbdo, "/commands/autoLight")) {
    devices.autoLightEnabled = fbdo.boolData();
    sendNotification(devices.autoLightEnabled ? "Auto light enabled" : "Auto light disabled", "info");
  }
  
  if (Firebase.getBool(fbdo, "/commands/autoFan")) {
    devices.autoFanEnabled = fbdo.boolData();
    sendNotification(devices.autoFanEnabled ? "Auto fan enabled" : "Auto fan disabled", "info");
  }
  
  if (Firebase.getBool(fbdo, "/commands/motionLight")) {
    devices.motionLightEnabled = fbdo.boolData();
    sendNotification(devices.motionLightEnabled ? "Motion light enabled" : "Motion light disabled", "info");
  }
}

// Load device states from Firebase on startup
void loadDeviceStates() {
  if (!Firebase.ready()) return;
  
  Serial.println("Loading saved device states...");
  
  // Load automation settings
  if (Firebase.getBool(fbdo, "/automation/autoLight")) {
    devices.autoLightEnabled = fbdo.boolData();
  }
  if (Firebase.getBool(fbdo, "/automation/autoFan")) {
    devices.autoFanEnabled = fbdo.boolData();
  }
  if (Firebase.getBool(fbdo, "/automation/motionLight")) {
    devices.motionLightEnabled = fbdo.boolData();
  }
  
  // Load device states
  if (Firebase.getBool(fbdo, "/devices/light")) {
    controlLight(fbdo.boolData());
  }
  if (Firebase.getBool(fbdo, "/devices/fan")) {
    bool fanState = fbdo.boolData();
    if (Firebase.getInt(fbdo, "/devices/fanSpeed")) {
      devices.fanSpeed = constrain(fbdo.intData(), 0, 255);
    }
    controlFan(fanState, devices.fanSpeed);
  }
  
  Serial.println("Device states loaded successfully");
}

// Handle physical button presses
void handleButtons() {
  if (millis() - lastButtonCheck < 100) return; // Debounce
  lastButtonCheck = millis();
  
  // Light control button
  bool currentLightButton = digitalRead(BUTTON_LIGHT);
  if (currentLightButton == LOW && lastLightButton == HIGH) {
    controlLight(!devices.lightOn);
    sendNotification("Light toggled by physical button", "info");
    delay(200); // Additional debounce
  }
  lastLightButton = currentLightButton;
  
  // Fan control button
  bool currentFanButton = digitalRead(BUTTON_FAN);
  if (currentFanButton == LOW && lastFanButton == HIGH) {
    controlFan(!devices.fanOn, devices.fanSpeed);
    sendNotification("Fan toggled by physical button", "info");
    delay(200); // Additional debounce
  }
  lastFanButton = currentFanButton;
}

// Update device states (called in main loop)
void updateDevices() {
  // This function can be used for any continuous device monitoring
  // Currently handled in automation function
}
