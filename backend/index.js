import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";
import autoInitialize from "./db/auto-init.js";

const app = express();
const PORT = process.env.PORT || 3000;

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Init DB first, then import routers (so pool connects to an existing DB)
autoInitialize()
  .then(async () => {
    const { default: authRouter } = await import("./routers/auth.route.js");
    const { default: settingsRouter } =
      await import("./routers/settings.Route.js");
    const { default: catalogsRouter } =
      await import("./routers/catalogs.route.js");
    const { default: clientRouter } = await import("./routers/client.route.js");
    const { default: jobRouter } = await import("./routers/job.route.js");
    const { default: inventoryRouter } = await import("./routers/inventory.route.js");
    const { default: assemblyRouter } = await import("./routers/assembly.route.js");
    const { default: afterserviceRouter } = await import("./routers/afterservice.route.js");
    const { default: deliveryRouter } = await import("./routers/delivery.route.js");
    const { default: softwareKeysRouter } = await import("./routers/softwarekeys.route.js");

    app.use("/auth", authRouter);
    app.use("/settings", settingsRouter);
    app.use("/catalogs", catalogsRouter);
    app.use("/clients", clientRouter);
    app.use("/jobs", jobRouter);
    app.use("/inventory", inventoryRouter);
    app.use("/assembly", assemblyRouter);
    app.use("/delivery", deliveryRouter);
    app.use("/software-keys", softwareKeysRouter);
    app.use("/afterservice", afterserviceRouter);

    // TODO: mount as implemented
    // app.use('/clients',       clientsRouter);
    // app.use('/inventory',     inventoryRouter);
    // app.use('/software-keys', softwareKeysRouter);
    // app.use('/jobs',          jobsRouter);
    // app.use('/assembly',      assemblyRouter);
    // app.use('/repairs',       repairsRouter);
    // app.use('/reports',       reportsRouter);
    // app.use('/audit',         auditRouter);

    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`),
    );
  })
  .catch((err) => {
    console.error("❌ Failed to initialise database:", err.message);
    process.exit(1);
  });
