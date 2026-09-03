// ============================================================
// تنظیمات برنامه
// ============================================================

console.log('🚀 شروع بارگذاری برنامه...');

const API_URL = '/devices/data/';
const AUTH_URL = '/accounts/';
const BUZZER_URL = '/devices/buzzer/';
const BUZZER_STATUS_URL = '/devices/buzzer/status/';
const DEVICE_ID = 'esp32_001';
const CURRENT_USER_KEY = 'sensor_current_user';
const MAX_SENSORS = 4;

let updateInterval = null;
let currentUser = null;
let isBuzzerActive = false;
let buzzerMutedByUser = false;

// ============================================================
// سنسورها
// ============================================================

const sensors = [
    {
        id: 1,
        key: 'fire',
        name: 'سنسور آتش',
        icon: '🔥',
        status: 0,
        alert: false,
        controllable: false
    },
    {
        id: 2,
        key: 'gas',
        name: 'سنسور دود و گاز',
        icon: '💨',
        status: 0,
        alert: false,
        controllable: false
    },
    {
        id: 3,
        key: 'temp',
        name: 'سنسور دما',
        icon: '🌡️',
        status: 0,
        alert: false,
        controllable: false
    },
    {
        id: 4,
        key: 'humidity',
        name: 'سنسور رطوبت',
        icon: '💧',
        status: 0,
        alert: false,
        controllable: false
    }
];


// ============================================================
// CSRF
// ============================================================

function getCSRFToken() {

    const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='));

    if (!cookie) {
        return '';
    }

    return decodeURIComponent(
        cookie.split('=')[1]
    );
}


// ============================================================
// کاربر فعلی - دریافت از LocalStorage
// ============================================================

function getCurrentUser() {

    try {

        const value =
            localStorage.getItem(
                CURRENT_USER_KEY
            );

        if (!value) {
            return null;
        }

        return JSON.parse(value);

    } catch (error) {

        console.error(
            '❌ خطای خواندن کاربر:',
            error
        );

        localStorage.removeItem(
            CURRENT_USER_KEY
        );

        return null;
    }
}



// ============================================================
// ذخیره کاربر فعلی
// ============================================================

function saveCurrentUser(user) {

    if (!user) {
        console.warn('⚠️ کاربری برای ذخیره وجود ندارد');
        return;
    }

    try {

        localStorage.setItem(
            CURRENT_USER_KEY,
            JSON.stringify(user)
        );

        currentUser = user;

        console.log(
            '💾 کاربر ذخیره شد:',
            user
        );

    } catch (error) {

        console.error(
            '❌ خطا در ذخیره کاربر:',
            error
        );
    }
}

// ============================================================
// پاک کردن کاربر فعلی
// ============================================================

function clearCurrentUser() {

    localStorage.removeItem(
        CURRENT_USER_KEY
    );

    currentUser = null;
}


// ============================================================
// تبدیل اطلاعات Django به User Frontend
// ============================================================

function normalizeUser(user) {

    if (!user) {
        return null;
    }

    const fullName = (
        user.full_name ||
        `${user.first_name || ''} ${user.last_name || ''}`
    ).trim();

    return {

        id: user.id,

        username:
            user.username ||
            user.email,

        email:
            user.email ||
            user.username,

        fullName:
            fullName || 'کاربر',

        phone:
            user.phone || '',

        address:
            user.address || ''
    };
}


// ============================================================
// بررسی Session واقعی Django
// ============================================================

async function fetchCurrentUser() {

    try {

        console.log(
            '🔍 در حال بررسی Session واقعی Django...'
        );

        const response =
            await fetch(
                `${AUTH_URL}me/`,
                {
                    method: 'GET',

                    credentials:
                        'same-origin',

                    headers: {
                        'Accept':
                            'application/json'
                    }
                }
            );


        console.log(
            '📡 وضعیت Session:',
            response.status
        );


        const text =
            await response.text();


        console.log(
            '📥 پاسخ خام Session:',
            text
        );


        let data;


        try {

            data =
                JSON.parse(text);

        } catch (error) {

            console.error(
                '❌ پاسخ Session JSON نیست:',
                text
            );

            clearCurrentUser();

            return null;
        }


        console.log(
            '👤 پاسخ Session:',
            data
        );


        if (
            !response.ok ||
            !data.success ||
            !data.authenticated
        ) {

            console.log(
                '🔒 Session معتبر نیست'
            );

            clearCurrentUser();

            return null;
        }


        const user =
            normalizeUser(
                data.user
            );


        if (!user) {

            console.error(
                '❌ اطلاعات کاربر Session معتبر نیست'
            );

            clearCurrentUser();

            return null;
        }


        /*
         * Session واقعی Django معتبر است.
         * حالا اطلاعات کاربر را برای Frontend ذخیره می‌کنیم.
         */

        saveCurrentUser(user);


        console.log(
            '✅ Session معتبر است:',
            user
        );


        return user;

    } catch (error) {

        console.error(
            '❌ خطا در بررسی Session Django:',
            error
        );


        /*
         * اگر Session واقعی Django قابل بررسی نبود،
         * LocalStorage را به عنوان Session معتبر قبول نمی‌کنیم.
         */

        clearCurrentUser();

        return null;
    }
}


// ============================================================
// ثبت‌نام Django
// ============================================================

async function registerUser(
    email,
    password,
    fullName,
    phone = '',
    address = ''
) {

    console.log(
        '======================================'
    );

    console.log(
        '📝 شروع ثبت‌نام'
    );

    console.log(
        '📧 Email:',
        email
    );

    console.log(
        '👤 Name:',
        fullName
    );

    console.log(
        '📱 Phone:',
        phone
    );

    console.log(
        '🏠 Address:',
        address
    );

    console.log(
        '🌐 URL:',
        `${AUTH_URL}register/`
    );

    console.log(
        '======================================'
    );


    try {

        const response =
            await fetch(
                `${AUTH_URL}register/`,
                {
                    method: 'POST',

                    headers: {

                        'Content-Type':
                            'application/json',

                        'Accept':
                            'application/json',

                        'X-CSRFToken':
                            getCSRFToken()
                    },

                    credentials:
                        'same-origin',

                    body:
                        JSON.stringify({

                            email:
                                email
                                    .trim()
                                    .toLowerCase(),

                            password:
                                password,

                            full_name:
                                fullName
                                    .trim(),

                            phone:
                                phone
                                    .trim(),

                            address:
                                address
                                    .trim()
                        })
                }
            );


        console.log(
            '📡 وضعیت HTTP ثبت‌نام:',
            response.status
        );


        const text =
            await response.text();


        console.log(
            '📥 پاسخ خام Django:',
            text
        );


        let data;


        try {

            data =
                JSON.parse(text);

        } catch (error) {

            console.error(
                '❌ پاسخ Django JSON نیست:',
                text
            );

            throw new Error(
                'سرور پاسخ نامعتبر ارسال کرد'
            );
        }


        console.log(
            '📦 پاسخ JSON Django:',
            data
        );


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                data.message ||
                'ثبت‌نام با خطا مواجه شد'
            );
        }


        const user =
            normalizeUser(
                data.user
            );


        if (!user) {

            throw new Error(
                'ثبت‌نام انجام شد اما اطلاعات کاربر دریافت نشد'
            );
        }


        saveCurrentUser(user);


        console.log(
            '✅ ثبت‌نام موفق شد'
        );


        console.log(
            '👤 کاربر ساخته‌شده:',
            user
        );


        return user;

    } catch (error) {

        console.error(
            '❌ REGISTER ERROR:',
            error
        );

        throw error;
    }
}


// ============================================================
// Login Django
// ============================================================

async function loginUser(
    email,
    password
) {

    console.log(
        '🔐 شروع ورود...'
    );

    console.log(
        '📧 Email:',
        email
    );


    try {

        const response =
            await fetch(
                `${AUTH_URL}login/`,
                {
                    method: 'POST',

                    headers: {

                        'Content-Type':
                            'application/json',

                        'Accept':
                            'application/json',

                        'X-CSRFToken':
                            getCSRFToken()
                    },

                    credentials:
                        'same-origin',

                    body:
                        JSON.stringify({

                            email:
                                email
                                    .trim()
                                    .toLowerCase(),

                            password:
                                password
                        })
                }
            );


        console.log(
            '📡 وضعیت Login:',
            response.status
        );


        const text =
            await response.text();


        console.log(
            '📥 پاسخ خام Login:',
            text
        );


        let data;


        try {

            data =
                JSON.parse(text);

        } catch {

            throw new Error(
                'پاسخ نامعتبر از سرور دریافت شد'
            );
        }


        console.log(
            '📦 پاسخ Login:',
            data
        );


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                data.message ||
                'ایمیل یا رمز عبور اشتباه است'
            );
        }


        const user =
            normalizeUser(
                data.user
            );


        if (!user) {

            throw new Error(
                'اطلاعات کاربر از سرور دریافت نشد'
            );
        }


        /*
         * Session Django در همین درخواست Login ساخته شده.
         * اطلاعات کاربر را فقط برای استفاده Frontend ذخیره می‌کنیم.
         */

        saveCurrentUser(user);


        console.log(
            '✅ Login موفق:',
            user
        );


        return user;

    } catch (error) {

        console.error(
            '❌ LOGIN ERROR:',
            error
        );

        throw error;
    }
}


// ============================================================
// Logout
// ============================================================

async function logoutUser() {

    console.log(
        '🚪 شروع Logout...'
    );


    try {

        const response =
            await fetch(
                `${AUTH_URL}logout/`,
                {
                    method: 'POST',

                    headers: {

                        'Content-Type':
                            'application/json',

                        'Accept':
                            'application/json',

                        'X-CSRFToken':
                            getCSRFToken()
                    },

                    credentials:
                        'same-origin'
                }
            );


        console.log(
            '📡 وضعیت Logout:',
            response.status
        );


        let data = {};


        try {

            data =
                await response.json();

        } catch {

            console.warn(
                '⚠️ پاسخ Logout JSON نبود'
            );
        }


        console.log(
            '📥 پاسخ Logout:',
            data
        );


        if (!response.ok) {

            throw new Error(
                data.error ||
                data.message ||
                'خروج با خطا مواجه شد'
            );
        }


        console.log(
            '✅ Django Session با موفقیت Logout شد'
        );


    } catch (error) {

        console.error(
            '❌ خطای Logout:',
            error
        );

    } finally {

        clearCurrentUser();

        stopAutoUpdate();


        console.log(
            '🧹 LocalStorage کاربر پاک شد'
        );

        console.log(
            '🔒 کاربر از Frontend خارج شد'
        );
    }
}


// ============================================================
// بروزرسانی پروفایل
// ============================================================

async function updateUserProfile(
    fullName,
    phone,
    address
) {

    const response =
        await fetch(
            `${AUTH_URL}profile/`,
            {
                method: 'POST',

                headers: {

                    'Content-Type':
                        'application/json',

                    'Accept':
                        'application/json',

                    'X-CSRFToken':
                        getCSRFToken()
                },

                credentials:
                    'same-origin',

                body:
                    JSON.stringify({

                        full_name:
                            fullName.trim(),

                        phone:
                            phone.trim(),

                        address:
                            address.trim()
                    })
            }
        );


    let data;


    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            'پاسخ نامعتبر از سرور دریافت شد'
        );
    }


    if (
        !response.ok ||
        !data.success
    ) {

        throw new Error(
            data.error ||
            data.message ||
            'ذخیره اطلاعات با خطا مواجه شد'
        );
    }


    const user =
        normalizeUser(
            data.user
        );


    if (!user) {

        throw new Error(
            'اطلاعات کاربر از سرور دریافت نشد'
        );
    }


    saveCurrentUser(user);


    return user;
}


// ============================================================
// دریافت داده سنسورها
// ============================================================

async function fetchDeviceData() {

    try {

        const res =
            await fetch(
                API_URL,
                {
                    method: 'GET',

                    credentials:
                        'same-origin',

                    headers: {
                        'Accept':
                            'application/json'
                    }
                }
            );


        console.log(
            '📡 Sensor API:',
            res.status
        );


        if (!res.ok) {

            console.warn(
                `⚠️ Sensor API Error: ${res.status}`
            );


            /*
             * داده تصادفی تولید نمی‌کنیم.
             * اگر Backend قطع باشد،
             * سنسورها قطع نمایش داده می‌شوند.
             */

            return null;
        }


        const data =
            await res.json();


        console.log(
            '📊 Sensor Data:',
            data
        );


        return data;

    } catch (error) {

        console.error(
            '❌ Sensor API Error:',
            error
        );

        return null;
    }
}


// ============================================================
// داده تصادفی آفلاین
// فقط برای تست دستی
// ============================================================

function generateRandomData() {

    const fire =
        Math.random() < 0.05
            ? 0
            : 1;


    const gas =
        Math.random() < 0.05
            ? 0
            : 1;


    const temp =
        Math.floor(
            Math.random() * 15
        ) + 20;


    const humidity =
        Math.floor(
            Math.random() * 30
        ) + 35;


    return {

        fire,

        gas,

        temp,

        humidity,

        sensor_state: {

            fire: true,

            gas: true,

            temp: true,

            humidity: true
        }
    };
}


// ============================================================
// توابع کمکی
// ============================================================

function getCurrentTime() {

    return new Date()
        .toLocaleTimeString(
            'fa-IR',
            {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }
        );
}


function toFa(value) {

    if (
        value === undefined ||
        value === null ||
        Number.isNaN(
            Number(value)
        )
    ) {

        return '--';
    }


    return String(value).replace(
        /[0-9]/g,
        d =>
            '۰۱۲۳۴۵۶۷۸۹'[d]
    );
}


// ============================================================
// بررسی قطع بودن
// ============================================================

function isDisconnected(sensor) {

    if (
        !sensor ||
        sensor.status === null ||
        sensor.status === undefined
    ) {

        return true;
    }


    const value =
        Number(sensor.status);


    return (
        value === -1 ||
        Number.isNaN(value)
    );
}


// ============================================================
// تشخیص هشدار
// ============================================================

function computeAlert(sensor) {

    if (
        isDisconnected(sensor)
    ) {

        return false;
    }


    const value =
        Number(sensor.status);


    if (
        value === -1 ||
        Number.isNaN(value)
    ) {

        return false;
    }


    /*
     * fire / gas
     *
     * 1 = امن
     * 0 = هشدار
     */

    if (
        sensor.key === 'fire' ||
        sensor.key === 'gas'
    ) {

        return value === 0;
    }


    /*
     * دما
     */

    if (
        sensor.key === 'temp'
    ) {

        return value > 35;
    }


    /*
     * رطوبت
     */

    if (
        sensor.key === 'humidity'
    ) {

        return (
            value > 80 ||
            value < 20
        );
    }


    return false;
}


// ============================================================
// کنترل بازر - اتصال به Django
// ============================================================

async function setBuzzerState(action) {

    try {

        console.log(
            `🔔 ارسال فرمان بازر: ${action}`
        );


        const response =
            await fetch(
                BUZZER_URL,
                {
                    method: 'POST',

                    headers: {

                        'Content-Type':
                            'application/json',

                        'Accept':
                            'application/json',

                        'X-CSRFToken':
                            getCSRFToken()
                    },

                    credentials:
                        'same-origin',

                    body:
                        JSON.stringify({

                            device_id:
                                DEVICE_ID,

                            action:
                                action
                        })
                }
            );


        const data =
            await response.json();


        console.log(
            '📥 پاسخ Buzzer:',
            data
        );


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                'خطا در کنترل بازر'
            );
        }


        isBuzzerActive =
            Boolean(
                data.buzzer_active
            );


        renderBuzzer();


        return data;


    } catch (error) {

        console.error(
            '❌ Buzzer API Error:',
            error
        );


        showToast(
            '❌',
            'خطای بازر',
            'ارتباط با سرور بازر برقرار نشد',
            'danger'
        );


        return null;
    }
}


// ============================================================
// فعال کردن بازر
// ============================================================

async function activateBuzzer() {

    if (isBuzzerActive) {
        return true;
    }


    const result =
        await setBuzzerState('on');


    if (!result) {
        return false;
    }


    isBuzzerActive = true;


    addLog(
        '🔔 بازر فعال شد',
        'warning'
    );


    showToast(
        '🔔',
        'بازر',
        'زنگ هشدار فعال شد',
        'danger'
    );


    renderBuzzer();


    return true;
}

// ============================================================
// خاموش کردن بازر
// ============================================================

async function deactivateBuzzer(
    manual = false
) {

    if (!isBuzzerActive) {

        // اگر کاربر دستی دکمه را زده،
        // حتی اگر بازر از قبل خاموش بوده،
        // وضعیت mute ثبت شود.

        if (manual) {
            buzzerMutedByUser = true;
        }

        renderBuzzer();

        return;
    }


    const result =
        await setBuzzerState('off');


    if (!result) {
        return;
    }


    isBuzzerActive = false;


    // اگر خاموش کردن توسط خود کاربر بوده
    if (manual) {

        buzzerMutedByUser = true;

        addLog(
            '🔕 بازر توسط کاربر خاموش شد و تا رفع خطر خاموش می‌ماند',
            'warning'
        );

        showToast(
            '🔕',
            'بازر',
            'بازر خاموش شد و تا رفع خطر دوباره فعال نمی‌شود',
            'success'
        );

    } else {

        addLog(
            '🔕 بازر خاموش شد',
            'success'
        );

    }


    renderBuzzer();
}




// ============================================================
// Toggle Buzzer
// ============================================================

async function toggleBuzzer() {

    if (isBuzzerActive) {

        // خاموش کردن دستی
        await deactivateBuzzer(true);

    } else {

        // اگر کاربر خودش تست زنگ را زده،
        // بازر باید روشن شود و mute قبلی برداشته شود.

        buzzerMutedByUser = false;

        await activateBuzzer();
    }
}





// ============================================================
// Log
// ============================================================

function addLog(
    message,
    type = 'info'
) {

    const container =
        document.getElementById(
            'logContainer'
        );


    if (!container) {
        return;
    }


    const entry =
        document.createElement(
            'div'
        );


    entry.className =
        `log-entry ${type}`;


    entry.innerHTML = `
        <span class="log-time">
            [${getCurrentTime()}]
        </span>
        ${message}
    `;


    container.prepend(entry);


    while (
        container.children.length > 50
    ) {

        container.removeChild(
            container.lastChild
        );
    }
}


// ============================================================
// Toast
// ============================================================

function showToast(
    icon,
    title,
    message,
    type = 'info'
) {

    const container =
        document.getElementById(
            'toastContainer'
        );


    if (!container) {
        return;
    }


    const el =
        document.createElement(
            'div'
        );


    el.className =
        `toast-item ${type}`;


    el.innerHTML = `
        <div class="toast-icon">
            ${icon}
        </div>

        <div>
            <div class="toast-title">
                ${title}
            </div>

            <div class="toast-desc">
                ${message}
            </div>
        </div>
    `;


    container.appendChild(el);


    setTimeout(() => {

        el.style.opacity = '0';

        el.style.transform =
            'translateX(-100%)';


        setTimeout(
            () => el.remove(),
            300
        );

    }, 5000);
}










// ============================================================
// آمار سنسورها
// ============================================================

function renderStats() {

    const active =
        sensors.filter(
            sensor =>
                !isDisconnected(sensor)
        ).length;


    const inactive =
        sensors.filter(
            sensor =>
                isDisconnected(sensor)
        ).length;


    const alerts =
        sensors.filter(
            sensor =>
                !isDisconnected(sensor) &&
                sensor.alert
        ).length;


    const items = [

        {
            icon: 'cpu',
            cls: 'primary',
            value: active,
            label: 'سنسورهای فعال'
        },

        {
            icon: 'check-circle',
            cls: 'success',
            value: active,
            label: 'فعال'
        },

        {
            icon: 'slash-circle',
            cls: 'warning',
            value: inactive,
            label: 'غیرفعال'
        },

        {
            icon: 'exclamation-triangle',
            cls: 'danger',
            value: alerts,
            label: 'هشدار'
        }

    ];


    const row =
        document.getElementById(
            'statsRow'
        );


    if (!row) {
        return;
    }


    row.innerHTML =
        items.map(
            item => `

                <div class="col-6 col-xl-3">

                    <div class="stat-card d-flex align-items-center gap-3">

                        <div class="stat-icon bg-${item.cls}-subtle text-${item.cls}">

                            <i class="bi bi-${item.icon}"></i>

                        </div>

                        <div>

                            <div class="stat-value">
                                ${toFa(item.value)}
                            </div>

                            <div class="stat-label">
                                ${item.label}
                            </div>

                        </div>

                    </div>

                </div>

            `
        ).join('');
}










// ============================================================
// رندر بازر
// ============================================================

function renderBuzzer() {

    const container =
        document.getElementById(
            'buzzerContainer'
        );


    if (!container) {
        return;
    }


    const statusClass =
        isBuzzerActive
            ? 'ringing'
            : '';


    const statusText =
        isBuzzerActive
            ? '🔔 زنگ هشدار در حال پخش'
            : '🔕 بازر خاموش است';


    const statusColor =
        isBuzzerActive
            ? 'text-danger'
            : 'text-muted';


    const btnClass =
        isBuzzerActive
            ? 'btn-danger'
            : 'btn-success';


    const btnText =
        isBuzzerActive
            ? '🔕 خاموش کردن زنگ'
            : '🔔 تست زنگ';


    container.innerHTML = `

        <div class="buzzer-card ${statusClass}">

            <div class="d-flex align-items-center gap-3 flex-wrap">

                <div class="buzzer-icon ${
                    isBuzzerActive
                        ? 'ringing'
                        : ''
                }">

                    ${
                        isBuzzerActive
                            ? '🔔'
                            : '🔕'
                    }

                </div>

                <div class="flex-grow-1">

                    <h6 class="fw-bold mb-1">
                        بازر (زنگ هشدار)
                    </h6>

                    <span class="${statusColor} small fw-medium">
                        ${statusText}
                    </span>

                </div>

                <button
                    class="btn ${btnClass} btn-lg"
                    id="buzzerToggleBtn"
                >
                    ${btnText}
                </button>

            </div>

        </div>
    `;


    document
        .getElementById(
            'buzzerToggleBtn'
        )
        ?.addEventListener(
            'click',
            toggleBuzzer
        );
}


// ============================================================
// رندر سنسورها
// ============================================================

function renderSensors() {

    const grid =
        document.getElementById(
            'sensorGrid'
        );


    if (!grid) {
        return;
    }


    grid.innerHTML =
        sensors.map(
            sensor => {

                const disconnected =
                    isDisconnected(
                        sensor
                    );


                const alertClass =
                    sensor.alert
                        ? 'alert-state'
                        : '';


                const discClass =
                    disconnected
                        ? 'disconnected'
                        : '';


                let statusText;
                let statusClass;


                if (disconnected) {

                    statusText =
                        'قطع';

                    statusClass =
                        'off';

                } else if (
                    sensor.alert
                ) {

                    statusText =
                        'هشدار';

                    statusClass =
                        'alert';

                } else {

                    statusText =
                        'امن';

                    statusClass =
                        'safe';
                }


                let valueDisplay;

if (disconnected) {
    valueDisplay = '--';
} else if (
    sensor.key === 'fire' ||
    sensor.key === 'gas'
) {
    valueDisplay =
        sensor.status === 0
            ? 'خطر'
            : 'ایمن';
} else {
    valueDisplay = toFa(sensor.status);
}


                let unit = '';


                if (
                    sensor.key === 'temp'
                ) {

                    unit = '°C';
                }


                if (
                    sensor.key === 'humidity'
                ) {

                    unit = '%';
                }


                return `

                    <div class="col-sm-6 col-lg-4 col-xl-3">

                        <div class="sensor-card ${alertClass} ${discClass}">

                            <div class="sensor-icon ${
                                sensor.alert
                                    ? 'alert'
                                    : ''
                            }">

                                ${sensor.icon}

                            </div>

                            <div class="sensor-name">
                                ${sensor.name}
                            </div>

                            <div class="sensor-value">
                                ${valueDisplay}${unit}
                            </div>

                            <div>

                                <span class="sensor-status ${statusClass}">
                                    ${statusText}
                                </span>

                            </div>

                            <div class="sensor-time">

                                <i class="bi bi-clock"></i>

                                ${getCurrentTime()}

                            </div>

                        </div>

                    </div>
                `;
            }
        ).join('');


    const timeEl =
        document.getElementById(
            'updateTime'
        );


    if (timeEl) {

        timeEl.textContent =
            getCurrentTime();
    }
}


// ============================================================
// بروزرسانی Dashboard
// ============================================================

async function updateDashboard() {

    const data = await fetchDeviceData();


    // ========================================================
    // اگر API جواب نداد
    // ========================================================

    if (
        !data ||
        typeof data !== 'object'
    ) {

        sensors.forEach(sensor => {

            sensor.status = -1;
            sensor.alert = false;

        });


        if (isBuzzerActive) {
            await deactivateBuzzer();
        }


        buzzerMutedByUser = false;


        renderStats();
        renderSensors();
        renderBuzzer();


        return;
    }


    // ========================================================
    // وضعیت اتصال سنسورها
    // ========================================================

    const state =
        data.sensor_state || {};


    console.log(
        '🔌 وضعیت اتصال سنسورها:',
        state
    );


    // ========================================================
    // بروزرسانی تک تک سنسورها
    // ========================================================

    sensors.forEach(sensor => {

        const wasAlert =
            sensor.alert;


        // ----------------------------------------------------
        // اول وضعیت اتصال را بررسی می‌کنیم
        // ----------------------------------------------------

        const isConnected =
            state[sensor.key] === true;


        // ----------------------------------------------------
        // سنسور قطع است
        // ----------------------------------------------------

        if (!isConnected) {

            console.log(
                `🔌 ${sensor.name} قطع است`
            );


            sensor.status = -1;

            // سنسور قطع شده هرگز هشدار ندارد
            sensor.alert = false;


            // اگر قبلاً هشدار بوده، رفع هشدار ثبت شود
            if (wasAlert) {

                addLog(
                    `🔌 ${sensor.name} قطع شد`,
                    'warning'
                );
            }


            return;
        }


        // ----------------------------------------------------
        // سنسور وصل است
        // ----------------------------------------------------

        if (
            data[sensor.key] === undefined ||
            data[sensor.key] === null
        ) {

            sensor.status = -1;
            sensor.alert = false;

            return;
        }


        sensor.status =
            Number(
                data[sensor.key]
            );


        // ----------------------------------------------------
        // محاسبه هشدار
        // ----------------------------------------------------

        sensor.alert =
            computeAlert(sensor);


        // ----------------------------------------------------
        // هشدار جدید
        // ----------------------------------------------------

        if (
            sensor.alert &&
            !wasAlert
        ) {

            showToast(
                sensor.icon,
                '🚨 هشدار!',
                `${sensor.name} فعال شد`,
                'danger'
            );


            addLog(
                `🚨 هشدار: ${sensor.name} فعال شد`,
                'warning'
            );
        }


        // ----------------------------------------------------
        // رفع هشدار
        // ----------------------------------------------------

        else if (
            !sensor.alert &&
            wasAlert
        ) {

            addLog(
                `✅ هشدار: ${sensor.name} غیرفعال شد`,
                'success'
            );
        }

    });


    // ========================================================
    // آمار
    // ========================================================

    const activeSensors =
        sensors.filter(
            sensor =>
                !isDisconnected(sensor)
        ).length;


    const inactiveSensors =
        sensors.filter(
            sensor =>
                isDisconnected(sensor)
        ).length;


    const alertSensors =
        sensors.filter(
            sensor =>
                !isDisconnected(sensor) &&
                sensor.alert
        ).length;


    console.log(
        '📊 سنسورهای فعال:',
        activeSensors
    );


    console.log(
        '📊 سنسورهای قطع:',
        inactiveSensors
    );


    console.log(
        '🚨 سنسورهای هشدار:',
        alertSensors
    );


    // ========================================================
    // وضعیت کلی خطر
    // ========================================================

    const anyAlert =
        sensors.some(
            sensor =>
                !isDisconnected(sensor) &&
                sensor.alert
        );


    console.log(
        '🚨 خطر واقعی:',
        anyAlert
    );


    // ========================================================
    // کنترل بازر
    // ========================================================

    if (!anyAlert) {

        // وقتی همه خطرها رفع شدند
        buzzerMutedByUser = false;


        if (isBuzzerActive) {

            console.log(
                '🔕 خطری وجود ندارد؛ خاموش کردن بازر'
            );


            await deactivateBuzzer();
        }

    } else {

        console.log(
            '🚨 حداقل یک سنسور متصل در وضعیت خطر است'
        );


        if (
            !buzzerMutedByUser &&
            !isBuzzerActive
        ) {

            console.log(
                '🔔 فعال کردن بازر'
            );


            await activateBuzzer();
        }
    }


    // ========================================================
    // رندر
    // ========================================================

    renderStats();
    renderSensors();
    renderBuzzer();
}




// ============================================================
// Auth Page - نسخه پایدار
// ============================================================

function renderAuthPage() {

    stopAutoUpdate();

    const app =
        document.getElementById(
            'app'
        );


    if (!app) {

        console.error(
            '❌ #app پیدا نشد'
        );

        return;
    }


    let isSignup = false;
    let errorMessage = '';


    function render() {

        app.innerHTML = `

            <div class="auth-page">

                <div class="auth-card">

                    <div class="auth-icon">
                        🛡️
                    </div>

                    <h4 class="text-center fw-bold mb-1">

                        ${
                            isSignup
                                ? 'ساخت حساب کاربری'
                                : 'خوش آمدید'
                        }

                    </h4>

                    <p class="text-center text-muted small mb-4">

                        ${
                            isSignup
                                ? 'برای شروع ثبت‌نام کنید'
                                : 'برای مدیریت سنسورها وارد شوید'
                        }

                    </p>

                    ${
                        errorMessage
                            ? `
                                <div class="alert alert-danger py-2 small">
                                    ${errorMessage}
                                </div>
                            `
                            : ''
                    }

                    <form id="authForm">

                        ${
                            isSignup
                                ? `

                                    <div class="mb-3">

                                        <input
                                            type="text"
                                            class="form-control"
                                            id="fullNameInput"
                                            placeholder="نام و نام خانوادگی"
                                            required
                                        >

                                    </div>


                                    <div class="mb-3">

                                        <input
                                            type="tel"
                                            class="form-control"
                                            id="phoneInput"
                                            placeholder="شماره تماس (اختیاری)"
                                        >

                                    </div>


                                    <div class="mb-3">

                                        <input
                                            type="text"
                                            class="form-control"
                                            id="addressInput"
                                            placeholder="آدرس (اختیاری)"
                                        >

                                    </div>

                                `
                                : ''
                        }


                        <div class="mb-3">

                            <input
                                type="email"
                                class="form-control"
                                id="emailInput"
                                placeholder="ایمیل"
                                autocomplete="email"
                                required
                            >

                        </div>


                        <div class="mb-3">

                            <input
                                type="password"
                                class="form-control"
                                id="passwordInput"
                                placeholder="رمز عبور"
                                autocomplete="${
                                    isSignup
                                        ? 'new-password'
                                        : 'current-password'
                                }"
                                required
                                minlength="6"
                            >

                        </div>


                        <button
                            type="submit"
                            class="btn-primary-custom w-100"
                            id="authBtn"
                        >

                            ${
                                isSignup
                                    ? 'ثبت‌نام'
                                    : 'ورود'
                            }

                        </button>

                    </form>


                    <div class="text-center mt-3">

                        <small class="text-muted">

                            ${
                                isSignup
                                    ? 'قبلاً حساب دارید؟'
                                    : 'حساب ندارید؟'
                            }

                        </small>


                        <button
                            type="button"
                            class="btn btn-link btn-sm p-0"
                            id="switchModeBtn"
                        >

                            ${
                                isSignup
                                    ? 'وارد شوید'
                                    : 'ثبت‌نام کنید'
                            }

                        </button>

                    </div>

                </div>

            </div>
        `;


        document
            .getElementById(
                'switchModeBtn'
            )
            ?.addEventListener(
                'click',
                () => {

                    isSignup =
                        !isSignup;

                    errorMessage = '';

                    render();
                }
            );
    }


    render();
}


// ============================================================
// Auth Event Delegation
// ============================================================

document.addEventListener(
    'submit',
    async (event) => {

        const form =
            event.target;


        if (
            !form ||
            form.id !== 'authForm'
        ) {

            return;
        }


        event.preventDefault();


        console.log(
            '🔥🔥🔥 AUTH SUBMIT'
        );


        console.log(
            '📝 حالت:',
            form.querySelector(
                '#fullNameInput'
            )
                ? 'REGISTER'
                : 'LOGIN'
        );


        const email =
            document
                .getElementById(
                    'emailInput'
                )
                ?.value
                ?.trim()
                .toLowerCase() || '';


        const password =
            document
                .getElementById(
                    'passwordInput'
                )
                ?.value || '';


        const fullName =
            document
                .getElementById(
                    'fullNameInput'
                )
                ?.value
                ?.trim() || '';


        const phone =
            document
                .getElementById(
                    'phoneInput'
                )
                ?.value
                ?.trim() || '';


        const address =
            document
                .getElementById(
                    'addressInput'
                )
                ?.value
                ?.trim() || '';


        const button =
            document.getElementById(
                'authBtn'
            );


        console.log(
            '📧 Email:',
            email
        );


        if (!email) {

            alert(
                'لطفاً ایمیل را وارد کنید'
            );

            return;
        }


        if (!password) {

            alert(
                'لطفاً رمز عبور را وارد کنید'
            );

            return;
        }


        if (password.length < 6) {

            alert(
                'رمز عبور باید حداقل ۶ کاراکتر باشد'
            );

            return;
        }


        const isSignup =
            !!document.getElementById(
                'fullNameInput'
            );


        try {

            if (button) {

                button.disabled =
                    true;

                button.textContent =
                    isSignup
                        ? 'در حال ثبت‌نام...'
                        : 'در حال ورود...';
            }


            // ==================================================
            // REGISTER
            // ==================================================

            if (isSignup) {

                if (!fullName) {

                    throw new Error(
                        'لطفاً نام و نام خانوادگی را وارد کنید'
                    );
                }


                console.log(
                    '🚀 ارسال Register به Django'
                );


                const user =
                    await registerUser(
                        email,
                        password,
                        fullName,
                        phone,
                        address
                    );


                console.log(
                    '✅ Register موفق:',
                    user
                );


                showToast(
                    '✅',
                    'ثبت‌نام موفق',
                    'حساب کاربری شما ساخته شد',
                    'success'
                );


                currentUser =
                    user;


                renderDashboard();


                return;
            }


            // ==================================================
            // LOGIN
            // ==================================================

            console.log(
                '🔐 ارسال Login به Django'
            );


            const user =
                await loginUser(
                    email,
                    password
                );


            console.log(
                '✅ Login موفق:',
                user
            );


            showToast(
                '✅',
                'ورود موفق',
                `خوش آمدید ${user.fullName || ''}`,
                'success'
            );


            currentUser =
                user;


            renderDashboard();


        } catch (error) {

            console.error(
                '❌ AUTH ERROR:',
                error
            );


            alert(
                error.message ||
                'خطایی هنگام ورود رخ داد'
            );


            if (button) {

                button.disabled =
                    false;

                button.textContent =
                    isSignup
                        ? 'ثبت‌نام'
                        : 'ورود';
            }
        }

    },
    true
);


// ============================================================
// Profile
// ============================================================

function renderProfilePage() {

    const user =
        getCurrentUser();


    if (!user) {

        renderAuthPage();

        return;
    }


    stopAutoUpdate();


    let successMessage = '';
    let errorMessage = '';


    function render() {

        const app =
            document.getElementById(
                'app'
            );


        app.innerHTML = `

            ${renderNavbar()}

            <div class="container-fluid dashboard-container px-3 px-lg-4 py-4">

                <div class="row justify-content-center">

                    <div class="col-lg-8 col-xl-6">

                        <div class="profile-card">

                            <div class="text-center mb-4">

                                <div class="profile-avatar-wrapper">

                                    <div class="profile-avatar">

                                        ${
                                            user.fullName
                                                ?.charAt(0)
                                                .toUpperCase()
                                            || 'U'
                                        }

                                    </div>

                                </div>


                                <h4 class="fw-bold mt-3">

                                    ${
                                        user.fullName ||
                                        'کاربر'
                                    }

                                </h4>


                                <p class="text-muted small">

                                    ${user.email}

                                </p>

                            </div>


                            ${
                                successMessage
                                    ? `

                                        <div class="alert alert-success py-2 small">

                                            ${successMessage}

                                        </div>

                                      `
                                    : ''
                            }


                            ${
                                errorMessage
                                    ? `

                                        <div class="alert alert-danger py-2 small">

                                            ${errorMessage}

                                        </div>

                                      `
                                    : ''
                            }


                            <form id="profileForm">

                                <div class="mb-3">

                                    <label class="form-label small fw-medium">
                                        نام و نام خانوادگی
                                    </label>

                                    <input
                                        type="text"
                                        class="form-control"
                                        id="profileFullNameInput"
                                        value="${user.fullName || ''}"
                                        required
                                    />

                                </div>


                                <div class="mb-3">

                                    <label class="form-label small fw-medium">
                                        ایمیل
                                    </label>

                                    <input
                                        type="email"
                                        class="form-control"
                                        value="${user.email}"
                                        disabled
                                    />

                                </div>


                                <div class="mb-3">

                                    <label class="form-label small fw-medium">
                                        شماره تماس
                                    </label>

                                    <input
                                        type="tel"
                                        class="form-control"
                                        id="profilePhoneInput"
                                        value="${user.phone || ''}"
                                        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                                    />

                                </div>


                                <div class="mb-3">

                                    <label class="form-label small fw-medium">
                                        آدرس
                                    </label>

                                    <input
                                        type="text"
                                        class="form-control"
                                        id="profileAddressInput"
                                        value="${user.address || ''}"
                                        placeholder="آدرس خود را وارد کنید"
                                    />

                                </div>


                                <div class="d-flex gap-2">

                                    <button
                                        type="submit"
                                        class="btn btn-primary-custom flex-grow-1"
                                        id="saveProfileBtn"
                                    >

                                        <i class="bi bi-check-lg"></i>

                                        ذخیره تغییرات

                                    </button>


                                    <button
                                        type="button"
                                        class="btn btn-outline-secondary"
                                        id="backToDashboardBtn"
                                    >

                                        <i class="bi bi-arrow-right"></i>

                                        بازگشت

                                    </button>

                                </div>

                            </form>


                            <hr class="my-4" />


                            <button
                                class="btn btn-outline-danger w-100"
                                id="logoutFromProfileBtn"
                            >

                                <i class="bi bi-box-arrow-right"></i>

                                خروج از حساب

                            </button>

                        </div>

                    </div>

                </div>

            </div>
        `;


        document
            .getElementById(
                'profileForm'
            )
            ?.addEventListener(
                'submit',
                async event => {

                    event.preventDefault();


                    const fullName =
                        document
                            .getElementById(
                                'profileFullNameInput'
                            )
                            .value
                            .trim();


                    const phone =
                        document
                            .getElementById(
                                'profilePhoneInput'
                            )
                            .value
                            .trim();


                    const address =
                        document
                            .getElementById(
                                'profileAddressInput'
                            )
                            .value
                            .trim();


                    if (!fullName) {

                        errorMessage =
                            'نام و نام خانوادگی الزامی است';

                        successMessage = '';

                        render();

                        return;
                    }


                    try {

                        const button =
                            document.getElementById(
                                'saveProfileBtn'
                            );


                        if (button) {

                            button.disabled =
                                true;

                            button.textContent =
                                'در حال ذخیره...';
                        }


                        const updated =
                            await updateUserProfile(
                                fullName,
                                phone,
                                address
                            );


                        currentUser =
                            updated;


                        Object.assign(
                            user,
                            updated
                        );


                        successMessage =
                            'اطلاعات با موفقیت ذخیره شد';

                        errorMessage = '';


                        showToast(
                            '✅',
                            'ذخیره شد',
                            'اطلاعات کاربری به‌روزرسانی شد',
                            'success'
                        );


                        render();

                    } catch (error) {

                        errorMessage =
                            error.message;

                        successMessage = '';

                        render();
                    }
                }
            );


        document
            .getElementById(
                'backToDashboardBtn'
            )
            ?.addEventListener(
                'click',
                () => {

                    renderDashboard();
                }
            );


        document
            .getElementById(
                'logoutFromProfileBtn'
            )
            ?.addEventListener(
                'click',
                async () => {

                    await logoutUser();

                    renderAuthPage();

                    showToast(
                        '👋',
                        'خروج',
                        'شما از حساب خود خارج شدید',
                        'info'
                    );
                }
            );


        applySavedTheme();
    }


    render();
}


// ============================================================
// Navbar
// ============================================================

function renderNavbar() {

    const user =
        getCurrentUser();


    const name =
        user?.fullName ||
        'کاربر';


    const initial =
        name
            .charAt(0)
            .toUpperCase();


    return `

        <nav class="navbar navbar-expand-lg app-navbar sticky-top">

            <div class="container-fluid px-3 px-lg-4">

                <a
                    class="navbar-brand d-flex align-items-center gap-2"
                    href="#"
                    id="homeLink"
                >

                    <span class="brand-icon">
                        📊
                    </span>

                    <span>
                        داشبورد سنسورها
                    </span>

                </a>


                <div class="d-flex align-items-center gap-2">

                    <button
                        class="btn btn-sm btn-outline-secondary"
                        id="themeToggle"
                    >

                        <i class="bi bi-moon"></i>

                    </button>


                    <button
                        class="btn btn-sm btn-outline-primary"
                        id="refreshBtn"
                    >

                        <i class="bi bi-arrow-clockwise"></i>

                    </button>


                    <button
                        class="btn btn-sm btn-outline-info"
                        id="profileBtn"
                    >

                        <i class="bi bi-person"></i>

                    </button>


                    <div class="user-chip">

                        <div class="avatar">
                            ${initial}
                        </div>

                        <span class="d-none d-md-inline">
                            ${name}
                        </span>

                    </div>


                    <button
                        class="btn btn-sm btn-outline-danger"
                        id="logoutBtn"
                    >

                        <i class="bi bi-box-arrow-right"></i>

                    </button>

                </div>

            </div>

        </nav>
    `;
}


// ============================================================
// Dashboard
// ============================================================

function renderDashboard() {

    const app =
        document.getElementById(
            'app'
        );


    if (!app) {
        return;
    }


    const user =
        getCurrentUser();


    if (!user) {

        renderAuthPage();

        return;
    }


    app.innerHTML = `

        ${renderNavbar()}


        <div class="container-fluid dashboard-container px-3 px-lg-4 py-4">


            <div
                class="row g-3 mb-4"
                id="statsRow"
            ></div>


            <div class="row mb-4">

                <div class="col-12">

                    <div id="buzzerContainer"></div>

                </div>

            </div>


            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">

                <h5 class="fw-bold mb-0">

                    <i class="bi bi-cpu"></i>

                    وضعیت سنسورها

                </h5>


                <span class="badge bg-light text-secondary border px-3 py-2">

                    <i class="bi bi-clock"></i>

                    به‌روزرسانی:

                    <span id="updateTime">
                        --:--:--
                    </span>

                </span>

            </div>


            <div
                class="row g-3"
                id="sensorGrid"
            ></div>


            <div class="mt-3 d-flex gap-2 flex-wrap">

                <button
                    class="btn btn-sm btn-outline-secondary"
                    id="resetBtn"
                >

                    <i class="bi bi-arrow-counterclockwise"></i>

                    ریست سنسورها

                </button>


                <button
                    class="btn btn-sm btn-outline-secondary"
                    id="simulateAlertBtn"
                >

                    <i class="bi bi-exclamation-triangle"></i>

                    شبیه‌سازی هشدار

                </button>

            </div>


            <div class="mt-4">

                <h5 class="fw-bold mb-2">

                    <i class="bi bi-list-check"></i>

                    لاگ فعالیت‌ها

                </h5>


                <div class="card border-0 shadow-sm">

                    <div
                        class="card-body p-2"
                        id="logContainer"
                        style="max-height:200px; overflow-y:auto;"
                    ></div>

                </div>

            </div>

        </div>


        <div
            class="toast-container"
            id="toastContainer"
        ></div>
    `;


    // ========================================================
    // Refresh
    // ========================================================

    document
        .getElementById(
            'refreshBtn'
        )
        ?.addEventListener(
            'click',
            () => {

                addLog(
                    '🔄 رفرش دستی',
                    'info'
                );

                updateDashboard();
            }
        );


    // ========================================================
    // Logout
    // ========================================================

    document
        .getElementById(
            'logoutBtn'
        )
        ?.addEventListener(
            'click',
            async () => {

                await logoutUser();

                renderAuthPage();

                showToast(
                    '👋',
                    'خروج',
                    'شما از حساب خود خارج شدید',
                    'info'
                );
            }
        );


    // ========================================================
    // Profile
    // ========================================================

    document
        .getElementById(
            'profileBtn'
        )
        ?.addEventListener(
            'click',
            () => {

                stopAutoUpdate();

                renderProfilePage();
            }
        );


    // ========================================================
    // Home
    // ========================================================

    document
        .getElementById(
            'homeLink'
        )
        ?.addEventListener(
            'click',
            event => {

                event.preventDefault();

                renderDashboard();
            }
        );


    // ========================================================
    // Reset
    // ========================================================

    document
        .getElementById(
            'resetBtn'
        )
        ?.addEventListener(
            'click',
            () => {

                sensors.forEach(
                    sensor => {

                        sensor.status = 1;

                        sensor.alert = false;
                    }
                );


                if (isBuzzerActive) {

                    deactivateBuzzer();
                }


                renderStats();
                renderSensors();
                renderBuzzer();


                addLog(
                    '🔄 ریست سنسورها انجام شد',
                    'success'
                );


                showToast(
                    '🔄',
                    'ریست',
                    'همه سنسورها ریست شدند',
                    'info'
                );
            }
        );


    // ========================================================
    // Simulate alert
    // ========================================================

    document
        .getElementById(
            'simulateAlertBtn'
        )
        ?.addEventListener(
            'click',
            () => {

                const randomSensor =
                    sensors[
                        Math.floor(
                            Math.random() *
                            sensors.length
                        )
                    ];


                if (
                    randomSensor.key === 'fire' ||
                    randomSensor.key === 'gas'
                ) {

                    randomSensor.status = 0;

                } else if (
                    randomSensor.key === 'temp'
                ) {

                    randomSensor.status = 40;

                } else if (
                    randomSensor.key === 'humidity'
                ) {

                    randomSensor.status = 85;
                }


                randomSensor.alert =
                    computeAlert(
                        randomSensor
                    );


                renderStats();
                renderSensors();
                renderBuzzer();


                addLog(
                    `⚠️ شبیه‌سازی هشدار برای ${randomSensor.name}`,
                    'warning'
                );


                showToast(
                    '⚠️',
                    'شبیه‌سازی',
                    `هشدار برای ${randomSensor.name} فعال شد`,
                    'warning'
                );


                if (!isBuzzerActive) {

                    activateBuzzer();
                }
            }
        );


    // ========================================================
    // Theme
    // ========================================================

    document
        .getElementById(
            'themeToggle'
        )
        ?.addEventListener(
            'click',
            toggleTheme
        );


    applySavedTheme();


    // ========================================================
    // Initial Render
    // ========================================================

    renderStats();

    renderSensors();

    renderBuzzer();


    // ========================================================
    // دریافت اولیه داده سنسورها
    // ========================================================

    updateDashboard();


    // ========================================================
    // Auto Update
    // ========================================================

    startAutoUpdate();


    addLog(
        `👤 کاربر ${
            getCurrentUser()?.fullName ||
            'کاربر'
        } وارد شد`,
        'success'
    );
}


// ============================================================
// Theme
// ============================================================

function applySavedTheme() {

    const savedTheme =
        localStorage.getItem(
            'theme'
        );


    const isDark =
        savedTheme === 'dark';


    document.body.classList.toggle(
        'dark-mode',
        isDark
    );


    const btn =
        document.getElementById(
            'themeToggle'
        );


    if (btn) {

        btn.innerHTML =
            isDark
                ? '<i class="bi bi-sun"></i>'
                : '<i class="bi bi-moon"></i>';
    }
}


function toggleTheme() {

    const isDark =
        document.body.classList.toggle(
            'dark-mode'
        );


    localStorage.setItem(
        'theme',
        isDark
            ? 'dark'
            : 'light'
    );


    const btn =
        document.getElementById(
            'themeToggle'
        );


    if (btn) {

        btn.innerHTML =
            isDark
                ? '<i class="bi bi-sun"></i>'
                : '<i class="bi bi-moon"></i>';
    }


    addLog(
        `تم تغییر به ${
            isDark
                ? 'تاریک'
                : 'روشن'
        }`,
        'info'
    );
}


// ============================================================
// Auto Update
// ============================================================

function startAutoUpdate() {

    stopAutoUpdate();


    updateInterval =
        setInterval(
            updateDashboard,
            3000
        );
}


function stopAutoUpdate() {

    if (updateInterval) {

        clearInterval(
            updateInterval
        );

        updateInterval = null;
    }
}


// ============================================================
// شروع برنامه - بررسی Session واقعی Django
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    async () => {

        console.log('');

        console.log(
            '========================================'
        );

        console.log(
            '🚀 شروع برنامه'
        );

        console.log(
            '========================================'
        );


        console.log(
            '📄 صفحه بارگذاری شد'
        );


        console.log(
            '🔗 AUTH URL:',
            AUTH_URL
        );


        console.log(
            '🔍 در حال بررسی Session واقعی Django...'
        );


        /*
         * مهم:
         *
         * LocalStorage به تنهایی معیار ورود کاربر نیست.
         * ابتدا Session واقعی Django بررسی می‌شود.
         */

        const user =
            await fetchCurrentUser();


        // ====================================================
        // Session معتبر است
        // ====================================================

        if (user) {

            console.log(
                '✅ Session معتبر است'
            );


            console.log(
                '👤 کاربر فعلی:',
                user
            );


            currentUser =
                user;


            renderDashboard();


            console.log(
                '📊 Dashboard نمایش داده شد'
            );

        }


        // ====================================================
        // Session معتبر نیست
        // ====================================================

        else {

            console.log(
                '🔒 Session معتبر نیست'
            );


            clearCurrentUser();


            console.log(
                '🧹 LocalStorage پاک شد'
            );


            console.log(
                '🔐 نمایش صفحه ورود'
            );


            renderAuthPage();
        }


        console.log(
            '========================================'
        );


        console.log(
            '✅ برنامه آماده است'
        );


        console.log(
            '========================================'
        );
    }
);


// ============================================================
// دسترسی از Console
// ============================================================

window.sensorApp = {

    sensors,

    updateDashboard,

    startAutoUpdate,

    stopAutoUpdate,

    addLog,

    renderSensors,

    renderStats,

    renderBuzzer,

    renderDashboard,

    renderAuthPage,

    renderProfilePage,

    getCurrentUser,

    saveCurrentUser,

    fetchCurrentUser,

    registerUser,

    loginUser,

    logoutUser,

    updateUserProfile,

    fetchDeviceData,

    activateBuzzer,

    deactivateBuzzer,

    toggleBuzzer,

    computeAlert,

    isDisconnected,

    generateRandomData
};


console.log(
    '✅ برنامه آماده است!'
);


console.log(
    '📖 برای راهنما: window.sensorApp'
);


console.log(
    '👤 کاربران LocalStorage:',
    getCurrentUser()
);