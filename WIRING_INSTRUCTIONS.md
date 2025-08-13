# Wiring Instructions for LDR and PIR Sensors

## Components Needed

1. **LDR (Light Dependent Resistor)**
   - 1x LDR sensor
   - 1x 10kΩ resistor (for voltage divider)

2. **PIR Motion Sensor**
   - 1x HC-SR501 PIR motion sensor module

## Wiring Diagram

### LDR Sensor Connection
```
LDR Sensor to ESP8266:
┌─────────────┐
│   LDR       │
│  ┌─────┐    │
│  │     │    │
│  └─────┘    │
└─────────────┘
      │
      ├─── A0 (Analog Pin)
      │
┌─────────────┐
│  10kΩ Res   │
│  ┌─────┐    │
│  │     │    │
│  └─────┘    │
└─────────────┘
      │
      ├─── GND
      │
      ├─── 3.3V
```

**Detailed LDR Wiring:**
- Connect one leg of LDR to 3.3V
- Connect the other leg of LDR to A0 (Analog Pin)
- Connect a 10kΩ resistor between A0 and GND
- This creates a voltage divider circuit

### PIR Motion Sensor Connection
```
PIR Sensor to ESP8266:
┌─────────────────┐
│   HC-SR501      │
│  ┌───────────┐  │
│  │           │  │
│  │   PIR     │  │
│  │  Sensor   │  │
│  │           │  │
│  └───────────┘  │
└─────────────────┘
      │ │ │
      │ │ └─── GND
      │ └─── 3.3V
      └─── D8 (GPIO15)
```

**Detailed PIR Wiring:**
- VCC → 3.3V
- GND → GND
- OUT → D8 (GPIO15)

## Pin Assignments

| Component | ESP8266 Pin | Function |
|-----------|-------------|----------|
| LDR Sensor | A0 | Analog input for light level |
| PIR Sensor | D8 (GPIO15) | Digital input for motion detection |
| Relay 1 | D1 (GPIO5) | LDR-controlled light |
| Relay 2 | D2 (GPIO4) | Motion-controlled light |
| Relay 3 | D5 (GPIO14) | Manual control |
| Relay 4 | D6 (GPIO12) | Manual control |

## Sensor Configuration

### LDR Sensor
- **Threshold**: 500 (adjustable in code)
- **Behavior**: 
  - Below 500 = Dark (turns on light)
  - Above 500 = Bright (turns off light)
- **Calibration**: You may need to adjust `LDR_DARK_THRESHOLD` based on your lighting conditions

### PIR Sensor
- **Detection Range**: Typically 3-7 meters
- **Detection Angle**: 110 degrees
- **Delay**: 5 seconds (adjustable in code)
- **Behavior**:
  - Motion detected → Turn on light
  - No motion for 5 seconds → Turn off light

## Testing the Sensors

### LDR Test
1. Upload the code to ESP8266
2. Open Serial Monitor (115200 baud)
3. Cover/uncover the LDR sensor
4. Watch for "Dark detected" or "Bright detected" messages

### PIR Test
1. Wave your hand in front of the PIR sensor
2. Watch for "Motion detected" messages
3. Wait 5 seconds after motion stops
4. Watch for "No motion" messages

## Troubleshooting

### LDR Issues
- **No response**: Check voltage divider wiring
- **Wrong threshold**: Adjust `LDR_DARK_THRESHOLD` value
- **Inconsistent readings**: Ensure stable power supply

### PIR Issues
- **No detection**: Check power supply (3.3V)
- **False triggers**: Adjust sensor sensitivity or position
- **Continuous triggering**: Check for moving objects in detection area

### General Issues
- **ESP8266 not responding**: Check WiFi credentials
- **Firebase errors**: Verify Firebase configuration
- **Relay not working**: Check relay module polarity setting

## Code Customization

### Adjusting Sensitivity
```cpp
// In the Arduino code, modify these values:
#define LDR_DARK_THRESHOLD 500    // Increase for more sensitive dark detection
#define PIR_DELAY 5000           // Increase for longer light duration
```

### Adding More Sensors
- Follow the same pattern for additional sensors
- Add new pin definitions
- Create new sensor checking functions
- Update the loop() function

## Safety Notes

1. **Power Supply**: Use a stable 3.3V power supply
2. **Relay Module**: Ensure proper isolation for high-voltage devices
3. **Sensor Placement**: Position sensors away from heat sources
4. **Wiring**: Double-check all connections before powering on

## Next Steps

1. Upload the modified code to your ESP8266
2. Connect the sensors according to the wiring diagram
3. Test each sensor individually
4. Monitor the HTML interface for notifications
5. Adjust thresholds as needed for your environment
