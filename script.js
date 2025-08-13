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

// Predefined login credentials (can be replaced with your logic)
const allowedEmail = "amit@gmail.com";
const allowedPassword = "amit1234";

const loginForm = document.getElementById("loginForm");
const dashboard = document.getElementById("dashboard");
const loginBtn = document.getElementById("loginBtn");

// Notification management
let lastNotificationTime = 0;
const maxNotifications = 10;

function addNotification(message, type = 'info') {
  const notificationsList = document.getElementById("notificationsList");
  const notificationItem = document.createElement("div");
  notificationItem.className = `notification-item ${type}`;
  
  const currentTime = new Date();
  const timeString = currentTime.toLocaleTimeString();
  
  notificationItem.innerHTML = `
    <div>${message}</div>
    <div class="notification-time">${timeString}</div>
  `;
  
  // Add to beginning of list
  notificationsList.insertBefore(notificationItem, notificationsList.firstChild);
  
  // Keep only the latest notifications
  while (notificationsList.children.length > maxNotifications) {
    notificationsList.removeChild(notificationsList.lastChild);
  }
  
  // Auto-remove old notifications after 30 seconds
  setTimeout(() => {
    if (notificationItem.parentNode) {
      notificationItem.style.opacity = '0.5';
    }
  }, 30000);
}

function updateSensorStatus(ldrValue, pirValue) {
  const ldrStatus = document.getElementById("ldrStatus");
  const pirStatus = document.getElementById("pirStatus");
  const ldrValueSpan = document.getElementById("ldrValue");
  const pirValueSpan = document.getElementById("pirValue");
  
  // Update LDR status
  ldrValueSpan.textContent = `Value: ${ldrValue}`;
  if (ldrValue < 500) { // Dark threshold
    ldrStatus.className = "sensor-indicator active";
    ldrValueSpan.textContent += " (Dark)";
  } else {
    ldrStatus.className = "sensor-indicator inactive";
    ldrValueSpan.textContent += " (Bright)";
  }
  
  // Update PIR status
  pirValueSpan.textContent = pirValue ? "Motion Detected" : "No Motion";
  pirStatus.className = pirValue ? "sensor-indicator active" : "sensor-indicator inactive";
}

loginBtn.addEventListener("click", () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Please enter email and password.");
    return;
  }

  // Check hardcoded credentials first
  if(email === allowedEmail && password === allowedPassword){
    // Sign in with Firebase
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then(userCredential => {
        console.log("Signed in as", userCredential.user.email);
        loginForm.style.display = "none";
        dashboard.style.display = "block";
        startRelayControl();
        startNotificationMonitoring();
      })
      .catch(error => {
        alert("Firebase login failed: " + error.message);
      });
  } else {
    alert("Invalid email or password.");
  }
});

function startRelayControl() {
  const db = firebase.database();

  const relays = [
    { id: 1, path: "relay1" },
    { id: 2, path: "relay2" },
    { id: 3, path: "relay3" },
    { id: 4, path: "relay4" },
  ];

  relays.forEach(relay => {
    const statusText = document.getElementById(`status${relay.id}`);
    const toggleButton = document.getElementById(`btn${relay.id}`);
    const relayRef = db.ref("/" + relay.path);

    relayRef.on("value", (snapshot) => {
      const state = snapshot.val();
      statusText.innerText = state ? "ON" : "OFF";
      toggleButton.style.backgroundColor = state ? "green" : "blue";
    });

    toggleButton.onclick = () => {
      relayRef.get().then(snap => {
        relayRef.set(!snap.val());
      });
    };
  });

  document.getElementById("allOffBtn").onclick = () => {
    relays.forEach(relay => {
      db.ref("/" + relay.path).set(false);
    });
  };
}

function startNotificationMonitoring() {
  const db = firebase.database();
  
  // Monitor notifications
  const notificationRef = db.ref("/notifications");
  notificationRef.on("value", (snapshot) => {
    const data = snapshot.val();
    if (data && data.latest) {
      const currentTime = data.timestamp || 0;
      if (currentTime > lastNotificationTime) {
        lastNotificationTime = currentTime;
        
        // Determine notification type
        let type = 'info';
        if (data.latest.includes('Motion detected')) {
          type = 'motion';
        } else if (data.latest.includes('Dark detected')) {
          type = 'dark';
        }
        
        addNotification(data.latest, type);
      }
    }
  });
  
  // Monitor sensor values (if available)
  const ldrRef = db.ref("/sensors/ldr");
  const pirRef = db.ref("/sensors/pir");
  
  ldrRef.on("value", (snapshot) => {
    const ldrValue = snapshot.val() || 0;
    const pirValue = false; // Will be updated by PIR listener
    updateSensorStatus(ldrValue, pirValue);
  });
  
  pirRef.on("value", (snapshot) => {
    const pirValue = snapshot.val() || false;
    const ldrValue = 0; // Will be updated by LDR listener
    updateSensorStatus(ldrValue, pirValue);
  });
}

document.getElementById("logoutBtn").onclick = () => {
  firebase.auth().signOut()
    .then(() => {
      dashboard.style.display = "none";
      loginForm.style.display = "block";
      document.getElementById("email").value = "";
      document.getElementById("password").value = "";
    })
    .catch(error => {
      alert("Logout failed: " + error.message);
    });
};
