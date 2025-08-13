// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAfUcqCsJ1rUNrCV_lR6o6ZBwemiIJ6HGA",
  authDomain: "homeautomation-8c469.firebaseapp.com",
  databaseURL: "https://homeautomation-8c469-default-rtdb.firebaseio.com",
  projectId: "homeautomation-8c469",
  storageBucket: "homeautomation-8c469.firebasestorage.app",
  messagingSenderId: "413944940142",
  appId: "1:413944940142:web:01c153cfe3c23a5df9487f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Predefined login credentials
const allowedEmail = "amit@gmail.com";
const allowedPassword = "amit1234";

const loginForm = document.getElementById("loginForm");
const dashboard = document.getElementById("dashboard");
const loginBtn = document.getElementById("loginBtn");
const loadingOverlay = document.getElementById("loadingOverlay");

// Global variables for sensor monitoring
let lastNotificationTime = 0;
let activeDevicesCount = 0;
let sensorsOnlineCount = 3;
const maxNotifications = 15;

// Device states for conditional sensor monitoring
let relayStates = {
  testLed: false,    // Test LED
  relay1: false,     // LDR Auto Light Controller
  relay2: false,     // Motion Light Controller
  relay3: false,     // Auto Light Device
  relay4: false      // Motion Light Device
};

// Current sensor values
let currentSensorValues = {
  ldr: 512,
  pir: false,
  temperature: 25.0,
  humidity: 60.0
};

// Current motor values
let currentMotorValues = {
  enabled: false,
  speed: 0,
  direction: true // true = forward, false = reverse
};

// Utility functions
function showLoading() {
  if (loadingOverlay) {
    loadingOverlay.style.display = 'flex';
  }
}

function hideLoading() {
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
}

function updateOverviewMetrics() {
  // Update time display
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  const timeElement = document.getElementById("currentTime");
  if (timeElement) timeElement.textContent = timeString;
  
  // Update overview cards with current sensor values
  updateOverviewSensorDisplay();
}

function updateOverviewSensorDisplay() {
  // Temperature
  const overviewTemp = document.getElementById("overviewTemp");
  if (overviewTemp && currentSensorValues.temperature !== null) {
    overviewTemp.textContent = `${currentSensorValues.temperature.toFixed(1)}°C`;
  }
  
  // Humidity
  const overviewHumidity = document.getElementById("overviewHumidity");
  if (overviewHumidity && currentSensorValues.humidity !== null) {
    overviewHumidity.textContent = `${currentSensorValues.humidity.toFixed(1)}%`;
  }
  
  // Light Level
  const overviewLight = document.getElementById("overviewLight");
  if (overviewLight && currentSensorValues.ldr !== null) {
    overviewLight.textContent = currentSensorValues.ldr;
  }
  
  // Motion
  const overviewMotion = document.getElementById("overviewMotion");
  if (overviewMotion) {
    overviewMotion.textContent = currentSensorValues.pir ? "Detected" : "Clear";
    overviewMotion.className = currentSensorValues.pir ? "metric warning" : "metric";
  }
}

function addNotification(message, type = 'info', title = 'System Update') {
  const notificationsList = document.getElementById("notificationsList");
  if (!notificationsList) return;
  
  const notificationItem = document.createElement("div");
  notificationItem.className = `notification-item ${type}`;
  
  const currentTime = new Date();
  const timeString = currentTime.toLocaleTimeString();
  
  // Choose appropriate icon based on type
  let iconClass = 'fas fa-info-circle';
  if (type === 'motion') iconClass = 'fas fa-walking';
  else if (type === 'dark') iconClass = 'fas fa-moon';
  else if (type === 'welcome') iconClass = 'fas fa-check-circle';
  else if (type === 'error') iconClass = 'fas fa-exclamation-triangle';
  else if (type === 'success') iconClass = 'fas fa-check-circle';
  
  notificationItem.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon ${type}">
        <i class="${iconClass}"></i>
      </div>
      <div class="notification-text">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
      </div>
    </div>
    <div class="notification-time">${timeString}</div>
  `;
  
  // Add to beginning of list
  notificationsList.insertBefore(notificationItem, notificationsList.firstChild);
  
  // Keep only the latest notifications
  while (notificationsList.children.length > maxNotifications) {
    notificationsList.removeChild(notificationsList.lastChild);
  }
  
  // Update notification count
  updateNotificationCount();
  
  // Auto-fade old notifications after 30 seconds
  setTimeout(() => {
    if (notificationItem.parentNode) {
      notificationItem.style.opacity = '0.6';
    }
  }, 30000);
}

function updateNotificationCount() {
  const notificationsList = document.getElementById("notificationsList");
  const countElement = document.getElementById("notificationCount");
  if (countElement && notificationsList) {
    const count = notificationsList.children.length;
    countElement.textContent = `${count} notification${count !== 1 ? 's' : ''}`;
  }
}

// Login functionality
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      if (!email || !password) {
        alert("Please enter both email and password.");
        return;
      }

      showLoading();

      // Check hardcoded credentials
      if (email === allowedEmail && password === allowedPassword) {
        setTimeout(() => {
          hideLoading();
          const loginForm = document.getElementById("loginForm");
          const dashboard = document.getElementById("dashboard");
          
          if (loginForm) loginForm.style.display = "none";
          if (dashboard) {
            dashboard.style.display = "flex";
            dashboard.classList.add("active");
          }
          
          // Initialize dashboard
          initializeDashboard();
          addNotification("Successfully logged into Smart Home Hub", "welcome", "Welcome Back!");
        }, 1500);
      } else {
        hideLoading();
        alert("Invalid email or password. Please try again.");
      }
    });
  }

  // Logout functionality
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      showLoading();
      
      setTimeout(() => {
        hideLoading();
        const dashboard = document.getElementById("dashboard");
        const loginForm = document.getElementById("loginForm");
        
        if (dashboard) {
          dashboard.style.display = "none";
          dashboard.classList.remove("active");
        }
        if (loginForm) loginForm.style.display = "flex";
        
        // Clear form
        const emailField = document.getElementById("email");
        const passwordField = document.getElementById("password");
        if (emailField) emailField.value = "";
        if (passwordField) passwordField.value = "";
        
        // Reset counters
        activeDevicesCount = 0;
        lastNotificationTime = 0;
        
        addNotification("Logged out successfully", "info", "Logout");
      }, 1000);
    });
  }
  
  // Initialize page - show login form initially
  hideLoading();
  const dashboard = document.getElementById("dashboard");
  const loginForm = document.getElementById("loginForm");
  if (dashboard) dashboard.style.display = "none";
  if (loginForm) loginForm.style.display = "flex";
});

function initializeDashboard() {
  console.log('Initializing dashboard...');
  
  // Initialize sensor displays
  updateSensorStatus();
  
  // Set up button event listeners
  setupButtonListeners();
  
  // Initialize motor controls
  initializeMotorControls();
  
  // Start Firebase listeners
  startFirebaseListeners();
  
  // Start time updates
  setInterval(updateOverviewMetrics, 1000);
  updateOverviewMetrics();
  
  console.log('Dashboard initialized successfully');
}

function setupButtonListeners() {
  // Test LED button
  const testLedBtn = document.getElementById('testLedBtn');
  if (testLedBtn) {
    testLedBtn.addEventListener('click', () => toggleDevice('testLed', 'Test LED'));
  }
  
  // Device control buttons
  const btn1 = document.getElementById('btn1');
  const btn2 = document.getElementById('btn2');
  const btn3 = document.getElementById('btn3');
  const btn4 = document.getElementById('btn4');
  
  if (btn1) btn1.addEventListener('click', () => toggleRelay('relay1'));
  if (btn2) btn2.addEventListener('click', () => toggleRelay('relay2'));
  if (btn3) btn3.addEventListener('click', () => toggleRelay('relay3'));
  if (btn4) btn4.addEventListener('click', () => toggleRelay('relay4'));
  
  // Emergency off button
  const allOffBtn = document.getElementById('allOffBtn');
  if (allOffBtn) allOffBtn.addEventListener('click', emergencyStop);
}

// Test LED control function
function toggleDevice(deviceName, friendlyName) {
  const currentState = relayStates[deviceName];
  const newState = !currentState;
  
  database.ref(`/${deviceName}`).set(newState).then(() => {
    relayStates[deviceName] = newState;
    updateTestLedUI(newState);
    addNotification(`${friendlyName} turned ${newState ? 'ON' : 'OFF'}`, 'info', 'Device Control');
  }).catch((error) => {
    console.error('Error updating device:', error);
    addNotification('Failed to update device. Check connection.', 'error', 'Error');
  });
}

function updateTestLedUI(state) {
  const testLedBtn = document.getElementById('testLedBtn');
  const ledStatus = document.getElementById('ledStatus');
  const ledIcon = document.getElementById('ledIcon');
  
  if (testLedBtn) {
    testLedBtn.className = state ? 'control-btn on' : 'control-btn off';
    testLedBtn.innerHTML = `
      <i class="fas fa-power-off"></i>
      <span>${state ? 'Turn Off' : 'Turn On'}</span>
    `;
  }
  
  if (ledStatus) {
    ledStatus.textContent = state ? 'ON' : 'OFF';
  }
  
  if (ledIcon) {
    ledIcon.style.color = state ? '#4ade80' : '#6b7280';
  }
}

// Relay control functions
function toggleRelay(relayName) {
  const currentState = relayStates[relayName];
  const newState = !currentState;
  
  database.ref(`/${relayName}`).set(newState).then(() => {
    relayStates[relayName] = newState;
    updateDeviceUI(relayName, newState);
    addNotification(`${getDeviceName(relayName)} turned ${newState ? 'ON' : 'OFF'}`, 'info', 'Device Control');
  }).catch((error) => {
    console.error('Error updating relay:', error);
    addNotification('Failed to update device. Please try again.', 'error', 'Error');
  });
}

function updateDeviceUI(relayName, state) {
  const deviceNumber = relayName.replace('relay', '');
  const statusElement = document.getElementById(`status${deviceNumber}`);
  const buttonElement = document.getElementById(`btn${deviceNumber}`);
  
  if (statusElement) {
    statusElement.textContent = state ? 'ON' : 'OFF';
  }
  
  if (buttonElement) {
    buttonElement.className = state ? 'control-btn on' : 'control-btn off';
    buttonElement.innerHTML = `
      <i class="fas fa-power-off"></i>
      <span>${state ? 'Turn Off' : 'Turn On'}</span>
    `;
  }
}

function getDeviceName(relayName) {
  const names = {
    relay1: 'LDR Auto Light Controller',
    relay2: 'Motion Light Controller', 
    relay3: 'Auto Light Device',
    relay4: 'Motion Light Device'
  };
  return names[relayName] || relayName;
}

// Emergency stop function
function emergencyStop() {
  console.log('Emergency stop activated');
  
  // Turn off all relays
  const promises = [];
  Object.keys(relayStates).forEach(relay => {
    promises.push(database.ref(`/${relay}`).set(false));
    relayStates[relay] = false;
  });
  
  // Turn off motor
  promises.push(database.ref('/motor/enabled').set(false));
  promises.push(database.ref('/motor/speed').set(0));
  
  Promise.all(promises).then(() => {
    addNotification('Emergency stop activated - All devices turned OFF', 'warning', 'Emergency Stop');
    updateAllDeviceUI();
    updateMotorStatus(false, 0, currentMotorValues.direction);
  }).catch((error) => {
    console.error('Error during emergency stop:', error);
    addNotification('Emergency stop failed. Please check system.', 'error', 'Error');
  });
}

function updateAllDeviceUI() {
  // Update test LED
  updateTestLedUI(false);
  
  // Update all relay devices
  for (let i = 1; i <= 4; i++) {
    updateDeviceUI(`relay${i}`, false);
  }
}

// Motor control functions
function initializeMotorControls() {
  // Motor toggle button
  const motorToggle = document.getElementById('motorToggle');
  if (motorToggle) {
    motorToggle.addEventListener('click', toggleMotor);
  }
  
  // Speed slider
  const speedSlider = document.getElementById('speedSlider');
  if (speedSlider) {
    speedSlider.addEventListener('input', function(e) {
      setMotorSpeed(parseInt(e.target.value));
    });
  }
  
  // Direction button
  const directionBtn = document.getElementById('motorDirection');
  if (directionBtn) {
    directionBtn.addEventListener('click', toggleMotorDirection);
  }
  
  // Emergency stop button
  const motorStopBtn = document.getElementById('motorStopBtn');
  if (motorStopBtn) {
    motorStopBtn.addEventListener('click', emergencyStopMotor);
  }
  
  // Speed preset buttons
  const presetBtns = document.querySelectorAll('.preset-btn');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = parseInt(btn.dataset.speed);
      setMotorSpeed(speed);
    });
  });
  
  // Load current motor state
  loadMotorState();
}

function loadMotorState() {
  database.ref('/motor').once('value').then((snapshot) => {
    const motor = snapshot.val();
    if (motor) {
      currentMotorValues.enabled = motor.enabled || false;
      currentMotorValues.speed = motor.speed || 0;
      currentMotorValues.direction = motor.direction !== undefined ? motor.direction : true;
      updateMotorUI();
    }
  });
}

function toggleMotor() {
  const newState = !currentMotorValues.enabled;
  
  database.ref('/motor/enabled').set(newState).then(() => {
    currentMotorValues.enabled = newState;
    updateMotorUI();
    
    const message = newState ? 'DC Fan turned ON' : 'DC Fan turned OFF';
    addNotification(message, 'info', 'Motor Control');
  }).catch((error) => {
    console.error('Error toggling motor:', error);
    addNotification('Failed to toggle motor. Please try again.', 'error', 'Error');
  });
}

function setMotorSpeed(speed) {
  const constrainedSpeed = Math.max(0, Math.min(255, speed));
  
  database.ref('/motor/speed').set(constrainedSpeed).then(() => {
    currentMotorValues.speed = constrainedSpeed;
    updateMotorSpeedUI(constrainedSpeed);
    
    const percentage = Math.round((constrainedSpeed / 255) * 100);
    addNotification(`Fan speed set to ${percentage}%`, 'info', 'Speed Control');
  }).catch((error) => {
    console.error('Error setting motor speed:', error);
    addNotification('Failed to set motor speed. Please try again.', 'error', 'Error');
  });
}

function toggleMotorDirection() {
  const newDirection = !currentMotorValues.direction;
  
  database.ref('/motor/direction').set(newDirection).then(() => {
    currentMotorValues.direction = newDirection;
    updateMotorDirectionUI();
    
    const direction = newDirection ? 'Forward' : 'Reverse';
    addNotification(`Motor direction set to ${direction}`, 'info', 'Direction Control');
  }).catch((error) => {
    console.error('Error setting motor direction:', error);
    addNotification('Failed to set motor direction. Please try again.', 'error', 'Error');
  });
}

function emergencyStopMotor() {
  database.ref('/motor').update({
    enabled: false,
    speed: 0
  }).then(() => {
    currentMotorValues.enabled = false;
    currentMotorValues.speed = 0;
    updateMotorUI();
    
    addNotification('EMERGENCY STOP: Motor turned OFF', 'error', 'Emergency');
  }).catch((error) => {
    console.error('Error in emergency stop:', error);
    addNotification('Emergency stop failed', 'error', 'Error');
  });
}

function updateMotorUI() {
  const motorToggle = document.getElementById('motorToggle');
  const motorIcon = document.getElementById('motorIcon');
  const motorStatus = document.getElementById('motorStatus');
  const speedSlider = document.getElementById('speedSlider');
  const motorToggleText = document.getElementById('motorToggleText');
  
  if (motorToggle && motorToggleText) {
    if (currentMotorValues.enabled) {
      motorToggle.className = 'toggle-btn on';
      motorToggleText.textContent = 'ON';
      if (speedSlider) speedSlider.disabled = false;
    } else {
      motorToggle.className = 'toggle-btn off';
      motorToggleText.textContent = 'OFF';
      if (speedSlider) speedSlider.disabled = true;
    }
  }
  
  if (motorIcon) {
    motorIcon.style.animation = currentMotorValues.enabled && currentMotorValues.speed > 0 ? 
      'spin 2s linear infinite' : 'none';
  }
  
  if (motorStatus) {
    const statusIcon = motorStatus.querySelector('i');
    if (statusIcon) {
      statusIcon.style.color = currentMotorValues.enabled ? '#4ade80' : '#6b7280';
    }
  }
  
  updateMotorSpeedUI(currentMotorValues.speed);
  updateMotorDirectionUI();
}

function updateMotorSpeedUI(speed) {
  const speedValue = document.getElementById('speedValue');
  const speedSlider = document.getElementById('speedSlider');
  
  if (speedValue) {
    const percentage = Math.round((speed / 255) * 100);
    speedValue.textContent = percentage;
  }
  
  if (speedSlider) {
    speedSlider.value = speed;
  }
}

function updateMotorDirectionUI() {
  const directionBtn = document.getElementById('motorDirection');
  const directionText = document.getElementById('directionText');
  
  if (directionBtn && directionText) {
    const icon = directionBtn.querySelector('i');
    if (currentMotorValues.direction) {
      directionText.textContent = 'Forward';
      if (icon) icon.className = 'fas fa-arrow-right';
    } else {
      directionText.textContent = 'Reverse';
      if (icon) icon.className = 'fas fa-arrow-left';
    }
  }
}

function updateMotorStatus(enabled, speed, direction) {
  currentMotorValues.enabled = enabled;
  currentMotorValues.speed = speed;
  currentMotorValues.direction = direction;
  updateMotorUI();
}

// Sensor monitoring functions
function updateSensorStatus() {
  // Update sensor displays with current values
  updateTemperatureDisplay(currentSensorValues.temperature, currentSensorValues.humidity);
  updateLDRDisplay(currentSensorValues.ldr);
  updatePIRDisplay(currentSensorValues.pir);
}

function updateTemperatureDisplay(temp, humidity) {
  const tempValue = document.getElementById('tempValue');
  const humidityValue = document.getElementById('humidityValue');
  const tempChart = document.getElementById('tempChart');
  const humidityChart = document.getElementById('humidityChart');
  
  if (tempValue && !isNaN(temp)) {
    tempValue.textContent = temp.toFixed(1);
    
    // Update temperature chart (0-50°C range)
    const tempPercent = Math.min((temp / 50) * 100, 100);
    if (tempChart) {
      tempChart.style.width = tempPercent + '%';
      
      // Color coding for temperature
      if (temp > 35) {
        tempChart.style.background = 'linear-gradient(135deg, #EF4444, #DC2626)';
      } else if (temp > 28) {
        tempChart.style.background = 'linear-gradient(135deg, #F59E0B, #D97706)';
      } else {
        tempChart.style.background = 'linear-gradient(135deg, #10B981, #059669)';
      }
    }
  }
  
  if (humidityValue && !isNaN(humidity)) {
    humidityValue.textContent = humidity.toFixed(1);
    
    // Update humidity chart (0-100% range)
    if (humidityChart) {
      humidityChart.style.width = humidity + '%';
    }
  }
}

function updateLDRDisplay(ldrValue) {
  const ldrValueElement = document.getElementById('ldrValue');
  const ldrChart = document.getElementById('ldrChart');
  const ldrDescription = document.getElementById('ldrDescription');
  
  if (ldrValueElement) {
    ldrValueElement.textContent = ldrValue;
  }
  
  if (ldrChart) {
    const percentage = Math.min((ldrValue / 1000) * 100, 100);
    ldrChart.style.width = percentage + '%';
  }
  
  if (ldrDescription) {
    const isLdrEnabled = relayStates.relay1;
    if (!isLdrEnabled) {
      ldrDescription.textContent = `Light sensor disabled - Enable "LDR Auto Light" to activate monitoring (Current: ${ldrValue})`;
    } else {
      const isDark = ldrValue < 500;
      ldrDescription.textContent = isDark ? 
        `Dark environment detected - Auto light activated (${ldrValue})` : 
        `Bright environment detected (${ldrValue})`;
    }
  }
}

function updatePIRDisplay(pirValue) {
  const pirValueElement = document.getElementById('pirValue');
  const pirDescription = document.getElementById('pirDescription');
  const motionIndicator = document.getElementById('motionIndicator');
  
  if (pirValueElement) {
    const isPirEnabled = relayStates.relay2;
    pirValueElement.textContent = isPirEnabled ? (pirValue ? "Motion" : "Clear") : "Disabled";
  }
  
  if (pirDescription) {
    const isPirEnabled = relayStates.relay2;
    if (!isPirEnabled) {
      pirDescription.textContent = 'Motion sensor disabled - Enable "Motion Light" to activate monitoring';
    } else {
      pirDescription.textContent = pirValue ? 
        "Motion detected - Auto light activated" : 
        "No movement detected in monitored area";
    }
  }
  
  if (motionIndicator) {
    motionIndicator.className = pirValue ? "motion-indicator active" : "motion-indicator";
  }
}

// Firebase listeners
function startFirebaseListeners() {
  // Test LED listener
  database.ref('/testLed').on('value', (snapshot) => {
    const state = snapshot.val();
    if (state !== null) {
      relayStates.testLed = state;
      updateTestLedUI(state);
    }
  });
  
  // Device state listeners
  for (let i = 1; i <= 4; i++) {
    database.ref(`/relay${i}`).on('value', (snapshot) => {
      const state = snapshot.val();
      if (state !== null) {
        relayStates[`relay${i}`] = state;
        updateDeviceUI(`relay${i}`, state);
      }
    });
  }
  
  // Motor state listeners
  database.ref('/motor/enabled').on('value', (snapshot) => {
    const enabled = snapshot.val();
    if (enabled !== null && enabled !== currentMotorValues.enabled) {
      updateMotorStatus(enabled, currentMotorValues.speed, currentMotorValues.direction);
    }
  });
  
  database.ref('/motor/speed').on('value', (snapshot) => {
    const speed = snapshot.val();
    if (speed !== null && speed !== currentMotorValues.speed) {
      updateMotorStatus(currentMotorValues.enabled, speed, currentMotorValues.direction);
    }
  });
  
  database.ref('/motor/direction').on('value', (snapshot) => {
    const direction = snapshot.val();
    if (direction !== null && direction !== currentMotorValues.direction) {
      updateMotorStatus(currentMotorValues.enabled, currentMotorValues.speed, direction);
    }
  });
  
  // Sensor listeners
  database.ref('/sensors/ldr').on('value', (snapshot) => {
    const ldrValue = snapshot.val();
    if (ldrValue !== null) {
      currentSensorValues.ldr = ldrValue;
      updateLDRDisplay(ldrValue);
      updateOverviewSensorDisplay();
    }
  });
  
  database.ref('/sensors/pir').on('value', (snapshot) => {
    const pirValue = snapshot.val();
    if (pirValue !== null) {
      currentSensorValues.pir = pirValue;
      updatePIRDisplay(pirValue);
      updateOverviewSensorDisplay();
    }
  });
  
  database.ref('/sensors/temperature').on('value', (snapshot) => {
    const temp = snapshot.val();
    if (temp !== null) {
      currentSensorValues.temperature = temp;
      updateTemperatureDisplay(temp, currentSensorValues.humidity);
      updateOverviewSensorDisplay();
    }
  });
  
  database.ref('/sensors/humidity').on('value', (snapshot) => {
    const humidity = snapshot.val();
    if (humidity !== null) {
      currentSensorValues.humidity = humidity;
      updateTemperatureDisplay(currentSensorValues.temperature, humidity);
      updateOverviewSensorDisplay();
    }
  });
  
  // Notifications listener
  database.ref('/notifications/latest').on('value', (snapshot) => {
    const notification = snapshot.val();
    if (notification && notification !== lastNotificationTime) {
      addNotification(notification, 'info', 'System Alert');
      lastNotificationTime = notification;
    }
  });
}

function refreshSensors() {
  const refreshBtn = document.querySelector('.refresh-btn i');
  if (refreshBtn) {
    refreshBtn.style.animation = 'spin 1s linear infinite';
    setTimeout(() => {
      refreshBtn.style.animation = '';
    }, 1000);
  }
  
  // Force refresh sensor data from Firebase
  database.ref("/sensors").once("value").then((snapshot) => {
    const data = snapshot.val();
    if (data) {
      if (data.ldr !== undefined) {
        currentSensorValues.ldr = data.ldr;
        updateLDRDisplay(data.ldr);
      }
      if (data.pir !== undefined) {
        currentSensorValues.pir = data.pir;
        updatePIRDisplay(data.pir);
      }
      if (data.temperature !== undefined) {
        currentSensorValues.temperature = data.temperature;
      }
      if (data.humidity !== undefined) {
        currentSensorValues.humidity = data.humidity;
      }
      updateTemperatureDisplay(currentSensorValues.temperature, currentSensorValues.humidity);
      updateOverviewSensorDisplay();
    }
    addNotification("Sensor data refreshed successfully", "success", "Refresh Complete");
  }).catch((error) => {
    console.warn("Failed to refresh sensor data:", error);
    addNotification("Failed to refresh sensor data", "error", "Refresh Error");
  });
}

function clearNotifications() {
  const notificationsList = document.getElementById("notificationsList");
  if (notificationsList) {
    notificationsList.innerHTML = '';
  }
  updateNotificationCount();
  addNotification("Notification history cleared", "info", "Notifications");
}

// Make functions globally available for HTML onclick events
window.refreshSensors = refreshSensors;
window.clearNotifications = clearNotifications;
