# 🌐 IoT Environmental Monitoring System — Fire, Gas, Temperature & Humidity Detection

An academic IoT-based environmental monitoring system built using an **ESP32** microcontroller and multiple sensors, including a Flame Sensor, MQ-2 Gas Sensor, and DHT22 Temperature and Humidity Sensor.

The system collects sensor data through the ESP32 and sends it to a **Django backend** via HTTP REST API. The collected data is displayed on a real-time web dashboard. When potentially dangerous conditions are detected, the system automatically activates a buzzer and sends an email alert to the device owner.

## ✨ Features

- 📡 **Real-Time Data Collection:** Receives sensor readings from ESP32 through an HTTP API.
- 🔥 **Environmental Hazard Detection:** Detects fire, gas/smoke, high temperatures, and abnormal humidity levels.
- 🚨 **Automatic Alarm System:** Activates the buzzer when dangerous conditions are detected, with an option for manual deactivation.
- 📧 **Email Notifications:** Sends automatic warning emails to the device owner using Gmail SMTP.
- 👤 **User Authentication:** Custom user registration and login system.
- 📊 **Live Web Dashboard:** Displays real-time sensor readings and environmental status.

## 🛠 Technologies

| Component | Technology |
|---|---|
| Backend | Django 6.0 |
| Database | SQLite |
| Frontend | HTML, CSS, JavaScript, Bootstrap 5 |
| Microcontroller | ESP32 |
| Sensors | DHT22, MQ-2, Flame Sensor |
| Alarm Hardware | Buzzer, LED |
| Hardware-Server Communication | HTTP REST API (JSON) |
| Email Service | Gmail SMTP |

## 📁 Project Structure

```text
├── accounts/              # User authentication, registration, and profiles
├── devices/               # Device management, sensor data, alerts, and buzzer control
├── config/                # Main Django project configuration
├── static/                # Dashboard CSS and JavaScript files
├── templates/             # HTML dashboard templates
├── hardware/
│   └── esp32_firmware.ino # ESP32 firmware (Arduino)
├── requirements.txt       # Python dependencies
├── .env.example           # Environment variables template
└── manage.py              # Django management utility
```

## 🚀 Installation & Setup (Web Backend)

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd <PROJECT_DIRECTORY>
```

### 2. Create a Virtual Environment and Install Dependencies

```bash
python -m venv venv
```

**Windows:**
```bash
venv\Scripts\activate
```

**Linux / macOS:**
```bash
source venv/bin/activate
```

Install the required packages:

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file using the provided example:

```bash
cp .env.example .env
```

Open the `.env` file and configure the following variables:

- `SECRET_KEY` — A secure, randomly generated Django secret key.
- `EMAIL_HOST_USER` — Your Gmail address used for sending alert notifications.
- `EMAIL_HOST_PASSWORD` — Your Gmail App Password.

For Gmail SMTP authentication, you may need to generate an App Password through [Google Account Security](https://myaccount.google.com/apppasswords).

> ⚠️ **Security Notice:** The `.env` file contains sensitive credentials and should be excluded from version control through `.gitignore`. Never commit it to a public repository.

### 4. Apply Database Migrations

```bash
python manage.py migrate
```

### 5. Create a Superuser (Optional)

```bash
python manage.py createsuperuser
```

### 6. Start the Development Server

```bash
python manage.py runserver 0.0.0.0:8000
```

The web dashboard will be available at:

```text
http://127.0.0.1:8000/
```

## 🔌 Hardware Setup (ESP32)

1. Open `hardware/esp32_firmware.ino` using **Arduino IDE**.
2. Install the required libraries:
   - `ArduinoJson`
   - `DHT sensor library`
3. Update the following configuration values in the firmware:
   - `ssid` and `password` — Your Wi-Fi network credentials.
   - `serverUrl` — The IP address of the computer running the Django server. Both devices must be connected to the same local network.
4. Upload the firmware to your ESP32 board.

### Sensor Pin Configuration

| Component | ESP32 GPIO |
|---|---|
| MQ-2 Gas Sensor | GPIO 34 |
| Flame Sensor | GPIO 35 |
| DHT22 Temperature & Humidity Sensor | GPIO 32 |
| Buzzer | GPIO 25 |
| LED | GPIO 26 |

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/devices/data/` | Receives sensor data from ESP32 |
| GET | `/devices/data/?all=1` | Retrieves the latest 50 records |
| GET | `/devices/data/all/` | Retrieves the latest 100 records |
| POST | `/devices/buzzer/` | Manually turns the buzzer on or off |
| GET | `/devices/buzzer/status/` | Retrieves the buzzer status for ESP32 |
| POST | `/accounts/register/` | Registers a new user |
| POST | `/accounts/login/` | Authenticates a user |
| POST | `/accounts/logout/` | Logs out the current user |
| GET | `/accounts/me/` | Retrieves the authenticated user's information |

## 📝 Notes

- This project was developed for academic and educational purposes.
- The default development configuration (such as `DEBUG=True`) is not suitable for production deployment.
- SQLite is used as the default database. For larger-scale or production applications, migrating to PostgreSQL is recommended.
- The ESP32 and Django server must be connected to the same local network for direct local communication.

## 👤 Author

**Samin AkbariZahmati**

Academic Project — IoT-Based Environmental Monitoring System
