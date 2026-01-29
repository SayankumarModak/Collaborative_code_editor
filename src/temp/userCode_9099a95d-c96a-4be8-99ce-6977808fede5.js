// Native fetch fallback
const __nativeFetch = typeof fetch === 'function' ? fetch : async (url, options = {}) => {
  const m = await import('node-fetch');
  const fn = m.default || m;
  return fn(url, options);
};

// Proxy fetch through backend
global.fetch = async (url, options = {}) => {
  try {
    const proxyUrl = "http://localhost:5000/api/proxy?url=" + encodeURIComponent(url);
    const res = await __nativeFetch(proxyUrl, options);
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      json: async () => {
        try { return JSON.parse(text); }
        catch (e) { return { __parseError: true, raw: text }; }
      },
      text: async () => text,
    };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      json: async () => ({ error: err.message }),
      text: async () => err.message,
    };
  }
};

// Capture console logs
const logs = [];
const __originalLog = console.log;
const __originalError = console.error;
console.log = (...args) => logs.push(args.join(' '));
console.error = (...args) => logs.push(args.join(' '));

(async () => {
  try {
async function getUsers() {
  const res = await fetch("https://dummyjson.com/users");
  const data = await res.json();
  console.log(data.users);
 
}

getUsers();

  } catch (err) {
    console.error(err.message);
  }
})()
  .then(() => {
    __originalLog('__RESULT__' + logs.join('\n'));
  })
  .catch(err => {
    __originalError('__RESULT__ERROR: ' + err.message);
  });