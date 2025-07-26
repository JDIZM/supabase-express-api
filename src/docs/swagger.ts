import swaggerUi from "swagger-ui-express";
import type { Application } from "express";
import { generateOpenAPIDocument } from "./openapi.ts";
import { logger } from "@/helpers/logger.ts";

export const setupSwagger = (app: Application): void => {
  try {
    const document = generateOpenAPIDocument();

    // Serve Swagger UI
    app.use("/docs", swaggerUi.serve);
    app.get(
      "/docs",
      swaggerUi.setup(document, {
        customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 20px 0 }
      `,
        customSiteTitle: "Supabase Express API Documentation"
      })
    );

    // Serve OpenAPI JSON spec
    app.get("/openapi.json", (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.send(document);
    });

    logger.info("Swagger UI setup complete - available at /docs");
  } catch (error) {
    logger.error("Failed to setup Swagger UI:", error);
  }
};
