import express from "express";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, "../temp");

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

router.get("/ping", (req, res) => res.json({ ok: true }));

router.post("/run", async (req, res) => {
  try {
    const { code, language } = req.body;

    if (language !== "javascript") {
      return res.json({ output: "Only JavaScript is supported." });
    }

    const uuid =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : crypto.randomBytes(16).toString("hex");

    const filePath = path.join(tempDir, `userCode_${uuid}.js`);

    // 🔥 Wrapped execution file
    const wrappedCode = `
const logs = [];
const __originalLog = console.log;
const __originalError = console.error;

// Pretty formatter (fixes [object Object])
const format = (arg) => {
  if (typeof arg === "object") {
    try { return JSON.stringify(arg, null, 2); }
    catch { return "[Circular Object]"; }
  }
  return String(arg);
};

console.log = (...args) => logs.push(args.map(format).join(" "));
console.error = (...args) => logs.push(args.map(format).join(" "));

// Fetch fallback + proxy
const __nativeFetch = typeof fetch === 'function' ? fetch : async (url, options = {}) => {
  const m = await import('node-fetch');
  const fn = m.default || m;
  return fn(url, options);
};

global.fetch = async (url, options = {}) => {
  try {
    const proxyUrl = "http://localhost:5000/api/proxy?url=" + encodeURIComponent(url);
    const res = await __nativeFetch(proxyUrl, options);
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      json: async () => { try { return JSON.parse(text); } catch { return { raw: text }; } },
      text: async () => text,
    };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      json: async () => ({ error: err.message }),
      text: async () => err.message
    };
  }
};

(async () => {
  try {
    ${code}
  } catch (err) {
    console.error(err.message);
  }

  // 🔥 Wait until event loop is idle (handles async fetch)
  await new Promise(resolve => {
    const check = () => {
      const active = process._getActiveHandles().filter(h => h !== process.stdout && h !== process.stderr);
      if (active.length === 0) return resolve();
      setTimeout(check, 20);
    };
    check();
  });

})()
.then(() => {
  __originalLog("__RESULT__" + logs.join("\\n"));
})
.catch(err => {
  __originalError("__RESULT__ERROR: " + err.message);
});
`;

    fs.writeFileSync(filePath, wrappedCode);

    const child = spawn(process.execPath, [filePath], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let responded = false;

    const respond = (status, output) => {
      if (responded) return;
      responded = true;
      res.status(status).json({ output });
    };

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      respond(500, "Execution timed out");
    }, 10000);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => {
      clearTimeout(timeout);
      fs.unlink(filePath, () => {});
      respond(500, "Execution error: " + err.message);
    });

    child.on("close", () => {
      clearTimeout(timeout);
      fs.unlink(filePath, () => {});

      const result = stdout.includes("__RESULT__")
        ? stdout.split("__RESULT__")[1]
        : stdout;

      respond(200, result.trim() || stderr || "No output");
    });
  } catch (err) {
    res.status(500).json({ output: "Server error: " + err.message });
  }
});

export default router;
