
const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST = "127.0.0.1";
const PORT = 3000;

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const PRIVATE_DIR = path.join(ROOT, "private");
const PEOPLE_FILE = path.join(PRIVATE_DIR, "people.json");

fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(PRIVATE_DIR, { recursive: true });

if (!fs.existsSync(PEOPLE_FILE)) {
  fs.writeFileSync(PEOPLE_FILE, "[]\n", "utf8");
}

function readPeople() {
  const data = JSON.parse(fs.readFileSync(PEOPLE_FILE, "utf8"));
  return Array.isArray(data) ? data : [];
}

function writePeople(people) {
  const tempFile = PEOPLE_FILE + ".tmp";
  fs.writeFileSync(tempFile, JSON.stringify(people, null, 2) + "\n", "utf8");
  fs.renameSync(tempFile, PEOPLE_FILE);
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function cleanPerson(input) {
  const person = {
    id: String(input.id || ""),
    name: String(input.name || "").trim().slice(0, 120),
    title: String(input.title || "").trim().slice(0, 120),
    department: String(input.department || "").trim().slice(0, 120),
    status: String(input.status || "Active").slice(0, 40),
    notes: String(input.notes || "").slice(0, 10000),
    history: Array.isArray(input.history) ? input.history.slice(0, 100) : [],
    issues: Array.isArray(input.issues) ? input.issues.slice(0, 100) : [],
    activity: Array.isArray(input.activity) ? input.activity.slice(0, 100) : [],
    customFields: Array.isArray(input.customFields)
      ? input.customFields.slice(0, 100)
      : [],
    updatedAt: new Date().toISOString()
  };

  for (const key of ["history", "issues", "activity", "customFields"]) {
    person[key] = person[key].map(item => {
      if (!item || typeof item !== "object") return {};
      const safe = {};
      for (const [k, v] of Object.entries(item)) {
        safe[String(k).slice(0, 80)] = String(v ?? "").slice(0, 5000);
      }
      return safe;
    });
  }

  if (!person.id || !person.name) {
    throw new Error("A record ID and name are required.");
  }

  return person;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);

    if (url.pathname === "/api/people" && req.method === "GET") {
      return sendJson(res, 200, readPeople());
    }

    if (url.pathname === "/api/people" && req.method === "POST") {
      const input = await readBody(req);
      const people = readPeople();
      const person = cleanPerson(input);

      if (people.some(p => p.id === person.id)) {
        return sendJson(res, 409, { error: "That record ID already exists." });
      }

      people.push(person);
      writePeople(people);
      return sendJson(res, 201, person);
    }

    const match = url.pathname.match(/^\/api\/people\/([a-zA-Z0-9_-]+)$/);

    if (match && req.method === "PUT") {
      const id = match[1];
      const people = readPeople();
      const index = people.findIndex(p => p.id === id);

      if (index < 0) {
        return sendJson(res, 404, { error: "Record not found." });
      }

      const input = await readBody(req);
      input.id = id;
      people[index] = cleanPerson(input);
      writePeople(people);
      return sendJson(res, 200, people[index]);
    }

    if (match && req.method === "DELETE") {
      const id = match[1];
      const people = readPeople();
      const updated = people.filter(p => p.id !== id);

      if (updated.length === people.length) {
        return sendJson(res, 404, { error: "Record not found." });
      }

      writePeople(updated);
      return sendJson(res, 200, { success: true });
    }

    if (url.pathname.startsWith("/api/")) {
      return sendJson(res, 404, { error: "API endpoint not found." });
    }

    const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const filePath = path.resolve(PUBLIC_DIR, "." + requestedPath);

    if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== path.join(PUBLIC_DIR, "index.html")) {
      res.writeHead(403);
      return res.end("Forbidden");
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404);
      return res.end("Not found");
    }

    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon"
    };

    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store"
    });

    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      sendJson(res, 400, { error: error.message || "Request failed." });
    } else {
      res.end();
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`AIA running at http://${HOST}:${PORT}`);
  console.log(`Private records file: ${PEOPLE_FILE}`);
  console.log("This server only listens on this computer.");
});
