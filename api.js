/**
 * ====================================================================
 * Classroom LMS Unified API Client & Helper Bridge
 * รองรับทั้งการทำงานบน GitHub Pages (Fetch API) และ Google Apps Script (google.script.run)
 * ====================================================================
 */

const LMS_STORAGE_KEYS = {
  STUDENT_TOKEN: 'student_auth_token',
  STUDENT_SESSION: 'student_session',
  STUDENT_REMEMBER: 'student_remember_me',
  TEACHER_TOKEN: 'teacher_auth_token',
  TEACHER_SESSION: 'teacher_session',
  SCHOOL_LOGO: 'schoolLogo'
};

const LMS = {
  // ------------------------------------------------------------------
  // 1. API Call Engine (Dual Mode: REST API / google.script.run)
  // ------------------------------------------------------------------
  async call(action, payload = {}) {
    const isGasEnvironment = typeof google !== 'undefined' && 
                             google.script && 
                             google.script.run && 
                             !google.script.run.__isShim &&
                             !window.CONFIG?.FORCE_HTTP_API;

    // A. รันบน Google Apps Script Web App
    if (isGasEnvironment) {
      return new Promise((resolve, reject) => {
        try {
          if (typeof google.script.run[action] === 'function') {
            google.script.run
              .withSuccessHandler(res => resolve(res))
              .withFailureHandler(err => reject(err))[action](payload);
          } else {
            // fallback หากเป็น generic action
            google.script.run
              .withSuccessHandler(res => resolve(res))
              .withFailureHandler(err => reject(err))
              .handleApiRequest_(action, payload);
          }
        } catch (e) {
          reject(e);
        }
      });
    }

    // B. รันบน GitHub Pages หรือ Localhost (Fetch POST ไปยัง Web App)
    const apiUrl = window.CONFIG?.API_URL;
    if (!apiUrl || apiUrl.includes('YOUR_APPS_SCRIPT_WEB_APP_URL') || apiUrl.includes('_example')) {
      const msg = 'กรุณาระบุ URL ของ Google Apps Script Web App ในไฟล์ js/config.js ให้ถูกต้อง';
      console.warn('[LMS API]', msg);
      return {
        success: false,
        message: msg,
        isConfigMissing: true
      };
    }

    try {
      // เทคนิคสำคัญสำหรับ Google Apps Script CORS:
      // ใช้ Content-Type: text/plain;charset=utf-8 เพื่อเลี่ยง Preflight (OPTIONS)
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: action,
          payload: payload
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      return data;
    } catch (err) {
      console.error(`[LMS API Error: ${action}]`, err);
      return {
        success: false,
        error: err.toString(),
        message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ Google Apps Script ได้ (' + err.message + ')'
      };
    }
  },

  // ------------------------------------------------------------------
  // 2. Session & Auth Management
  // ------------------------------------------------------------------
  getStudentToken() {
    try {
      const sessionToken = sessionStorage.getItem(LMS_STORAGE_KEYS.STUDENT_TOKEN);
      if (sessionToken) return sessionToken;
      if (localStorage.getItem(LMS_STORAGE_KEYS.STUDENT_REMEMBER) === '1') {
        return localStorage.getItem(LMS_STORAGE_KEYS.STUDENT_TOKEN) || '';
      }
      return '';
    } catch (e) { return ''; }
  },

  getStudentProfile() {
    try {
      const raw = sessionStorage.getItem(LMS_STORAGE_KEYS.STUDENT_SESSION) ||
                  localStorage.getItem(LMS_STORAGE_KEYS.STUDENT_SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  saveStudentAuth(res, rememberMe = false) {
    try {
      this.clearStudentAuth();
      const token = res?.authToken || '';
      const profile = JSON.stringify(res?.student || {});
      if (rememberMe) {
        localStorage.setItem(LMS_STORAGE_KEYS.STUDENT_TOKEN, token);
        localStorage.setItem(LMS_STORAGE_KEYS.STUDENT_SESSION, profile);
        localStorage.setItem(LMS_STORAGE_KEYS.STUDENT_REMEMBER, '1');
      } else {
        sessionStorage.setItem(LMS_STORAGE_KEYS.STUDENT_TOKEN, token);
        sessionStorage.setItem(LMS_STORAGE_KEYS.STUDENT_SESSION, profile);
      }
    } catch (e) {}
  },

  clearStudentAuth() {
    try {
      localStorage.removeItem(LMS_STORAGE_KEYS.STUDENT_TOKEN);
      localStorage.removeItem(LMS_STORAGE_KEYS.STUDENT_SESSION);
      localStorage.removeItem(LMS_STORAGE_KEYS.STUDENT_REMEMBER);
      sessionStorage.removeItem(LMS_STORAGE_KEYS.STUDENT_TOKEN);
      sessionStorage.removeItem(LMS_STORAGE_KEYS.STUDENT_SESSION);
    } catch (e) {}
  },

  getTeacherToken() {
    try {
      return localStorage.getItem(LMS_STORAGE_KEYS.TEACHER_TOKEN) || 
             sessionStorage.getItem(LMS_STORAGE_KEYS.TEACHER_TOKEN) || '';
    } catch (e) { return ''; }
  },

  getTeacherProfile() {
    try {
      const raw = localStorage.getItem(LMS_STORAGE_KEYS.TEACHER_SESSION) || 
                  sessionStorage.getItem(LMS_STORAGE_KEYS.TEACHER_SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  saveTeacherAuth(res) {
    try {
      const token = res?.authToken || '';
      const profile = JSON.stringify(res?.teacher || {});
      localStorage.setItem(LMS_STORAGE_KEYS.TEACHER_TOKEN, token);
      localStorage.setItem(LMS_STORAGE_KEYS.TEACHER_SESSION, profile);
      localStorage.setItem('admin_authenticated', 'true');
      if (res?.teacher) {
        localStorage.setItem('teacher_id', res.teacher.TeacherID || '');
        localStorage.setItem('teacher_name', res.teacher.Name || '');
        localStorage.setItem('teacher_role', res.teacher.Role || (res.isAdmin ? 'admin' : 'teacher'));
      }
    } catch (e) {}
  },

  clearTeacherAuth() {
    try {
      localStorage.removeItem(LMS_STORAGE_KEYS.TEACHER_TOKEN);
      localStorage.removeItem(LMS_STORAGE_KEYS.TEACHER_SESSION);
      localStorage.removeItem('admin_authenticated');
      localStorage.removeItem('teacher_id');
      localStorage.removeItem('teacher_name');
      localStorage.removeItem('teacher_role');
      sessionStorage.removeItem(LMS_STORAGE_KEYS.TEACHER_TOKEN);
      sessionStorage.removeItem(LMS_STORAGE_KEYS.TEACHER_SESSION);
    } catch (e) {}
  },

  handleAuthFailure(res, type = 'student') {
    if (!res || !res.authRequired) return false;
    if (type === 'teacher') {
      this.clearTeacherAuth();
    } else {
      this.clearStudentAuth();
    }
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: 'Session หมดอายุ',
        text: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
        confirmButtonColor: type === 'teacher' ? '#059669' : '#0284c7'
      }).then(() => {
        this.navigateTo('login', { switch: '1' });
      });
    } else {
      this.navigateTo('login', { switch: '1' });
    }
    return true;
  },

  // ------------------------------------------------------------------
  // 3. Navigation Helper (รองรับ GitHub Pages และ GAS Web App)
  // ------------------------------------------------------------------
  navigateTo(pageName, params = {}) {
    const isGas = (window.location.hostname.includes('script.google.com') ||
                   window.location.hostname.includes('googleusercontent.com')) &&
                  !window.google?.script?.run?.__isShim;
    let targetUrl = '';

    if (isGas) {
      // สำหรับ Google Apps Script Web App ใช้ query parameter ?page=...
      let baseUrl = window.location.href.split('?')[0].split('#')[0];
      const sep = baseUrl.includes('?') ? '&' : '?';
      targetUrl = baseUrl + sep + 'page=' + encodeURIComponent(pageName);
    } else {
      // สำหรับ GitHub Pages หรือ Static Hosting:
      // แมปหน้าไปยังไฟล์ HTML โดยตรง เช่น student.html, admin.html, login.html
      let filename = 'login.html';
      if (pageName === 'index' || pageName === 'student') filename = 'student.html';
      else if (pageName === 'admin' || pageName === 'teacher') filename = 'admin.html';
      else if (pageName === 'login') filename = 'index.html';
      else if (pageName === 'home') filename = 'index.html';

      const currentPath = window.location.pathname;
      const dir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
      targetUrl = window.location.origin + dir + filename;
    }

    if (params && typeof params === 'object') {
      const p = new URLSearchParams();
      Object.keys(params).forEach(k => {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
          p.set(k, String(params[k]));
        }
      });
      const qs = p.toString();
      if (qs) {
        targetUrl += (targetUrl.includes('?') ? '&' : '?') + qs;
      }
    }

    window.location.href = targetUrl;
  },

  // ------------------------------------------------------------------
  // 4. File & Security Utilities
  // ------------------------------------------------------------------
  escapeHtml(val) {
    return String(val ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  },

  safeUrl(url) {
    const x = String(url || '').trim();
    if (x.startsWith('data:image/')) return x;
    try {
      const u = new URL(x, window.location.href);
      return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : '#';
    } catch (e) {
      return '#';
    }
  },

  validateFile(file, maxMb = 25) {
    if (!file) return 'กรุณาเลือกไฟล์';
    if (file.size > maxMb * 1024 * 1024) return `ไฟล์มีขนาดเกิน ${maxMb}MB`;
    const allowed = /\.(pdf|doc|docx|zip|jpg|jpeg|png|webp|xlsx|xls|pptx|txt)$/i;
    if (!allowed.test(file.name)) return 'ชนิดไฟล์นี้ยังไม่รองรับ (รองรับ PDF, DOCX, ZIP, รูปภาพ ฯลฯ)';
    return '';
  },

  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = err => reject(err);
      reader.readAsDataURL(file);
    });
  },

  // ------------------------------------------------------------------
  // 5. System Branding & Cached Logo
  // ------------------------------------------------------------------
  applyLogo(logoUrl) {
    const cleanUrl = String(logoUrl || '').trim();
    ['studentBrandLogoImg', 'adminBrandLogoImg', 'loginBrandLogoImg', 'reportLogoImg', 'settingsLogoPreviewImg'].forEach(id => {
      const img = document.getElementById(id);
      if (img) {
        if (cleanUrl) {
          img.src = cleanUrl;
          img.classList.remove('hidden');
        } else {
          img.src = '';
          img.classList.add('hidden');
        }
      }
    });

    ['studentBrandLogoIcon', 'adminBrandLogoIcon', 'loginBrandLogoIcon', 'reportLogoIcon', 'settingsLogoPlaceholder'].forEach(id => {
      const icon = document.getElementById(id);
      if (icon) {
        if (cleanUrl) icon.classList.add('hidden');
        else icon.classList.remove('hidden');
      }
    });

    try {
      if (cleanUrl) localStorage.setItem(LMS_STORAGE_KEYS.SCHOOL_LOGO, cleanUrl);
      else localStorage.removeItem(LMS_STORAGE_KEYS.SCHOOL_LOGO);
    } catch (e) {}
  },

  loadCachedLogo() {
    try {
      const cached = localStorage.getItem(LMS_STORAGE_KEYS.SCHOOL_LOGO);
      if (cached) this.applyLogo(cached);
    } catch (e) {}
  }
};

// Polyfill & Bridge for backward compatibility
window.LMS = LMS;
window.getStudentToken = () => LMS.getStudentToken();
window.getTeacherToken = () => LMS.getTeacherToken();
window.clearStudentAuth = () => LMS.clearStudentAuth();
window.clearTeacherAuth = () => LMS.clearTeacherAuth();
window.escapeHtml = (v) => LMS.escapeHtml(v);
window.safeUrl = (v) => LMS.safeUrl(v);
window.navigateToPage = (page, params) => LMS.navigateTo(page, params);

// --------------------------------------------------------------------
// Transparent Shim for google.script.run on GitHub Pages / Localhost
// --------------------------------------------------------------------
(function initGoogleScriptShim() {
  if (typeof window === 'undefined') return;
  window.google = window.google || {};
  window.google.script = window.google.script || {};

  if (!window.google.script.run) {
    function normalizeArgs(action, args) {
      if (!args || args.length === 0) return {};
      if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
        return args[0];
      }
      switch (action) {
        case 'validateSession':
          return { authToken: args[0], expectedType: args[1] };
        case 'getStudentData':
          return { studentId: args[0], authToken: args[1] };
        case 'getTeacherData':
          return { teacherId: args[0], authToken: args[1] };
        case 'getGradebookData':
          return { courseId: args[0], authToken: args[1] };
        case 'getCourseJoinInfo':
          return { courseId: args[0], authToken: args[1] };
        case 'enrollStudentToCourse':
          return { courseId: args[0], authToken: args[1] };
        case 'deleteCourse':
          return { courseId: args[0], authToken: args[1] };
        case 'deleteAssignment':
          return { assignmentId: args[0], authToken: args[1] };
        case 'deleteAnnouncement':
          return { announcementId: args[0], authToken: args[1] };
        case 'deleteStudent':
          return { studentId: args[0], authToken: args[1] };
        case 'markNotificationRead':
          return { notificationId: args[0], authToken: args[1] };
        case 'markAllNotificationsRead':
          return { authToken: args[0] };
        case 'getNotifications':
          return { authToken: args[0], limit: args[1] };
        case 'getChatMessages':
          return { submissionId: args[0], assignmentId: args[1], studentId: args[2], authToken: args[3] };
        case 'adminDbAction':
          var base = (typeof args[1] === 'object' && args[1] !== null) ? Object.assign({}, args[1]) : {};
          base.action = args[0];
          base.authToken = args[2] || base.authToken;
          return base;
        case 'adminLogin':
          return { password: args[0] };
        case 'logoutSession':
          return { authToken: args[0] };
        case 'resetSchoolLogo':
          return { authToken: args[0] };
        case 'generateDemoData':
          return { authToken: args[0] };
        case 'clearAllDemoData':
          return { authToken: args[0] };
        case 'getWebAppUrl':
          return {};
        default:
          if (args.length === 1) {
            return typeof args[0] === 'object' && args[0] !== null ? args[0] : { value: args[0] };
          }
          return { args: args };
      }
    }

    function createRunner(successHandler, failureHandler) {
      var runnerObj = {
        __isShim: true,
        withSuccessHandler: function(fn) {
          return createRunner(fn, failureHandler);
        },
        withFailureHandler: function(fn) {
          return createRunner(successHandler, fn);
        },
        withUserObject: function() {
          return createRunner(successHandler, failureHandler);
        }
      };

      return new Proxy(runnerObj, {
        get: function(target, prop) {
          if (prop in target) return target[prop];
          if (typeof prop === 'symbol') return undefined;

          if (prop === 'getWebAppUrl') {
            return function() {
              var url = window.CONFIG?.API_URL || window.location.href;
              if (typeof successHandler === 'function') {
                setTimeout(function() { successHandler(url); }, 10);
              }
              return url;
            };
          }

          return function() {
            var args = Array.prototype.slice.call(arguments);
            var payload = normalizeArgs(prop, args);
            LMS.call(prop, payload).then(function(res) {
              if (typeof successHandler === 'function') {
                successHandler(res);
              }
            }).catch(function(err) {
              if (typeof failureHandler === 'function') {
                failureHandler(err);
              } else {
                console.error('[LMS Proxy Error: ' + prop + ']', err);
              }
            });
          };
        }
      });
    }

    window.google.script.run = createRunner(null, null);
  }
})();
