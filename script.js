// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAfUcqCsJ1rUNrCV_lR6o6ZBwemiIJ6HGA",
  authDomain: "homeautomation-8c469.firebaseapp.com",
  databaseURL: "https://homeautomation-8c469-default-rtdb.firebaseio.com",
  projectId: "homeautomation-8c469",
  storageBucket: "homeautomation-8c469.firebasestorage.app",
  messagingSenderId: "413944940142",
  appId: "1:413944940142:web:01c153cfe3c23a5df9487f"
};

firebase.initializeApp(firebaseConfig);

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
let sensorsOnlineCount = 2;
const maxNotifications = 15;

// Relay states for conditional sensor monitoring
let relayStates = {
  relay1: false, // LDR Auto Light
  relay2: false, // Motion Light
  relay3: false,
  relay4: false
};

// Current sensor values
let currentSensorValues = {
  ldr: 512,
  pir: false
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
  const activeDevicesElement = document.getElementById("activeDevices");
  const sensorsOnlineElement = document.getElementById("sensorsOnline");
  const lastActivityElement = document.getElementById("lastActivity");
  
  if (activeDevicesElement) activeDevicesElement.textContent = activeDevicesCount;
  if (sensorsOnlineElement) sensorsOnlineElement.textContent = sensorsOnlineCount;
  if (lastActivityElement) lastActivityElement.textContent = new Date().toLocaleTimeString();
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
  
  notificationItem.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">
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
  
  // Update last activity
  updateOverviewMetrics();
  
  // Auto-fade old notifications after 30 seconds
  setTimeout(() => {
    if (notificationItem.parentNode) {
      notificationItem.style.opacity = '0.6';
    }
  }, 30000);
}

function updateSensorStatus(sensorType, value, isActive) {
  // Store current sensor values
  currentSensorValues[sensorType] = value;
  
  console.log(`Updating ${sensorType} sensor: value=${value}, active=${isActive}`);
  
  if (sensorType === 'ldr') {
    const ldrCard = document.getElementById("ldrSensorCard");
    const ldrBadge = document.getElementById("ldrStatusBadge");
    const ldrValue = document.getElementById("ldrValue");
    const ldrDescription = document.getElementById("ldrDescription");
    const ldrChart = document.getElementById("ldrChart");
    
    // Check if LDR Auto Light (relay1) is enabled for conditional monitoring
    const isLdrEnabled = relayStates.relay1;
    
    if (ldrValue) {
      ldrValue.textContent = value !== null && value !== undefined ? value : '--';
    }
    
    if (ldrBadge) {
      if (!isLdrEnabled) {
        ldrBadge.className = "sensor-status-badge inactive";
      } else {
        ldrBadge.className = isActive ? "sensor-status-badge active" : "sensor-status-badge inactive";
      }
    }
    
    if (ldrDescription) {
      if (!isLdrEnabled) {
        ldrDescription.textContent = `Light sensor disabled - Enable "LDR Auto Light" to activate monitoring (Current: ${value})`;
      } else {
        ldrDescription.textContent = isActive ? `Dark environment detected - Auto light activated (${value})` : `Bright environment detected (${value})`;
      }
    }
    
    if (ldrChart) {
      // Convert sensor value to percentage for chart
      const percentage = Math.min(100, (value / 1024) * 100);
      ldrChart.style.width = `${percentage}%`;
    }
    
    // Add visual indication when sensor is disabled
    if (ldrCard) {
      if (!isLdrEnabled) {
        ldrCard.style.opacity = '0.6';
        ldrCard.style.filter = 'grayscale(0.5)';
      } else {
        ldrCard.style.opacity = '1';
        ldrCard.style.filter = 'none';
      }
    }
    
  } else if (sensorType === 'pir') {
    const pirCard = document.getElementById("pirSensorCard");
    const pirBadge = document.getElementById("pirStatusBadge");
    const pirValue = document.getElementById("pirValue");
    const pirDescription = document.getElementById("pirDescription");
    const motionIndicator = document.getElementById("motionIndicator");
    
    // Check if Motion Light (relay2) is enabled for conditional monitoring
    const isPirEnabled = relayStates.relay2;
    
    if (pirValue) {
      if (value === null || value === undefined) {
        pirValue.textContent = "--";
      } else {
        pirValue.textContent = isPirEnabled ? (value ? "Motion" : "Clear") : "Disabled";
      }
    }
    
    if (pirBadge) {
      if (!isPirEnabled) {
        pirBadge.className = "sensor-status-badge inactive";
      } else {
        pirBadge.className = isActive ? "sensor-status-badge active" : "sensor-status-badge inactive";
      }
    }
    
    if (pirDescription) {
      if (!isPirEnabled) {
        pirDescription.textContent = 'Motion sensor disabled - Enable "Motion Light" to activate monitoring';
      } else {
        pirDescription.textContent = isActive ? "Motion detected - Auto light activated" : "No movement detected in monitored area";
      }
    }
    
    if (motionIndicator) {
      if (!isPirEnabled) {
        motionIndicator.className = "motion-indicator";
      } else {
        motionIndicator.className = isActive ? "motion-indicator active" : "motion-indicator";
      }
    }
    
    // Add visual indication when sensor is disabled
    if (pirCard) {
      if (!isPirEnabled) {
        pirCard.style.opacity = '0.6';
        pirCard.style.filter = 'grayscale(0.5)';
      } else {
        pirCard.style.opacity = '1';
        pirCard.style.filter = 'none';
      }
    }
  }
}

function updateDeviceStatus(deviceId, status) {
  const statusElement = document.getElementById(`status${deviceId}`);
  const deviceStatusIcon = document.getElementById(`deviceStatus${deviceId}`);
  const controlBtn = document.getElementById(`btn${deviceId}`);
  
  // Update relay states for conditional sensor monitoring
  relayStates[`relay${deviceId}`] = status;
  
  if (statusElement) {
    statusElement.textContent = status ? "ON" : "OFF";
    statusElement.className = status ? "status-value on" : "status-value off";
  }
  
  if (deviceStatusIcon) {
    deviceStatusIcon.className = status ? "device-status on" : "device-status off";
  }
  
  if (controlBtn) {
    controlBtn.className = status ? "control-btn on" : "control-btn off";
    controlBtn.innerHTML = `<i class="fas fa-power-off"></i> ${status ? 'Turn Off' : 'Turn On'}`;
  }
  
  // Update sensor status when relay states change
  if (deviceId === 1) { // LDR Auto Light Control
    const ldrValue = currentSensorValues.ldr;
    const isActive = ldrValue < 500; // Dark threshold
    updateSensorStatus('ldr', ldrValue, isActive);
    
    if (status) {
      addNotification("LDR Auto Light ENABLED - Light sensor now controlling Auto Light Device", "info", "Automation Enabled");
    } else {
      addNotification("LDR Auto Light DISABLED - Light sensor automation paused", "info", "Automation Disabled");
    }
  } else if (deviceId === 2) { // Motion Light Control
    const pirValue = currentSensorValues.pir;
    updateSensorStatus('pir', pirValue, pirValue);
    
    if (status) {
      addNotification("Motion Light ENABLED - PIR sensor now controlling Motion Light Device", "info", "Automation Enabled");
    } else {
      addNotification("Motion Light DISABLED - PIR sensor automation paused", "info", "Automation Disabled");
    }
  } else if (deviceId === 3) { // Auto Light Device
    if (status) {
      addNotification("Auto Light Device turned ON manually", "info", "Manual Control");
    } else {
      addNotification("Auto Light Device turned OFF manually", "info", "Manual Control");
    }
  } else if (deviceId === 4) { // Motion Light Device
    if (status) {
      addNotification("Motion Light Device turned ON manually", "info", "Manual Control");
    } else {
      addNotification("Motion Light Device turned OFF manually", "info", "Manual Control");
    }
  }
  
  // Update active devices count
  updateActiveDevicesCount();
}

function updateActiveDevicesCount() {
  activeDevicesCount = 0;
  for (let i = 1; i <= 4; i++) {
    const statusElement = document.getElementById(`status${i}`);
    if (statusElement && statusElement.textContent === "ON") {
      activeDevicesCount++;
    }
  }
  updateOverviewMetrics();
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
  const db = firebase.database();
  
  // Read current LDR value
  db.ref("/sensors/ldr").once("value").then((snapshot) => {
    const ldrValue = snapshot.val();
    if (ldrValue !== null) {
      currentSensorValues.ldr = ldrValue;
      console.log("Refreshed LDR value:", ldrValue);
      
      if (relayStates.relay1) {
        const isLdrActive = ldrValue < 500;
        updateSensorStatus('ldr', ldrValue, isLdrActive);
      } else {
        updateSensorStatus('ldr', ldrValue, false);
      }
    }
  }).catch((error) => {
    console.warn("Failed to refresh LDR value:", error);
  });
  
  // Read current PIR value
  db.ref("/sensors/pir").once("value").then((snapshot) => {
    const pirValue = snapshot.val();
    if (pirValue !== null) {
      currentSensorValues.pir = pirValue;
      console.log("Refreshed PIR value:", pirValue);
      
      if (relayStates.relay2) {
        updateSensorStatus('pir', pirValue, pirValue);
      } else {
        updateSensorStatus('pir', pirValue, false);
      }
    }
  }).catch((error) => {
    console.warn("Failed to refresh PIR value:", error);
  });
  
  addNotification("Sensor data refreshed - Status updated based on current relay states", "info", "Refresh Complete");
}

function clearNotifications() {
  const notificationsList = document.getElementById("notificationsList");
  if (notificationsList) {
    // Keep only the welcome message
    const welcomeMessage = notificationsList.querySelector('.notification-item.welcome');
    notificationsList.innerHTML = '';
    if (welcomeMessage) {
      notificationsList.appendChild(welcomeMessage);
    }
  }
  addNotification("Notification history cleared", "info", "Notifications");
}

// Motor control functions
function updateMotorStatus(enabled, speed, direction) {
  currentMotorValues.enabled = enabled;
  currentMotorValues.speed = speed;
  currentMotorValues.direction = direction;
  
  const motorIcon = document.getElementById("motorIcon");
  const motorBadge = document.getElementById("motorStatusBadge");
  const motorToggle = document.getElementById("motorToggle");
  const motorToggleText = document.getElementById("motorToggleText");
  const directionBtn = document.getElementById("motorDirection");
  const directionText = document.getElementById("directionText");
  const speedSlider = document.getElementById("speedSlider");
  const speedValue = document.getElementById("speedValue");
  
  // Update motor icon animation
  if (motorIcon) {
    if (enabled && speed > 0) {
      motorIcon.style.animation = 'spin 1s linear infinite';
    } else {
      motorIcon.style.animation = 'none';
    }
  }
  
  // Update status badge
  if (motorBadge) {
    motorBadge.className = enabled ? "motor-status-badge active" : "motor-status-badge inactive";
  }
  
  // Update toggle button
  if (motorToggle && motorToggleText) {
    motorToggle.className = enabled ? "toggle-btn on" : "toggle-btn off";
    motorToggleText.textContent = enabled ? "ON" : "OFF";
  }
  
  // Update direction button
  if (directionBtn && directionText) {
    directionBtn.className = enabled ? "direction-btn active" : "direction-btn";
    directionText.textContent = direction ? "Forward" : "Reverse";
    const icon = directionBtn.querySelector('i');
    if (icon) {
      icon.className = direction ? "fas fa-arrow-right" : "fas fa-arrow-left";
    }
  }
  
  // Update speed slider and display
  if (speedSlider) {
    speedSlider.value = speed;
    speedSlider.disabled = !enabled;
  }
  
  if (speedValue) {
    const percentage = Math.round((speed / 255) * 100);
    speedValue.textContent = percentage;
  }
  
  console.log(`Motor status updated: ${enabled ? 'ON' : 'OFF'}, Speed: ${speed}, Direction: ${direction ? 'Forward' : 'Reverse'}`);
}

function setMotorState(enabled) {
  const db = firebase.database();
  db.ref("/motor/enabled").set(enabled).then(() => {
    addNotification(`DC Fan ${enabled ? 'turned ON' : 'turned OFF'}`, "info", "Motor Control");
  }).catch(error => {
    console.warn("Failed to set motor state:", error);
    addNotification(`Failed to ${enabled ? 'start' : 'stop'} DC Fan`, "info", "Motor Control");
  });
}

function setMotorSpeed(speed) {
  const db = firebase.database();
  const constrainedSpeed = Math.max(0, Math.min(255, speed));
  
  db.ref("/motor/speed").set(constrainedSpeed).then(() => {
    const percentage = Math.round((constrainedSpeed / 255) * 100);
    addNotification(`DC Fan speed set to ${percentage}%`, "info", "Motor Control");
  }).catch(error => {
    console.warn("Failed to set motor speed:", error);
    addNotification("Failed to set DC Fan speed", "info", "Motor Control");
  });
}

function setMotorDirection(forward) {
  const db = firebase.database();
  db.ref("/motor/direction").set(forward).then(() => {
    addNotification(`DC Fan direction: ${forward ? 'Forward' : 'Reverse'}`, "info", "Motor Control");
  }).catch(error => {
    console.warn("Failed to set motor direction:", error);
    addNotification("Failed to set DC Fan direction", "info", "Motor Control");
  });
}

function initializeMotorControls() {
  const motorToggle = document.getElementById("motorToggle");
  const directionBtn = document.getElementById("motorDirection");
  const speedSlider = document.getElementById("speedSlider");
  const motorStopBtn = document.getElementById("motorStopBtn");
  const presetBtns = document.querySelectorAll(".preset-btn");
  
  // Motor toggle button
  if (motorToggle) {
    motorToggle.onclick = () => {
      const newState = !currentMotorValues.enabled;
      setMotorState(newState);
    };
  }
  
  // Direction button
  if (directionBtn) {
    directionBtn.onclick = () => {
      if (currentMotorValues.enabled) {
        const newDirection = !currentMotorValues.direction;
        setMotorDirection(newDirection);
      }
    };
  }
  
  // Speed slider
  if (speedSlider) {
    speedSlider.oninput = (e) => {
      const speed = parseInt(e.target.value);
      setMotorSpeed(speed);
    };
  }
  
  // Emergency stop
  if (motorStopBtn) {
    motorStopBtn.onclick = () => {
      setMotorState(false);
      setMotorSpeed(0);
      addNotification("Emergency stop activated - DC Fan stopped", "info", "Emergency Control");
    };
  }
  
  // Speed preset buttons
  presetBtns.forEach(btn => {
    btn.onclick = () => {
      const speed = parseInt(btn.dataset.speed);
      if (currentMotorValues.enabled) {
        setMotorSpeed(speed);
      } else {
        // Turn on motor and set speed
        setMotorState(true);
        setTimeout(() => setMotorSpeed(speed), 100);
      }
    };
  });
}

// Login functionality
loginBtn.addEventListener("click", () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  showLoading();

  // Check hardcoded credentials first
  if (email === allowedEmail && password === allowedPassword) {
    // Sign in with Firebase
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then(userCredential => {
        console.log("Signed in as", userCredential.user.email);
        hideLoading();
        loginForm.style.display = "none";
        dashboard.style.display = "flex";
        dashboard.classList.add("active");
        
        // Initialize dashboard
        initializeDashboard();
        addNotification("Successfully logged into Smart Home Hub", "welcome", "Welcome Back!");
      })
      .catch(error => {
        hideLoading();
        console.error("Firebase login error:", error);
        // Even if Firebase fails, allow login with correct credentials
        loginForm.style.display = "none";
        dashboard.style.display = "flex";
        dashboard.classList.add("active");
        initializeDashboard();
        addNotification("Logged in with offline mode", "welcome", "Welcome!");
      });
  } else {
    hideLoading();
    alert("Invalid email or password. Please try again.");
  }
});

function initializeDashboard() {
  startRelayControl();
  startNotificationMonitoring();
  initializeMotorControls();
  updateOverviewMetrics();
  
  // Initialize sensor status with conditional monitoring
  // Sensors start as disabled until their corresponding relays are turned on
  updateSensorStatus('ldr', 512, false);
  updateSensorStatus('pir', false, false);
  
  // Initialize motor status
  updateMotorStatus(false, 0, true);
  
  // Force initial sensor data fetch after a short delay
  setTimeout(() => {
    const db = firebase.database();
    
    // Read initial LDR value
    db.ref("/sensors/ldr").once("value").then((snapshot) => {
      const ldrValue = snapshot.val();
      if (ldrValue !== null) {
        currentSensorValues.ldr = ldrValue;
        console.log("Initial LDR value:", ldrValue);
        
        // Update display based on current relay state
        const isLdrEnabled = relayStates.relay1;
        const isActive = ldrValue < 500;
        updateSensorStatus('ldr', ldrValue, isLdrEnabled ? isActive : false);
      }
    }).catch((error) => {
      console.warn("Failed to read initial LDR value:", error);
    });
    
    // Read initial PIR value
    db.ref("/sensors/pir").once("value").then((snapshot) => {
      const pirValue = snapshot.val();
      if (pirValue !== null) {
        currentSensorValues.pir = pirValue;
        console.log("Initial PIR value:", pirValue);
        
        // Update display based on current relay state
        const isPirEnabled = relayStates.relay2;
        updateSensorStatus('pir', pirValue, isPirEnabled ? pirValue : false);
      }
    }).catch((error) => {
      console.warn("Failed to read initial PIR value:", error);
    });
    
    // Read initial motor values
    db.ref("/motor").once("value").then((snapshot) => {
      const motorData = snapshot.val();
      if (motorData) {
        const enabled = motorData.enabled || false;
        const speed = motorData.speed || 0;
        const direction = motorData.direction !== undefined ? motorData.direction : true;
        
        console.log("Initial motor values:", { enabled, speed, direction });
        updateMotorStatus(enabled, speed, direction);
      }
    }).catch((error) => {
      console.warn("Failed to read initial motor values:", error);
    });
  }, 1000); // Wait 1 second for relay states to be loaded
}

function startRelayControl() {
  const db = firebase.database();

  const relays = [
    { id: 1, path: "relay1", name: "LDR Auto Light Control" },
    { id: 2, path: "relay2", name: "Motion Light Control" },
    { id: 3, path: "relay3", name: "Auto Light Device" },
    { id: 4, path: "relay4", name: "Motion Light Device" },
  ];

  relays.forEach(relay => {
    const toggleButton = document.getElementById(`btn${relay.id}`);
    const relayRef = db.ref("/" + relay.path);

    // Listen for database changes
    relayRef.on("value", (snapshot) => {
      const state = snapshot.val();
      updateDeviceStatus(relay.id, state);
    }, (error) => {
      console.warn(`Failed to read ${relay.path}:`, error);
      // Set default state if Firebase fails
      updateDeviceStatus(relay.id, false);
    });

    // Handle button clicks
    if (toggleButton) {
      toggleButton.onclick = () => {
        const currentStatus = document.getElementById(`status${relay.id}`);
        const newState = currentStatus && currentStatus.textContent === "OFF";
        
        relayRef.set(newState).then(() => {
          addNotification(
            `${relay.name} turned ${newState ? 'ON' : 'OFF'}`,
            "info",
            "Device Control"
          );
        }).catch(error => {
          console.warn("Failed to update relay:", error);
          // Update UI anyway for offline functionality
          updateDeviceStatus(relay.id, newState);
          addNotification(
            `${relay.name} turned ${newState ? 'ON' : 'OFF'} (offline mode)`,
            "info",
            "Device Control"
          );
        });
      };
    }
  });

  // Emergency off button
  const allOffBtn = document.getElementById("allOffBtn");
  if (allOffBtn) {
    allOffBtn.onclick = () => {
      relays.forEach(relay => {
        db.ref("/" + relay.path).set(false).catch(error => {
          console.warn("Failed to turn off relay:", error);
          updateDeviceStatus(relay.id, false);
        });
      });
      addNotification("Emergency shutdown activated - All devices turned OFF", "info", "Emergency Control");
    };
  }
}

function startNotificationMonitoring() {
  const db = firebase.database();
  
  // Monitor notifications from Firebase
  const notificationRef = db.ref("/notifications");
  notificationRef.on("value", (snapshot) => {
    const data = snapshot.val();
    if (data && data.latest) {
      const currentTime = data.timestamp || Date.now();
      if (currentTime > lastNotificationTime) {
        lastNotificationTime = currentTime;
        
        // Determine notification type and title
        let type = 'info';
        let title = 'System Alert';
        
        if (data.latest.includes('Motion detected')) {
          type = 'motion';
          title = 'Motion Sensor';
        } else if (data.latest.includes('Dark detected') || data.latest.includes('Light detected')) {
          type = 'dark';
          title = 'Light Sensor';
        }
        
        addNotification(data.latest, type, title);
      }
    }
  }, (error) => {
    console.warn("Failed to monitor notifications:", error);
  });
  
  // Monitor sensor values with conditional monitoring
  const ldrRef = db.ref("/sensors/ldr");
  const pirRef = db.ref("/sensors/pir");
  
  ldrRef.on("value", (snapshot) => {
    const ldrValue = snapshot.val();
    console.log("LDR value received from Firebase:", ldrValue);
    
    if (ldrValue !== null) {
      currentSensorValues.ldr = ldrValue;
      // Only process LDR if relay1 (LDR Auto Light) is enabled
      if (relayStates.relay1) {
        const isActive = ldrValue < 500; // Dark threshold
        updateSensorStatus('ldr', ldrValue, isActive);
        
        // Send notification for significant changes
        if (isActive && ldrValue < 300) {
          addNotification(`Very dark detected (${ldrValue}) - Auto light activated`, "dark", "Light Sensor");
        } else if (!isActive && ldrValue > 700) {
          addNotification(`Bright light detected (${ldrValue}) - Auto light deactivated`, "dark", "Light Sensor");
        }
      } else {
        // Update display but show as disabled
        updateSensorStatus('ldr', ldrValue, false);
      }
    }
  }, (error) => {
    console.warn("Failed to read LDR sensor:", error);
  });
  
  pirRef.on("value", (snapshot) => {
    const pirValue = snapshot.val();
    console.log("PIR value received from Firebase:", pirValue);
    
    if (pirValue !== null) {
      currentSensorValues.pir = pirValue;
      // Only process PIR if relay2 (Motion Light) is enabled
      if (relayStates.relay2) {
        updateSensorStatus('pir', pirValue, pirValue);
        
        // Send notification for motion detection
        if (pirValue) {
          addNotification("Motion detected - Auto light activated", "motion", "Motion Sensor");
        } else {
          addNotification("Motion cleared - Auto light will turn off after delay", "motion", "Motion Sensor");
        }
      } else {
        // Update display but show as disabled
        updateSensorStatus('pir', pirValue, false);
      }
    }
  }, (error) => {
    console.warn("Failed to read PIR sensor:", error);
  });
  
  // Monitor motor values
  const motorEnabledRef = db.ref("/motor/enabled");
  const motorSpeedRef = db.ref("/motor/speed");
  const motorDirectionRef = db.ref("/motor/direction");
  
  motorEnabledRef.on("value", (snapshot) => {
    const enabled = snapshot.val();
    if (enabled !== null && enabled !== currentMotorValues.enabled) {
      console.log("Motor enabled changed:", enabled);
      updateMotorStatus(enabled, currentMotorValues.speed, currentMotorValues.direction);
    }
  }, (error) => {
    console.warn("Failed to read motor enabled state:", error);
  });
  
  motorSpeedRef.on("value", (snapshot) => {
    const speed = snapshot.val();
    if (speed !== null && speed !== currentMotorValues.speed) {
      console.log("Motor speed changed:", speed);
      updateMotorStatus(currentMotorValues.enabled, speed, currentMotorValues.direction);
    }
  }, (error) => {
    console.warn("Failed to read motor speed:", error);
  });
  
  motorDirectionRef.on("value", (snapshot) => {
    const direction = snapshot.val();
    if (direction !== null && direction !== currentMotorValues.direction) {
      console.log("Motor direction changed:", direction);
      updateMotorStatus(currentMotorValues.enabled, currentMotorValues.speed, direction);
    }
  }, (error) => {
    console.warn("Failed to read motor direction:", error);
  });
}

// Motor Control Functions
function toggleMotor() {
    const currentState = currentMotorValues.enabled;
    const newState = !currentState;
    
    firebase.database().ref('/motor/enabled').set(newState)
        .then(() => {
            currentMotorValues.enabled = newState;
            updateMotorUI();
            
            const message = newState ? 'DC Fan turned ON' : 'DC Fan turned OFF';
            addNotification(message, 'info', 'Motor Control');
            
            console.log('Motor state updated:', newState);
        })
        .catch((error) => {
            console.error('Error updating motor state:', error);
            addNotification('Failed to update motor state', 'error', 'Motor Error');
        });
}

function setMotorSpeed(speed) {
    const speedValue = parseInt(speed);
    const speedPercent = Math.round((speedValue / 255) * 100);
    
    firebase.database().ref('/motor/speed').set(speedValue)
        .then(() => {
            currentMotorValues.speed = speedValue;
            document.getElementById('speedValue').textContent = speedPercent;
            document.getElementById('speedSlider').value = speedValue;
            
            if (currentMotorValues.enabled) {
                const message = `Motor speed set to ${speedPercent}%`;
                addNotification(message, 'info', 'Motor Control');
            }
            
            console.log('Motor speed updated:', speedPercent + '%');
        })
        .catch((error) => {
            console.error('Error updating motor speed:', error);
        });
}

function setMotorDirection(forward) {
    firebase.database().ref('/motor/direction').set(forward)
        .then(() => {
            currentMotorValues.direction = forward;
            updateMotorDirectionUI();
            
            const direction = forward ? 'Forward' : 'Reverse';
            addNotification(`Motor direction set to ${direction}`, 'info', 'Motor Control');
            
            console.log('Motor direction updated:', direction);
        })
        .catch((error) => {
            console.error('Error updating motor direction:', error);
        });
}

function setSpeedPreset(percent) {
    const speedValue = Math.round((percent / 100) * 255);
    setMotorSpeed(speedValue);
}

function emergencyStopMotor() {
    firebase.database().ref('/motor').update({
        enabled: false,
        speed: 0
    })
    .then(() => {
        currentMotorValues.enabled = false;
        currentMotorValues.speed = 0;
        updateMotorUI();
        
        addNotification('EMERGENCY STOP: Motor turned OFF', 'error', 'Emergency');
        console.log('Emergency stop activated');
    })
    .catch((error) => {
        console.error('Error in emergency stop:', error);
    });
}

function updateMotorUI() {
    const motorToggle = document.getElementById('motorToggle');
    const motorIcon = document.getElementById('motorIcon');
    const motorStatus = document.getElementById('motorStatus');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    
    if (motorToggle && motorIcon && motorStatus) {
        if (currentMotorValues.enabled) {
            motorToggle.className = 'toggle-btn on';
            motorToggle.innerHTML = '<i class="fas fa-power-off"></i><span>ON</span>';
            motorStatus.className = 'motor-status-badge active';
            motorIcon.style.animation = 'spin 2s linear infinite';
            speedSlider.disabled = false;
        } else {
            motorToggle.className = 'toggle-btn off';
            motorToggle.innerHTML = '<i class="fas fa-power-off"></i><span>OFF</span>';
            motorStatus.className = 'motor-status-badge inactive';
            motorIcon.style.animation = 'none';
            speedSlider.disabled = true;
        }
        
        const speedPercent = Math.round((currentMotorValues.speed / 255) * 100);
        speedValue.textContent = speedPercent;
        speedSlider.value = currentMotorValues.speed;
    }
}

function updateMotorDirectionUI() {
    const forwardBtn = document.getElementById('forwardBtn');
    
    if (forwardBtn) {
        if (currentMotorValues.direction) {
            forwardBtn.className = 'direction-btn active';
            forwardBtn.innerHTML = '<i class="fas fa-arrow-up"></i><span>Forward</span>';
        } else {
            forwardBtn.className = 'direction-btn active';
            forwardBtn.innerHTML = '<i class="fas fa-arrow-down"></i><span>Reverse</span>';
        }
    }
}

// Temperature and Humidity Update Functions
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
        
        // Temperature-based notifications
        if (temp > 30 && !temperatureNotified) {
            addNotification(`High temperature detected: ${temp.toFixed(1)}°C`, 'warning', 'Temperature Alert');
            temperatureNotified = true;
        } else if (temp <= 28) {
            temperatureNotified = false;
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

// Add to your existing Firebase listener
let temperatureNotified = false;

// Update your existing Firebase real-time listener to include motor and temperature data
function startFirebaseListeners() {
    // Motor state listener
    firebase.database().ref('/motor').on('value', (snapshot) => {
        const motorData = snapshot.val();
        if (motorData) {
            currentMotorValues.enabled = motorData.enabled || false;
            currentMotorValues.speed = motorData.speed || 0;
            currentMotorValues.direction = motorData.direction !== false; // default to true
            updateMotorUI();
            updateMotorDirectionUI();
        }
    });
    
    // Temperature and humidity listener
    firebase.database().ref('/sensors').on('value', (snapshot) => {
        const sensorData = snapshot.val();
        if (sensorData) {
            if (sensorData.temperature !== undefined && sensorData.humidity !== undefined) {
                updateTemperatureDisplay(sensorData.temperature, sensorData.humidity);
            }
            
            // Update existing sensor displays
            if (sensorData.ldr !== undefined) {
                updateLDRDisplay(sensorData.ldr);
            }
            
            if (sensorData.pir !== undefined) {
                updatePIRDisplay(sensorData.pir);
            }
        }
    });
    
    // Automation state listeners for persistent button states
    firebase.database().ref('/automation/ldrAutoLight').on('value', (snapshot) => {
        const enabled = snapshot.val();
        if (enabled !== null) {
            ldrAutoLightEnabled = enabled;
            updateAutomationButtonUI('ldrAutoLight', enabled);
        }
    });
    
    firebase.database().ref('/automation/motionLight').on('value', (snapshot) => {
        const enabled = snapshot.val();
        if (enabled !== null) {
            motionLightEnabled = enabled;
            updateAutomationButtonUI('motionLight', enabled);
        }
    });
}

// Call this function after Firebase initialization
function initializeSystem() {
    // Initialize motor UI
    updateMotorUI();
    updateMotorDirectionUI();
    
    // Start all Firebase listeners
    startFirebaseListeners();
    
    // Add welcome notification
    addNotification('Smart Home System with Temperature Control initialized successfully!', 'welcome', 'System Ready');
    
    hideLoading();
}

// Logout functionality
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.onclick = () => {
    showLoading();
    
    firebase.auth().signOut()
      .then(() => {
        hideLoading();
        dashboard.style.display = "none";
        dashboard.classList.remove("active");
        loginForm.style.display = "flex";
        
        // Clear form
        document.getElementById("email").value = "";
        document.getElementById("password").value = "";
        
        // Reset counters
        activeDevicesCount = 0;
        lastNotificationTime = 0;
      })
      .catch(error => {
        hideLoading();
        console.error("Logout failed:", error);
        // Force logout anyway
        dashboard.style.display = "none";
        dashboard.classList.remove("active");
        loginForm.style.display = "flex";
      });
  };
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  hideLoading();
  updateOverviewMetrics();
});

// Make functions globally available for HTML onclick events
window.refreshSensors = refreshSensors;
window.clearNotifications = clearNotifications;

