import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY is not set in environment variables.");
  }

  // Handle escaped newlines if present
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }

  // Ensure the key has the correct headers if they were stripped or malformed
  if (!key.startsWith('-----BEGIN PRIVATE KEY-----')) {
    console.warn("GOOGLE_PRIVATE_KEY does not start with expected header.");
  }

  return new google.auth.JWT({
    email: email,
    key: key,
    scopes: SCOPES,
  });
}

// --- Auth Routes (Session Based) ---

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const sheets = google.sheets({ version: "v4", auth: getAuthClient() });
    const spreadsheetId = (process.env.SPREADSHEET_ID || "1x75Ms8xPARMsz-dJGm7Hz6g8QvHJCZrRNQrf_X-HYZM").trim();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Users!A:D",
    });

    const rows = response.data.values || [];
    const userRow = rows.find(row => row[0] === email && row[1] === password);

    if (userRow) {
      const user = {
        email: userRow[0],
        role: userRow[2],
        name: userRow[3]
      };
      
      res.cookie("user_session", JSON.stringify(user), {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      
      res.json({ success: true, user });
    } else {
      res.status(401).json({ error: "Email atau Password salah" });
    }
  } catch (error: any) {
    console.error("Login error:", error);
    let errorMessage = "Gagal melakukan login";
    if (error.message?.includes("No key or keyFile set") || error.message?.includes("is not set in environment variables")) {
      errorMessage = "Konfigurasi Google Service Account belum lengkap di panel Secrets.";
    }
    res.status(500).json({ error: errorMessage });
  }
});

app.get("/api/auth/status", (req, res) => {
  const session = req.cookies.user_session;
  if (session) {
    res.json({ isAuthenticated: true, user: JSON.parse(session) });
  } else {
    res.json({ isAuthenticated: false });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("user_session", {
    secure: true,
    sameSite: "none",
  });
  res.json({ success: true });
});

// --- Spreadsheet Routes ---

async function getSheets() {
  const auth = getAuthClient();
  return google.sheets({ version: "v4", auth });
}

app.get("/api/sheets/init", async (req, res) => {
  try {
    const sheets = await getSheets();
    const spreadsheetId = (process.env.SPREADSHEET_ID || "1x75Ms8xPARMsz-dJGm7Hz6g8QvHJCZrRNQrf_X-HYZM").trim();

    // Check if sheets exist, if not create them
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = response.data.sheets?.map(s => s.properties?.title) || [];

    const requiredSheets = ["Members", "Savings", "Products", "Transactions", "Inventory", "Users"];
    const sheetsToAdd = requiredSheets.filter(s => !existingSheets.includes(s));

    if (sheetsToAdd.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: sheetsToAdd.map(title => ({
            addSheet: { properties: { title } }
          }))
        }
      });

      // Add headers to new sheets
      for (const title of sheetsToAdd) {
        let headers: string[] = [];
        if (title === "Members") headers = ["ID", "Name", "Email", "Phone", "JoinDate"];
        if (title === "Savings") headers = ["MemberID", "Type", "Amount", "Date"];
        if (title === "Products") headers = ["ID", "Name", "Price", "Category", "Stock"];
        if (title === "Transactions") headers = ["ID", "MemberID", "Type", "Amount", "Date", "Description"];
        if (title === "Inventory") headers = ["ProductID", "Quantity", "LastUpdated"];
        if (title === "Users") headers = ["Email", "Password", "Role", "Name"];

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${title}!A1`,
          valueInputOption: "RAW",
          requestBody: { values: [headers] }
        });
      }
    }

    res.json({ success: true, message: "Sheets initialized" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/sheets/data/:sheetName", async (req, res) => {
  try {
    const sheets = await getSheets();
    const { sheetName } = req.params;
    const spreadsheetId = (process.env.SPREADSHEET_ID || "1x75Ms8xPARMsz-dJGm7Hz6g8QvHJCZrRNQrf_X-HYZM").trim();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return res.json([]);

    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/sheets/data/:sheetName/:id", async (req, res) => {
  try {
    const sheets = await getSheets();
    const { sheetName, id } = req.params;
    const spreadsheetId = (process.env.SPREADSHEET_ID || "1x75Ms8xPARMsz-dJGm7Hz6g8QvHJCZrRNQrf_X-HYZM").trim();
    const values = req.body.values;

    // Find the row index
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);

    if (rowIndex === -1) {
      return res.status(404).json({ error: "Data not found" });
    }

    // Update the row (rowIndex + 1 because Sheets is 1-indexed)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [values],
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/sheets/data/:sheetName/:id", async (req, res) => {
  try {
    const sheets = await getSheets();
    const { sheetName, id } = req.params;
    const spreadsheetId = (process.env.SPREADSHEET_ID || "1x75Ms8xPARMsz-dJGm7Hz6g8QvHJCZrRNQrf_X-HYZM").trim();

    // Find the row index
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);

    if (rowIndex === -1) {
      return res.status(404).json({ error: "Data not found" });
    }

    // Get sheet ID
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);
    const sheetId = sheet?.properties?.sheetId;

    if (sheetId === undefined) {
      return res.status(404).json({ error: "Sheet not found" });
    }

    // Delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sheets/data/:sheetName", async (req, res) => {
  try {
    const sheets = await getSheets();
    const { sheetName } = req.params;
    const spreadsheetId = (process.env.SPREADSHEET_ID || "1x75Ms8xPARMsz-dJGm7Hz6g8QvHJCZrRNQrf_X-HYZM").trim();
    const values = req.body.values; // Expecting an array of values [val1, val2, ...]

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: "RAW",
      requestBody: {
        values: [values],
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sheets/seed", async (req, res) => {
  try {
    const sheets = await getSheets();
    const spreadsheetId = (process.env.SPREADSHEET_ID || "1x75Ms8xPARMsz-dJGm7Hz6g8QvHJCZrRNQrf_X-HYZM").trim();

    // Ensure sheets exist first
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];
    
    const requiredSheets = ["Members", "Savings", "Products", "Transactions", "Inventory", "Users"];
    const sheetsToAdd = requiredSheets.filter(s => !existingSheets.includes(s));

    if (sheetsToAdd.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: sheetsToAdd.map(title => ({
            addSheet: { properties: { title } }
          }))
        }
      });
      
      // Add headers
      for (const title of sheetsToAdd) {
        let headers: string[] = [];
        if (title === "Members") headers = ["ID", "Name", "Email", "Phone", "JoinDate"];
        if (title === "Savings") headers = ["MemberID", "Type", "Amount", "Date"];
        if (title === "Products") headers = ["ID", "Name", "Price", "Category", "Stock"];
        if (title === "Transactions") headers = ["ID", "MemberID", "Type", "Amount", "Date", "Description"];
        if (title === "Inventory") headers = ["ProductID", "Quantity", "LastUpdated"];
        if (title === "Users") headers = ["Email", "Password", "Role", "Name"];

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${title}!A1`,
          valueInputOption: "RAW",
          requestBody: { values: [headers] }
        });
      }
    }

    const seedData = {
      Members: [
        ["MBR-1001", "Budi Santoso", "budi@email.com", "08123456789", "01/01/2024"],
        ["MBR-1002", "Siti Aminah", "siti@email.com", "08129876543", "15/01/2024"],
        ["MBR-1003", "Agus Setiawan", "agus@email.com", "08131122334", "02/02/2024"],
      ],
      Savings: [
        ["MBR-1001", "Simpanan Pokok", "500000", "01/01/2024"],
        ["MBR-1001", "Simpanan Wajib", "50000", "01/02/2024"],
        ["MBR-1002", "Simpanan Pokok", "500000", "15/01/2024"],
      ],
      Products: [
        ["PRD-2001", "Beras Premium 5kg", "75000", "Sembako", "50"],
        ["PRD-2002", "Minyak Goreng 2L", "35000", "Sembako", "30"],
        ["PRD-2003", "Gula Pasir 1kg", "16000", "Sembako", "100"],
        ["PRD-2004", "Sabun Mandi", "5000", "Kebutuhan Rumah", "5"],
      ],
      Transactions: [
        ["TX-3001", "MBR-1001", "Simpanan", "500000", "01/01/2024", "Setoran Awal"],
        ["TX-3002", "MBR-1002", "Simpanan", "500000", "15/01/2024", "Setoran Awal"],
        ["TX-3003", "MBR-1001", "Belanja", "75000", "05/02/2024", "Pembelian Beras"],
      ],
      Inventory: [
        ["PRD-2001", "50", "05/02/2024"],
        ["PRD-2002", "30", "05/02/2024"],
        ["PRD-2003", "100", "05/02/2024"],
      ],
      Users: [
        ["admin@koperasi.com", "admin123", "Admin", "Administrator"],
        ["staff@koperasi.com", "staff123", "Pengurus", "Staff Koperasi"],
        ["budi@email.com", "budi123", "Anggota", "Budi Santoso"],
      ]
    };

    for (const [sheetName, rows] of Object.entries(seedData)) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A2`,
        valueInputOption: "RAW",
        requestBody: { values: rows },
      });
    }

    res.json({ 
      success: true, 
      message: "Data sampel berhasil diisi!",
      debug: {
        spreadsheetId: spreadsheetId.substring(0, 6) + "..." + spreadsheetId.substring(spreadsheetId.length - 6),
        sheetsUpdated: Object.keys(seedData)
      }
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- Vite Middleware ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
