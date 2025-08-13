/*
  ESP8266 4-Relay with Firebase RTDB (Mobizt) + AceButton
  Added RELAY_ACTIVE_LOW flag so behavior can be inverted easily.
  Added LDR and PIR sensors for automatic light control and notifications.
*/

#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h> // Mobizt's Firebase client for ESP8266
#include <AceButton.h>
#include "secrets.h"
using namespace ace_button;

// WiFi
const char* ssid = "amitkumarghosh.vercel.app";
const char* password = "amit+kumar+4650";

// Firebase
// loaded from secrets.h

// Set this according to your relay module polarity:
// true  -> active LOW (LOW = ON, HIGH = OFF)
// false -> active HIGH (HIGH = ON, LOW = OFF)
#define RELAY_ACTIVE_LOW false

// Relay mapping (ESP8266)
#define RELAY1 5   // D1 (GPIO5)
#define RELAY2 4   // D2 (GPIO4)
#define RELAY3 14  // D5 (GPIO14)
#define RELAY4 12  // D6 (GPIO12)

// Buttons (INPUT_PULLUP, wired to GND)
#define SwitchPin1 13  // D7
#define SwitchPin2 16  // D0
#define SwitchPin3 3   // RX (GPIO3) - avoid pressing while flashing/serial active
#define SwitchPin4 1   // TX (GPIO1) - avoid pressing while flashing/serial active

// Sensor pins
#define LDR_PIN A0     // Analog pin for LDR sensor
#define PIR_PIN 15     // D8 (GPIO15) for PIR motion sensor

// Sensor thresholds and timing
#define LDR_DARK_THRESHOLD 500    // LDR value below this = dark (adjust based on your sensor)
#define PIR_DELAY 5000           // Delay before turning off motion light (5 seconds)
#define SENSOR_CHECK_INTERVAL 1000 // Check sensors every 1 second

// Sensor states
bool lastLDRDark = false;
bool lastPIRMotion = false;
unsigned long lastMotionTime = 0;
bool motionLightOn = false;

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// AceButton objects
AceButton button1(SwitchPin1);
AceButton button2(SwitchPin2);
AceButton button3(SwitchPin3);
AceButton button4(SwitchPin4);

// Helper: ON/OFF drive levels
inline int relayOnLevel()  { return RELAY_ACTIVE_LOW ? LOW  : HIGH; }
inline int relayOffLevel() { return RELAY_ACTIVE_LOW ? HIGH : LOW; }

// Write relay: state==true means ON
void writeRelay(int pin, bool state) {
  digitalWrite(pin, state ? relayOnLevel() : relayOffLevel());
}

// Read relay pin and return true if physically ON (respecting polarity)
bool readRelayState(int pin) {
  int lvl = digitalRead(pin);
  return lvl == relayOnLevel();
}

// Firebase setter helper
void setRelayValueFirebase(const char* path, bool value) {
  if (!Firebase.setBool(fbdo, path, value)) {
    Serial.print("Failed to set ");
    Serial.print(path);
    Serial.print(": ");
    Serial.println(fbdo.errorReason());
  }
}

// Firebase notification helper
void sendNotification(const char* message) {
  if (!Firebase.setString(fbdo, "/notifications/latest", message)) {
    Serial.print("Failed to send notification: ");
    Serial.println(fbdo.errorReason());
  }
  
  // Also set timestamp
  if (!Firebase.setInt(fbdo, "/notifications/timestamp", millis())) {
    Serial.print("Failed to set timestamp: ");
    Serial.println(fbdo.errorReason());
  }
}

// Check LDR sensor and control light
void checkLDR() {
  int ldrValue = analogRead(LDR_PIN);
  bool isDark = (ldrValue < LDR_DARK_THRESHOLD);
  
  // Only act if state changed
  if (isDark != lastLDRDark) {
    lastLDRDark = isDark;
    
    if (isDark) {
      // Turn on light when dark
      writeRelay(RELAY1, true);
      setRelayValueFirebase("/relay1", true);
      sendNotification("Dark detected! Light turned ON automatically.");
      Serial.println("Dark detected - Light ON");
    } else {
      // Turn off light when bright (unless motion light is active)
      if (!motionLightOn) {
        writeRelay(RELAY1, false);
        setRelayValueFirebase("/relay1", false);
        sendNotification("Light conditions improved. Light turned OFF automatically.");
        Serial.println("Bright detected - Light OFF");
      }
    }
  }
}

// Check PIR sensor and control motion light
void checkPIR() {
  bool motionDetected = (digitalRead(PIR_PIN) == HIGH);
  
  // Only act if state changed
  if (motionDetected != lastPIRMotion) {
    lastPIRMotion = motionDetected;
    
    if (motionDetected) {
      // Motion detected - turn on light
      writeRelay(RELAY2, true);
      setRelayValueFirebase("/relay2", true);
      motionLightOn = true;
      lastMotionTime = millis();
      sendNotification("Motion detected! Motion light turned ON.");
      Serial.println("Motion detected - Motion Light ON");
    } else {
      // No motion - start timer to turn off light
      lastMotionTime = millis();
    }
  }
  
  // Check if motion light should be turned off
  if (motionLightOn && !motionDetected) {
    if (millis() - lastMotionTime > PIR_DELAY) {
      writeRelay(RELAY2, false);
      setRelayValueFirebase("/relay2", false);
      motionLightOn = false;
      sendNotification("No motion detected. Motion light turned OFF.");
      Serial.println("No motion - Motion Light OFF");
    }
  }
}

// Button event handler
void handleEvent(AceButton* button, uint8_t eventType, uint8_t /*state*/) {
  if (eventType != AceButton::kEventReleased) return;

  int pin = button->getPin();
  bool currentState, newState;
  if (pin == SwitchPin1) {
    currentState = readRelayState(RELAY1);
    newState = !currentState;
    writeRelay(RELAY1, newState);
    setRelayValueFirebase("/relay1", newState);
  } else if (pin == SwitchPin2) {
    currentState = readRelayState(RELAY2);
    newState = !currentState;
    writeRelay(RELAY2, newState);
    setRelayValueFirebase("/relay2", newState);
    // Reset motion light state if manually turned off
    if (!newState) motionLightOn = false;
  } else if (pin == SwitchPin3) {
    currentState = readRelayState(RELAY3);
    newState = !currentState;
    writeRelay(RELAY3, newState);
    setRelayValueFirebase("/relay3", newState);
  } else if (pin == SwitchPin4) {
    currentState = readRelayState(RELAY4);
    newState = !currentState;
    writeRelay(RELAY4, newState);
    setRelayValueFirebase("/relay4", newState);
  }
}

void setup() {
  Serial.begin(115200);

  // Relays: outputs
  pinMode(RELAY1, OUTPUT); writeRelay(RELAY1, false); // set OFF initially
  pinMode(RELAY2, OUTPUT); writeRelay(RELAY2, false);
  pinMode(RELAY3, OUTPUT); writeRelay(RELAY3, false);
  pinMode(RELAY4, OUTPUT); writeRelay(RELAY4, false);

  // Buttons
  pinMode(SwitchPin1, INPUT_PULLUP);
  pinMode(SwitchPin2, INPUT_PULLUP);
  pinMode(SwitchPin3, INPUT_PULLUP);
  pinMode(SwitchPin4, INPUT_PULLUP);

  // Sensors
  pinMode(PIR_PIN, INPUT);
  // LDR uses analog pin A0, no pinMode needed

  // Attach AceButton handlers
  button1.getButtonConfig()->setEventHandler(handleEvent);
  button2.getButtonConfig()->setEventHandler(handleEvent);
  button3.getButtonConfig()->setEventHandler(handleEvent);
  button4.getButtonConfig()->setEventHandler(handleEvent);

  // WiFi
  Serial.print("Connecting to Wi-Fi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println(" Connected!");

  // Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Initialize sensor states
  lastLDRDark = (analogRead(LDR_PIN) < LDR_DARK_THRESHOLD);
  lastPIRMotion = (digitalRead(PIR_PIN) == HIGH);

  Serial.println("Setup complete.");
  Serial.println("LDR and PIR sensors initialized.");
}

void loop() {
  static unsigned long lastSensorCheck = 0;
  
  // Read Firebase desired states and apply physically
  bool v;
  if (Firebase.getBool(fbdo, "/relay1")) {
    v = fbdo.boolData();
    writeRelay(RELAY1, v);
  }
  if (Firebase.getBool(fbdo, "/relay2")) {
    v = fbdo.boolData();
    writeRelay(RELAY2, v);
  }
  if (Firebase.getBool(fbdo, "/relay3")) {
    v = fbdo.boolData();
    writeRelay(RELAY3, v);
  }
  if (Firebase.getBool(fbdo, "/relay4")) {
    v = fbdo.boolData();
    writeRelay(RELAY4, v);
  }

  // Check sensors periodically
  if (millis() - lastSensorCheck >= SENSOR_CHECK_INTERVAL) {
    checkLDR();
    checkPIR();
    lastSensorCheck = millis();
  }

  // Buttons
  button1.check();
  button2.check();
  button3.check();
  button4.check();

  delay(100);
}
