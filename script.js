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
  if (deviceId === 1) { // LDR Auto Light
    const ldrValue = currentSensorValues.ldr;
    const isActive = ldrValue < 500; // Dark threshold
    updateSensorStatus('ldr', ldrValue, isActive);
    
    if (status) {
      addNotification("LDR Auto Light enabled - Light sensor now monitoring ambient levels", "info", "Sensor Activation");
    } else {
      addNotification("LDR Auto Light disabled - Light sensor monitoring paused", "info", "Sensor Deactivation");
    }
  } else if (deviceId === 2) { // Motion Light
    const pirValue = currentSensorValues.pir;
    updateSensorStatus('pir', pirValue, pirValue);
    
    if (status) {
      addNotification("Motion Light enabled - PIR sensor now monitoring for movement", "info", "Sensor Activation");
    } else {
      addNotification("Motion Light disabled - PIR sensor monitoring paused", "info", "Sensor Deactivation");
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
  updateOverviewMetrics();
  
  // Initialize sensor status with conditional monitoring
  // Sensors start as disabled until their corresponding relays are turned on
  updateSensorStatus('ldr', 512, false);
  updateSensorStatus('pir', false, false);
  
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
  }, 1000); // Wait 1 second for relay states to be loaded
}

function startRelayControl() {
  const db = firebase.database();

  const relays = [
    { id: 1, path: "relay1", name: "LDR Light" },
    { id: 2, path: "relay2", name: "Motion Light" },
    { id: 3, path: "relay3", name: "Device 3" },
    { id: 4, path: "relay4", name: "Device 4" },
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
