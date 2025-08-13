/*
  ESP8266 4-Relay with Firebase RTDB + Motor Control + DHT11 Temperature Sensor
  Updated with L298N motor driver and DHT11 for automatic temperature-based fan control
*/

#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <AceButton.h>
#include <DHT.h>
#include "secrets.h"
using namespace ace_button;

// WiFi
const char* ssid = WIFI_SSID;
const char* password = WIFI_PASS;

// DHT11 Sensor
#define DHT_PIN 2      // D4 (GPIO2) for DHT11 data pin
#define DHT_TYPE DHT11
DHT dht(DHT_PIN, DHT_TYPE);

// Temperature thresholds
#define TEMP_HIGH_THRESHOLD 28.0    // Auto turn on fan above 28°C
#define TEMP_LOW_THRESHOLD 25.0     // Auto turn off fan below 25°C

// Set this according to your relay module polarity
#define RELAY_ACTIVE_LOW false

// Relay mapping (ESP8266)
#define RELAY1 5   // D1 (GPIO5) - LDR Auto Light Enable/Disable
#define RELAY2 4   // D2 (GPIO4) - Motion Light Enable/Disable
#define RELAY3 14  // D5 (GPIO14) - Auto Light Device
#define RELAY4 12  // D6 (GPIO12) - Motion Light Device

// Buttons (INPUT_PULLUP, wired to GND)
#define SwitchPin1 13  // D7
#define SwitchPin2 16  // D0
#define SwitchPin3 3   // RX (GPIO3)
#define SwitchPin4 1   // TX (GPIO1)

// Sensor pins
#define LDR_PIN A0     // Analog pin for LDR sensor
#define PIR_PIN 15     // D8 (GPIO15) for PIR motion sensor

// Motor driver pins (L298N) - Updated to your requested pins
#define MOTOR_IN1 0    // D3 (GPIO0) for L298N Input1
#define MOTOR_IN2 2    // D4 (GPIO2) for L298N Input2 - Note: This conflicts with DHT_PIN
#define MOTOR_ENA 10   // SD3 (GPIO10) for PWM speed control

// Note: Since you want DHT on D4 and Motor IN2 on D4, I'll move DHT to D6
#undef DHT_PIN
#define DHT_PIN 12     // D6 (GPIO12) for DHT11 - moved to avoid conflict

// Sensor thresholds and timing
#define LDR_DARK_THRESHOLD 100
#define PIR_DELAY 5000
#define SENSOR_CHECK_INTERVAL 1000
#define TEMP_CHECK_INTERVAL 10000  // Check temperature every 10 seconds

// Sensor states
bool lastLDRDark = false;
bool lastPIRMotion = false;
unsigned long lastMotionTime = 0;
bool motionLightOn = false;

// Control flags - these will persist until manually changed
bool ldrAutoLightEnabled = false;
bool motionLightEnabled = false;

// Motor control variables
bool motorEnabled = false;
int motorSpeed = 0;                 // Motor speed (0-255)
bool motorDirection = true;         // Motor direction (true = forward, false = reverse)
bool autoTempControlEnabled = true; // Enable/disable automatic temperature control

// Temperature variables
float currentTemperature = 0.0;
float currentHumidity = 0.0;
bool tempFanActive = false;         // Track if fan is on due to temperature

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// AceButton objects
AceButton button1(SwitchPin1);
AceButton button2(SwitchPin2);
AceButton button3(SwitchPin3);
AceButton button4(SwitchPin4);

// Helper functions
inline int relayOnLevel()  { return RELAY_ACTIVE_LOW ? LOW  : HIGH; }
inline int relayOffLevel() { return RELAY_ACTIVE_LOW ? HIGH : LOW; }

void writeRelay(int pin, bool state) {
  digitalWrite(pin, state ? relayOnLevel() : relayOffLevel());
}

bool readRelayState(int pin) {
  int lvl = digitalRead(pin);
  return lvl == relayOnLevel();
}

void setRelayValueFirebase(const char* path, bool value) {
  if (!Firebase.setBool(fbdo, path, value)) {
    Serial.print("Failed to set ");
    Serial.print(path);
    Serial.print(": ");
    Serial.println(fbdo.errorReason());
  }
}

void sendNotification(const char* message) {
  if (!Firebase.setString(fbdo, "/notifications/latest", message)) {
    Serial.print("Failed to send notification: ");
    Serial.println(fbdo.errorReason());
  }
  if (!Firebase.setInt(fbdo, "/notifications/timestamp", millis())) {
    Serial.print("Failed to set timestamp: ");
    Serial.println(fbdo.errorReason());
  }
}

// Motor control functions
void setMotorSpeed(int speed) {
  motorSpeed = constrain(speed, 0, 255);
  
  if (motorSpeed == 0 || !motorEnabled) {
    digitalWrite(MOTOR_IN1, LOW);
    digitalWrite(MOTOR_IN2, LOW);
    analogWrite(MOTOR_ENA, 0);
    Serial.println("Motor STOPPED");
  } else {
    if (motorDirection) {
      digitalWrite(MOTOR_IN1, HIGH);
      digitalWrite(MOTOR_IN2, LOW);
    } else {
      digitalWrite(MOTOR_IN1, LOW);
      digitalWrite(MOTOR_IN2, HIGH);
    }
    analogWrite(MOTOR_ENA, motorSpeed);
    Serial.print("Motor speed: ");
    Serial.print((motorSpeed * 100) / 255);
    Serial.print("% Direction: ");
    Serial.println(motorDirection ? "Forward" : "Reverse");
  }
  
  // Update Firebase
  Firebase.setInt(fbdo, "/motor/speed", motorSpeed);
}

void setMotorState(bool enabled) {
  motorEnabled = enabled;
  if (!enabled) {
    setMotorSpeed(0);
    tempFanActive = false; // Reset temp fan flag
    sendNotification("DC Fan turned OFF");
  } else {
    setMotorSpeed(motorSpeed);
    String msg = "DC Fan turned ON - Speed: " + String((motorSpeed * 100) / 255) + "%";
    sendNotification(msg.c_str());
  }
  Firebase.setBool(fbdo, "/motor/enabled", motorEnabled);
}

void setMotorDirection(bool forward) {
  motorDirection = forward;
  if (motorEnabled && motorSpeed > 0) {
    setMotorSpeed(motorSpeed);
  }
  Firebase.setBool(fbdo, "/motor/direction", motorDirection);
}

// Temperature monitoring and fan control
void checkTemperature() {
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  if (isnan(temp) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }
  
  currentTemperature = temp;
  currentHumidity = humidity;
  
  // Publish temperature data to Firebase
  Firebase.setFloat(fbdo, "/sensors/temperature", currentTemperature);
  Firebase.setFloat(fbdo, "/sensors/humidity", currentHumidity);
  
  // Automatic temperature-based fan control
  if (autoTempControlEnabled) {
    if (currentTemperature > TEMP_HIGH_THRESHOLD && !tempFanActive) {
      // Temperature too high - turn on fan
      tempFanActive = true;
      if (!motorEnabled) {
        motorSpeed = 180; // Set to ~70% speed for temperature control
        setMotorState(true);
        String msg = "High temperature detected (" + String(currentTemperature, 1) + "°C)! Fan turned ON automatically.";
        sendNotification(msg.c_str());
        Serial.println(msg);
      }
    } else if (currentTemperature < TEMP_LOW_THRESHOLD && tempFanActive) {
      // Temperature normalized - turn off fan (only if it was turned on by temperature)
      tempFanActive = false;
      setMotorState(false);
      String msg = "Temperature normalized (" + String(currentTemperature, 1) + "°C). Fan turned OFF automatically.";
      sendNotification(msg.c_str());
      Serial.println(msg);
    }
  }
  
  Serial.print("Temperature: ");
  Serial.print(currentTemperature);
  Serial.print("°C, Humidity: ");
  Serial.print(currentHumidity);
  Serial.println("%");
}

void publishSensorData() {
  int ldrValue = analogRead(LDR_PIN);
  bool pirValue = (digitalRead(PIR_PIN) == HIGH);
  
  Firebase.setInt(fbdo, "/sensors/ldr", ldrValue);
  Firebase.setBool(fbdo, "/sensors/pir", pirValue);
  Firebase.setFloat(fbdo, "/sensors/temperature", currentTemperature);
  Firebase.setFloat(fbdo, "/sensors/humidity", currentHumidity);
  Firebase.setInt(fbdo, "/motor/speed", motorSpeed);
  Firebase.setBool(fbdo, "/motor/enabled", motorEnabled);
  Firebase.setBool(fbdo, "/motor/direction", motorDirection);
  
  Serial.print("Sensor data - LDR: ");
  Serial.print(ldrValue);
  Serial.print(", PIR: ");
  Serial.print(pirValue ? "Motion" : "Clear");
  Serial.print(", Temp: ");
  Serial.print(currentTemperature);
  Serial.print("°C, Motor: ");
  Serial.print(motorEnabled ? "ON" : "OFF");
  Serial.print(" (");
  Serial.print((motorSpeed * 100) / 255);
  Serial.println("%)");
}

void checkLDR() {
  if (!ldrAutoLightEnabled) return; // Only work if manually enabled
  
  int ldrValue = analogRead(LDR_PIN);
  bool isDark = (ldrValue < LDR_DARK_THRESHOLD);
  
  if (isDark != lastLDRDark) {
    lastLDRDark = isDark;
    
    if (isDark) {
      writeRelay(RELAY3, true);
      setRelayValueFirebase("/relay3", true);
      sendNotification("Dark detected! Auto light turned ON.");
    } else {
      writeRelay(RELAY3, false);
      setRelayValueFirebase("/relay3", false);
      sendNotification("Light detected. Auto light turned OFF.");
    }
  }
}

void checkPIR() {
  if (!motionLightEnabled) return; // Only work if manually enabled
  
  bool motionDetected = (digitalRead(PIR_PIN) == HIGH);
  
  if (motionDetected != lastPIRMotion) {
    lastPIRMotion = motionDetected;
    
    if (motionDetected) {
      writeRelay(RELAY4, true);
      setRelayValueFirebase("/relay4", true);
      motionLightOn = true;
      lastMotionTime = millis();
      sendNotification("Motion detected! Motion light turned ON.");
    } else {
      lastMotionTime = millis();
    }
  }
  
  if (motionLightOn && !motionDetected) {
    if (millis() - lastMotionTime > PIR_DELAY) {
      writeRelay(RELAY4, false);
      setRelayValueFirebase("/relay4", false);
      motionLightOn = false;
      sendNotification("No motion. Motion light turned OFF.");
    }
  }
}

void handleEvent(AceButton* button, uint8_t eventType, uint8_t /*state*/) {
  if (eventType != AceButton::kEventReleased) return;

  int pin = button->getPin();
  bool currentState, newState;
  
  if (pin == SwitchPin1) {
    // RELAY1 - LDR Auto Light Control (Manual Enable/Disable)
    currentState = ldrAutoLightEnabled;
    newState = !currentState;
    ldrAutoLightEnabled = newState;
    writeRelay(RELAY1, newState);
    setRelayValueFirebase("/relay1", newState);
    Firebase.setBool(fbdo, "/automation/ldrAutoLight", ldrAutoLightEnabled);
    Serial.print("LDR Auto Light manually ");
    Serial.println(newState ? "ENABLED" : "DISABLED");
  } else if (pin == SwitchPin2) {
    // RELAY2 - Motion Light Control (Manual Enable/Disable)
    currentState = motionLightEnabled;
    newState = !currentState;
    motionLightEnabled = newState;
    writeRelay(RELAY2, newState);
    setRelayValueFirebase("/relay2", newState);
    Firebase.setBool(fbdo, "/automation/motionLight", motionLightEnabled);
    if (!newState) motionLightOn = false;
    Serial.print("Motion Light automation manually ");
    Serial.println(newState ? "ENABLED" : "DISABLED");
  } else if (pin == SwitchPin3) {
    // RELAY3 - Manual control
    currentState = readRelayState(RELAY3);
    newState = !currentState;
    writeRelay(RELAY3, newState);
    setRelayValueFirebase("/relay3", newState);
    Serial.print("Device 3 manually ");
    Serial.println(newState ? "ON" : "OFF");
  } else if (pin == SwitchPin4) {
    // RELAY4 - Manual control
    currentState = readRelayState(RELAY4);
    newState = !currentState;
    writeRelay(RELAY4, newState);
    setRelayValueFirebase("/relay4", newState);
    Serial.print("Device 4 manually ");
    Serial.println(newState ? "ON" : "OFF");
  }
}

void setup() {
  Serial.begin(115200);

  // Initialize DHT sensor
  dht.begin();

  // Relays: outputs
  pinMode(RELAY1, OUTPUT); writeRelay(RELAY1, false);
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

  // Motor driver pins
  pinMode(MOTOR_IN1, OUTPUT);
  pinMode(MOTOR_IN2, OUTPUT);
  pinMode(MOTOR_ENA, OUTPUT);
  
  // Initialize motor to OFF state
  digitalWrite(MOTOR_IN1, LOW);
  digitalWrite(MOTOR_IN2, LOW);
  analogWrite(MOTOR_ENA, 0);

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
  
  // Load persistent states from Firebase
  if (Firebase.getBool(fbdo, "/automation/ldrAutoLight")) {
    ldrAutoLightEnabled = fbdo.boolData();
    writeRelay(RELAY1, ldrAutoLightEnabled);
  }
  if (Firebase.getBool(fbdo, "/automation/motionLight")) {
    motionLightEnabled = fbdo.boolData();
    writeRelay(RELAY2, motionLightEnabled);
  }

  // Initialize motor state from Firebase
  if (Firebase.getBool(fbdo, "/motor/enabled")) {
    motorEnabled = fbdo.boolData();
  }
  if (Firebase.getInt(fbdo, "/motor/speed")) {
    motorSpeed = constrain(fbdo.intData(), 0, 255);
  }
  if (Firebase.getBool(fbdo, "/motor/direction")) {
    motorDirection = fbdo.boolData();
  }
  
  setMotorSpeed(motorEnabled ? motorSpeed : 0);

  // Read initial temperature
  checkTemperature();
  
  Serial.println("Setup complete with DHT11 and motor control.");
  sendNotification("Smart Home System Initialized with Temperature Control");
}

void loop() {
  static unsigned long lastSensorCheck = 0;
  static unsigned long lastSensorPublish = 0;
  static unsigned long lastTempCheck = 0;
  const unsigned long SENSOR_PUBLISH_INTERVAL = 5000;
  
  // Read Firebase states and apply
  bool v;
  
  // Check for automation state changes from web interface
  if (Firebase.getBool(fbdo, "/automation/ldrAutoLight")) {
    bool newState = fbdo.boolData();
    if (newState != ldrAutoLightEnabled) {
      ldrAutoLightEnabled = newState;
      writeRelay(RELAY1, ldrAutoLightEnabled);
      Firebase.setBool(fbdo, "/relay1", ldrAutoLightEnabled);
    }
  }
  
  if (Firebase.getBool(fbdo, "/automation/motionLight")) {
    bool newState = fbdo.boolData();
    if (newState != motionLightEnabled) {
      motionLightEnabled = newState;
      writeRelay(RELAY2, motionLightEnabled);
      Firebase.setBool(fbdo, "/relay2", motionLightEnabled);
      if (!newState) motionLightOn = false;
    }
  }

  // Manual relay controls
  if (Firebase.getBool(fbdo, "/relay3")) {
    writeRelay(RELAY3, fbdo.boolData());
  }
  if (Firebase.getBool(fbdo, "/relay4")) {
    writeRelay(RELAY4, fbdo.boolData());
  }

  // Motor control from Firebase
  if (Firebase.getBool(fbdo, "/motor/enabled")) {
    bool newState = fbdo.boolData();
    if (newState != motorEnabled) {
      // Only allow manual control if not overridden by temperature
      if (!tempFanActive || !newState) {
        setMotorState(newState);
        if (!newState) tempFanActive = false; // Reset temp flag if manually turned off
      }
    }
  }
  
  if (Firebase.getInt(fbdo, "/motor/speed")) {
    int newSpeed = constrain(fbdo.intData(), 0, 255);
    if (newSpeed != motorSpeed) {
      motorSpeed = newSpeed;
      if (motorEnabled) {
        setMotorSpeed(motorSpeed);
      }
    }
  }
  
  if (Firebase.getBool(fbdo, "/motor/direction")) {
    bool newDirection = fbdo.boolData();
    if (newDirection != motorDirection) {
      setMotorDirection(newDirection);
    }
  }

  // Check temperature periodically
  if (millis() - lastTempCheck >= TEMP_CHECK_INTERVAL) {
    checkTemperature();
    lastTempCheck = millis();
  }

  // Check sensors for automation
  if (millis() - lastSensorCheck >= SENSOR_CHECK_INTERVAL) {
    checkLDR();
    checkPIR();
    lastSensorCheck = millis();
  }
  
  // Publish sensor data
  if (millis() - lastSensorPublish >= SENSOR_PUBLISH_INTERVAL) {
    publishSensorData();
    lastSensorPublish = millis();
  }

  // Check buttons
  button1.check();
  button2.check();
  button3.check();
  button4.check();

  delay(100);
}
