/*
  ESP8266 4-Relay with Firebase RTDB (Mobizt) + AceButton
  Added RELAY_ACTIVE_LOW flag so behavior can be inverted easily.
*/

#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h> // Mobizt's Firebase client for ESP8266
#include <AceButton.h>
using namespace ace_button;

// WiFi
const char* ssid = "amitkumarghosh.vercel.app";
const char* password = "amit+kumar+4650";

// Firebase
#define API_KEY       "AIzaSyAfUcqCsJ1rUNrCV_lR6o6ZBwemiIJ6HGA"
#define DATABASE_URL  "https://homeautomation-8c469-default-rtdb.firebaseio.com/"
#define USER_EMAIL    "amit@gmail.com"
#define USER_PASSWORD "amit1234"

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

  Serial.println("Setup complete.");
}

void loop() {
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

  // Buttons
  button1.check();
  button2.check();
  button3.check();
  button4.check();

  delay(100);
}
