#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "DHT.h"
#include <math.h>

/* ============================================================
   ESP32 SENSOR SYSTEM
   ============================================================ */


/* ============================================================
   PIN CONFIGURATION
   ============================================================ */

#define MQ2_DOUT     34
#define FLAME_PIN    35
#define DHTPIN       32
#define DHTTYPE      DHT22

#define BUZZER_PIN   25
#define LED_PIN      26


/* ============================================================
   WIFI
   ============================================================ */

const char* ssid = "YOUR_WIFI_SSID";       // نام وای‌فای خودت را بگذار
const char* password = "YOUR_WIFI_PASSWORD";   // رمز وای‌فای خودت را بگذار


/* ============================================================
   DJANGO
   ============================================================ */

// آدرس IP سرور جنگو در شبکه محلی خودت را جایگزین کن
const char* serverUrl =
  "http://YOUR_SERVER_IP:8000/devices/data/";

const char* buzzerStatusUrl =
  "http://YOUR_SERVER_IP:8000/devices/buzzer/status/";


/* ============================================================
   DEVICE
   ============================================================ */

const char* DEVICE_ID = "esp32_001";


/* ============================================================
   DHT
   ============================================================ */

DHT dht(DHTPIN, DHTTYPE);


/* ============================================================
   TIMING
   ============================================================ */

unsigned long lastSendTime = 0;

const unsigned long sendInterval = 5000;


unsigned long lastBuzzerStatusTime = 0;

const unsigned long buzzerStatusInterval = 1000;


unsigned long lastDHTReadTime = 0;

const unsigned long dhtReadInterval = 2500;

bool firstDHTRead = true;


/* ============================================================
   DHT STATE
   ============================================================ */

float lastValidTemperature = NAN;

float lastValidHumidity = NAN;

bool hasValidDHT = false;

int dhtErrorCount = 0;

const int MAX_DHT_ERRORS = 3;


/* ============================================================
   BUZZER MELODIES
   ============================================================ */

const int gasMelody[] = {
  880,
  987,
  1175,
  1319,
  1175,
  987,
  880
};

const int gasDuration = 120;

const int gasLength = 7;


const int flameMelody[] = {
  784,
  880,
  988,
  1175,
  988,
  880
};

const int flameDuration = 150;

const int flameLength = 6;


const int dhtMelody[] = {
  659,
  784,
  880,
  988,
  880,
  784
};

const int dhtDuration = 180;

const int dhtLength = 6;


/* ============================================================
   BUZZER PLAYBACK STATE
   ============================================================ */

unsigned long lastBuzzerTime = 0;

int currentNoteIndex = 0;

bool isPlayingMelody = false;

const int* currentMelody = nullptr;

int currentMelodyLength = 0;

int currentNoteDuration = 0;


/* ============================================================
   DJANGO BUZZER STATE
   ============================================================ */

bool djangoBuzzerActive = false;

bool djangoBuzzerMuted = false;


/* ============================================================
   SENSOR DANGER STATE
   ============================================================ */

bool currentSensorDanger = false;

bool currentGasDanger = false;

bool currentFireDanger = false;

bool currentDHTDanger = false;


/* ============================================================
   SETUP
   ============================================================ */

void setup() {

  Serial.begin(115200);

  delay(1000);

  Serial.println();

  Serial.println("========================================");

  Serial.println(
    "        ESP32 SENSOR SYSTEM"
  );

  Serial.println("========================================");


  /* ==========================================================
     PINS
     ========================================================== */

  /*
     GPIO34 و GPIO35 فقط INPUT هستند.
     بنابراین INPUT_PULLUP استفاده نمی‌کنیم.
  */

  pinMode(
    MQ2_DOUT,
    INPUT
  );

  pinMode(
    FLAME_PIN,
    INPUT
  );

  pinMode(
    LED_PIN,
    OUTPUT
  );

  pinMode(
    BUZZER_PIN,
    OUTPUT
  );


  digitalWrite(
    LED_PIN,
    LOW
  );

  noTone(
    BUZZER_PIN
  );


  /* ==========================================================
     DHT22
     ========================================================== */

  Serial.println(
    "🌡️ شروع DHT22..."
  );

  dht.begin();

  delay(2000);

  Serial.println(
    "✅ DHT22 آماده است"
  );


  /* ==========================================================
     WIFI
     ========================================================== */

  Serial.println(
    "📡 اتصال به WiFi..."
  );

  WiFi.begin(
    ssid,
    password
  );


  while (
    WiFi.status() != WL_CONNECTED
  ) {

    delay(500);

    Serial.print(".");
  }


  Serial.println();

  Serial.println(
    "✅ WiFi متصل شد"
  );


  Serial.print(
    "📡 IP Address: "
  );

  Serial.println(
    WiFi.localIP()
  );


  /* ==========================================================
     MQ2 WARM UP
     ========================================================== */

  Serial.println(
    "💨 در حال گرم شدن MQ-2 ..."
  );

  delay(30000);

  Serial.println(
    "✅ MQ-2 آماده است"
  );


  Serial.println(
    "========================================"
  );

  Serial.println(
    "✅ ESP32 READY"
  );

  Serial.println(
    "========================================"
  );
}


/* ============================================================
   LOOP
   ============================================================ */

void loop() {


  /* ==========================================================
     دریافت وضعیت Buzzer از Django
     هر 1 ثانیه
     ========================================================== */

  if (
    millis() -
    lastBuzzerStatusTime >=
    buzzerStatusInterval
  ) {

    lastBuzzerStatusTime =
      millis();


    getBuzzerStatus();


    /*
       بلافاصله وضعیت جدید اعمال شود.
    */

    updateBuzzer();
  }


  /* ==========================================================
     ارسال سنسورها
     هر 5 ثانیه
     ========================================================== */

  if (
    millis() -
    lastSendTime >=
    sendInterval
  ) {

    lastSendTime =
      millis();


    readAndSendData();
  }


  /* ==========================================================
     پخش ملودی
     ========================================================== */

  if (
    isPlayingMelody
  ) {

    playCurrentMelody();
  }
}


/* ============================================================
   READ DHT22
   ============================================================ */

bool readDHT22(
  float &temperature,
  float &humidity
) {

  /*
     جلوگیری از خواندن بیش از حد DHT22
  */

  if (
    !firstDHTRead &&
    millis() -
    lastDHTReadTime <
    dhtReadInterval
  ) {

    if (
      hasValidDHT
    ) {

      temperature =
        lastValidTemperature;

      humidity =
        lastValidHumidity;

      return true;
    }

    return false;
  }


  firstDHTRead = false;

  lastDHTReadTime =
    millis();


  Serial.println(
    "🌡️ خواندن DHT22..."
  );


  humidity =
    dht.readHumidity();

  temperature =
    dht.readTemperature();


  /*
     بررسی خطا
  */

  if (
    isnan(humidity) ||
    isnan(temperature)
  ) {

    dhtErrorCount++;


    Serial.print(
      "⚠️ خطای DHT22: "
    );

    Serial.println(
      dhtErrorCount
    );


    /*
       اگر مقدار قبلی معتبر داریم،
       همان را موقتاً نگه می‌داریم.
    */

    if (
      hasValidDHT
    ) {

      temperature =
        lastValidTemperature;

      humidity =
        lastValidHumidity;


      if (
        dhtErrorCount <
        MAX_DHT_ERRORS
      ) {

        return true;
      }


      return false;
    }


    return false;
  }


  /*
     مقدار معتبر
  */

  dhtErrorCount = 0;

  hasValidDHT = true;


  lastValidTemperature =
    temperature;

  lastValidHumidity =
    humidity;


  Serial.print(
    "🌡️ Temperature: "
  );

  Serial.println(
    temperature
  );


  Serial.print(
    "💧 Humidity: "
  );

  Serial.println(
    humidity
  );


  return true;
}


/* ============================================================
   GET BUZZER STATUS FROM DJANGO
   ============================================================ */

void getBuzzerStatus() {

  if (
    WiFi.status() != WL_CONNECTED
  ) {

    Serial.println(
      "❌ WiFi قطع است - Buzzer Status"
    );

    return;
  }


  HTTPClient http;


  String url =
    String(
      buzzerStatusUrl
    ) +
    "?device_id=" +
    DEVICE_ID;


  http.begin(
    url
  );


  http.setTimeout(
    1500
  );


  int httpCode =
    http.GET();


  if (
    httpCode == 200
  ) {

    String response =
      http.getString();


    Serial.print(
      "🔍 Buzzer Django: "
    );

    Serial.println(
      response
    );


    StaticJsonDocument<256> doc;


    DeserializationError error =
      deserializeJson(
        doc,
        response
      );


    if (
      !error
    ) {

      djangoBuzzerActive =
        doc["buzzer_active"] |
        false;


      djangoBuzzerMuted =
        doc["buzzer_muted"] |
        false;


      Serial.print(
        "🔔 Django Buzzer Active = "
      );

      Serial.println(
        djangoBuzzerActive
      );


      Serial.print(
        "🔕 Django Buzzer Muted = "
      );

      Serial.println(
        djangoBuzzerMuted
      );
    }

    else {

      Serial.print(
        "❌ JSON Buzzer Error: "
      );

      Serial.println(
        error.c_str()
      );
    }
  }

  else {

    Serial.print(
      "❌ Buzzer Status HTTP = "
    );

    Serial.println(
      httpCode
    );
  }


  http.end();
}


/* ============================================================
   READ AND SEND DATA
   ============================================================ */

void readAndSendData() {


  /* ==========================================================
     DIGITAL SENSORS
     ========================================================== */

  int gas =
    digitalRead(
      MQ2_DOUT
    );


  int flame =
    digitalRead(
      FLAME_PIN
    );


  /*
     GPIO34 / GPIO35 همیشه مقدار HIGH یا LOW می‌دهند.
     بنابراین اتصال واقعی را از مقدار دیجیتال تشخیص
     نمی‌دهیم.
  */

  bool mq2Connected = true;

  bool flameConnected = true;


  /* ==========================================================
     DHT
     ========================================================== */

  float humidity = NAN;

  float temperature = NAN;


  bool dhtConnected =
    readDHT22(
      temperature,
      humidity
    );


  /* ==========================================================
     DANGER
     ========================================================== */

  currentGasDanger =
    mq2Connected &&
    gas == 0;


  currentFireDanger =
    flameConnected &&
    flame == 0;


  currentDHTDanger = false;


  if (
    dhtConnected
  ) {

    currentDHTDanger =
      temperature > 50.0 ||
      temperature < 0.0 ||
      humidity > 80.0 ||
      humidity < 20.0;
  }


  currentSensorDanger =
    currentGasDanger ||
    currentFireDanger ||
    currentDHTDanger;


  /* ==========================================================
     SERIAL
     ========================================================== */

  Serial.println();

  Serial.println(
    "========================================"
  );


  Serial.print(
    "💨 Gas: "
  );

  Serial.print(
    gas
  );

  Serial.print(
    " | Danger: "
  );

  Serial.println(
    currentGasDanger
  );


  Serial.print(
    "🔥 Fire: "
  );

  Serial.print(
    flame
  );

  Serial.print(
    " | Danger: "
  );

  Serial.println(
    currentFireDanger
  );


  if (
    dhtConnected
  ) {

    Serial.print(
      "🌡️ Temperature: "
    );

    Serial.print(
      temperature
    );

    Serial.print(
      " | Danger: "
    );

    Serial.println(
      currentDHTDanger
    );


    Serial.print(
      "💧 Humidity: "
    );

    Serial.print(
      humidity
    );

    Serial.print(
      " | Danger: "
    );

    Serial.println(
      currentDHTDanger
    );
  }

  else {

    Serial.println(
      "⚠️ DHT22 disconnected"
    );
  }


  Serial.print(
    "⚠️ GLOBAL DANGER = "
  );

  Serial.println(
    currentSensorDanger
  );


  /* ==========================================================
     LED
     ========================================================== */

  digitalWrite(
    LED_PIN,
    currentSensorDanger
      ? HIGH
      : LOW
  );


  /*
     مهم:
     کنترل Buzzer اینجا انجام نمی‌شود.

     کنترل Buzzer توسط updateBuzzer()
     انجام می‌شود تا با POST پنج ثانیه‌ای
     قطع نشود.
  */


  /* ==========================================================
     JSON
     ========================================================== */

  StaticJsonDocument<512> doc;


  doc["device_id"] =
    DEVICE_ID;


  doc["alert"] =
    currentSensorDanger;


  JsonObject sensors =
    doc.createNestedObject(
      "sensors"
    );


  /* -------------------------
     MQ2
     ------------------------- */

  JsonObject mq2 =
    sensors.createNestedObject(
      "mq2"
    );


  mq2["value"] =
    gas;


  mq2["status"] =
    "ok";


  /* -------------------------
     Flame
     ------------------------- */

  JsonObject flameJs =
    sensors.createNestedObject(
      "flame"
    );


  flameJs["value"] =
    flame;


  flameJs["status"] =
    "ok";


  /* -------------------------
     DHT22
     ------------------------- */

  JsonObject dhtJs =
    sensors.createNestedObject(
      "dht22"
    );


  if (
    dhtConnected
  ) {

    dhtJs["temperature"] =
      temperature;


    dhtJs["humidity"] =
      humidity;


    dhtJs["status"] =
      "ok";
  }

  else {

    dhtJs["status"] =
      "disconnected";
  }


  /* ==========================================================
     SERIAL JSON
     ========================================================== */

  String payload;


  serializeJson(
    doc,
    payload
  );


  Serial.println();

  Serial.println(
    "📤 ارسال:"
  );

  Serial.println(
    payload
  );


  /* ==========================================================
     SEND TO DJANGO
     ========================================================== */

  if (
    WiFi.status() ==
    WL_CONNECTED
  ) {

    HTTPClient http;


    http.begin(
      serverUrl
    );


    http.setTimeout(
      3000
    );


    http.addHeader(
      "Content-Type",
      "application/json"
    );


    int httpCode =
      http.POST(
        payload
      );


    Serial.print(
      "📥 HTTP Response: "
    );

    Serial.println(
      httpCode
    );


    if (
      httpCode > 0
    ) {

      String response =
        http.getString();


      Serial.print(
        "📥 Server: "
      );

      Serial.println(
        response
      );
    }

    else {

      Serial.print(
        "❌ HTTP Error: "
      );

      Serial.println(
        http.errorToString(
          httpCode
        )
      );
    }


    http.end();
  }

  else {

    Serial.println(
      "❌ WiFi متصل نیست"
    );
  }


  Serial.println(
    "========================================"
  );
}


/* ============================================================
   UPDATE BUZZER
   ============================================================ */

void updateBuzzer() {

  bool shouldBuzzerPlay =
    false;


  /* ==========================================================
     حالت خطر
     ========================================================== */

  if (
    currentSensorDanger
  ) {

    /*
       اگر کاربر MUTE نکرده باشد،
       Buzzer باید روشن بماند.
    */

    if (
      !djangoBuzzerMuted
    ) {

      shouldBuzzerPlay =
        true;


      Serial.println(
        "🚨 خطر فعال است -> Buzzer ON"
      );
    }

    else {

      shouldBuzzerPlay =
        false;


      Serial.println(
        "🔕 خطر فعال ولی Buzzer MUTE است"
      );
    }
  }


  /* ==========================================================
     حالت امن
     ========================================================== */

  else {

    /*
       اگر سایت Buzzer را ON کرده باشد،
       برای تست روشن می‌ماند.
    */

    if (
      djangoBuzzerActive &&
      !djangoBuzzerMuted
    ) {

      shouldBuzzerPlay =
        true;


      Serial.println(
        "🔊 وضعیت امن -> Buzzer دستی ON"
      );
    }

    else {

      shouldBuzzerPlay =
        false;


      Serial.println(
        "🔇 وضعیت امن -> Buzzer OFF"
      );
    }
  }


  /* ==========================================================
     START BUZZER
     ========================================================== */

  if (
    shouldBuzzerPlay
  ) {

    /*
       اگر در حال پخش است،
       دوباره از اول شروع نکن.
    */

    if (
      !isPlayingMelody
    ) {

      if (
        currentGasDanger
      ) {

        Serial.println(
          "🔊 Melody: GAS"
        );


        startMelody(
          gasMelody,
          gasLength,
          gasDuration
        );
      }

      else if (
        currentFireDanger
      ) {

        Serial.println(
          "🔊 Melody: FIRE"
        );


        startMelody(
          flameMelody,
          flameLength,
          flameDuration
        );
      }

      else if (
        currentDHTDanger
      ) {

        Serial.println(
          "🔊 Melody: DHT"
        );


        startMelody(
          dhtMelody,
          dhtLength,
          dhtDuration
        );
      }

      else {

        /*
           تست دستی
        */

        Serial.println(
          "🔊 Melody: TEST"
        );


        startMelody(
          gasMelody,
          gasLength,
          gasDuration
        );
      }
    }
  }


  /* ==========================================================
     STOP BUZZER
     ========================================================== */

  else {

    if (
      isPlayingMelody
    ) {

      Serial.println(
        "🛑 Buzzer STOP"
      );


      stopBuzzer();
    }
  }
}


/* ============================================================
   START MELODY
   ============================================================ */

void startMelody(
  const int* melody,
  int length,
  int duration
) {

  currentMelody =
    melody;


  currentMelodyLength =
    length;


  currentNoteDuration =
    duration;


  currentNoteIndex =
    0;


  isPlayingMelody =
    true;


  lastBuzzerTime =
    millis();


  tone(
    BUZZER_PIN,
    currentMelody[
      currentNoteIndex
    ]
  );


  currentNoteIndex++;
}


/* ============================================================
   PLAY MELODY
   ============================================================ */

void playCurrentMelody() {

  if (
    !isPlayingMelody ||
    currentMelody == nullptr
  ) {

    return;
  }


  if (
    millis() -
    lastBuzzerTime >=
    currentNoteDuration
  ) {

    noTone(
      BUZZER_PIN
    );


    if (
      currentNoteIndex >=
      currentMelodyLength
    ) {

      currentNoteIndex =
        0;
    }


    tone(
      BUZZER_PIN,
      currentMelody[
        currentNoteIndex
      ]
    );


    currentNoteIndex++;


    lastBuzzerTime =
      millis();
  }
}


/* ============================================================
   STOP BUZZER
   ============================================================ */

void stopBuzzer() {

  noTone(
    BUZZER_PIN
  );


  isPlayingMelody =
    false;


  currentNoteIndex =
    0;


  currentMelody =
    nullptr;


  currentMelodyLength =
    0;
}