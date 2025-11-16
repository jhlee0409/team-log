import { NestFactory } from "@nestjs/core";
import {
  ValidationPipe,
  RequestTimeoutException,
} from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import * as timeout from "connect-timeout";
import * as express from "express";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggerService } from "./common/logger/logger.service";

async function bootstrap() {
  const logger = new LoggerService("Bootstrap");
  const app = await NestFactory.create(AppModule);

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disable CSP to allow Swagger UI
    }),
  );

  // Request body size limits to prevent DoS attacks
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Request timeout configuration (30 seconds)
  app.use(timeout("30s"));
  app.use((req: any, res: any, next: any) => {
    if (req.timedout) {
      return next(
        new RequestTimeoutException(
          "Request processing exceeded timeout limit",
        ),
      );
    }
    next();
  });

  // Global exception filter for standardized error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable CORS for VS Code extension
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:3000",
    "http://localhost:5173",
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // Check if origin matches any allowed pattern (supports wildcards for vscode-webview)
      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed.includes("*")) {
          // Escape special regex characters, then replace escaped \* with .*
          const escaped = allowed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const pattern = new RegExp("^" + escaped.replace(/\\\*/g, ".*") + "$");
          return pattern.test(origin);
        }
        return allowed === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  });

  // Enable validation with automatic transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle("TeamLog API")
    .setDescription(
      "TeamLog backend API for collaborative daily log management with Yjs real-time collaboration",
    )
    .setVersion("1.0.0")
    .addTag("auth", "Authentication endpoints (GitHub OAuth, JWT)")
    .addTag("workspaces", "Workspace management")
    .addTag("logs", "Daily log operations")
    .addTag("yjs", "Yjs real-time collaboration WebSocket")
    .addTag("health", "Health check for monitoring")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter JWT token from /auth/login",
      },
      "JWT-auth",
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Keep authorization across page refreshes
      tagsSorter: "alpha",
      operationsSorter: "alpha",
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(
    `TeamLog Backend running on http://localhost:${port}`,
    "Bootstrap",
    {
      port,
      environment: process.env.NODE_ENV || "development",
      apiDocs: `http://localhost:${port}/api`,
    },
  );
}

bootstrap();
