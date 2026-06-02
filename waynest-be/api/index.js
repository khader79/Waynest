"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("module-alias/register");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("../src/app.module");
const express_1 = __importDefault(require("express"));
const platform_express_1 = require("@nestjs/platform-express");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const compression_1 = __importDefault(require("compression"));
const fs_1 = require("fs");
const config_defaults_1 = require("../src/common/config-defaults");
const uploads_path_1 = require("../src/modules/upload/uploads-path");
const missing_upload_response_1 = require("../src/modules/upload/missing-upload-response");
let cachedServer = null;
const corsOrigins = parseCorsOrigins();
function readNonNegativeIntEnv(name, fallback) {
    const parsed = Number(process.env[name]);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
/** Same browser origins as main.ts, plus optional extra comma-separated `CORS_ORIGINS`. */
function parseCorsOrigins() {
    const extra = (process.env.CORS_ORIGINS ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    const base = (0, config_defaults_1.getCorsOriginOption)();
    const baseList = Array.isArray(base) ? base : [base];
    const merged = [...new Set([...extra, ...baseList])];
    return merged.length === 1 ? merged[0] : merged;
}
function setCorsHeaders(req, res, allowedOrigins) {
    const origin = req.headers.origin;
    const allowedArray = Array.isArray(allowedOrigins)
        ? allowedOrigins
        : [allowedOrigins];
    if (origin && allowedArray.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept,Authorization,Cache-Control,Pragma,x-device-fingerprint,x-trip-guest-token');
    res.setHeader('Access-Control-Max-Age', '600');
    return req.method === 'OPTIONS';
}
function handlePreflight(req, res) {
    if (req.method !== 'OPTIONS') {
        return false;
    }
    setCorsHeaders(req, res, corsOrigins);
    res.sendStatus(204);
    return true;
}
async function bootstrapServer() {
    if (cachedServer) {
        return cachedServer;
    }
    const server = (0, express_1.default)();
    const compressionThreshold = readNonNegativeIntEnv('HTTP_COMPRESSION_THRESHOLD', 2048);
    server.disable('x-powered-by');
    server.set('etag', false);
    server.use((req, res, next) => {
        if (setCorsHeaders(req, res, corsOrigins)) {
            res.sendStatus(204);
            return;
        }
        next();
    });
    server.use((0, compression_1.default)({
        threshold: compressionThreshold,
        filter: (req, res) => {
            const p = req.originalUrl?.split('?')[0] ?? '';
            if (p.startsWith('/uploads')) {
                return false;
            }
            return compression_1.default.filter(req, res);
        },
    }));
    const uploadDir = (0, uploads_path_1.getUploadsDir)();
    try {
        (0, fs_1.mkdirSync)(uploadDir, { recursive: true });
    }
    catch (error) {
        common_1.Logger.warn(`Failed to create uploads dir at ${uploadDir}: ${String(error)}`);
    }
    // Accept both /auth/* and /api/auth/* in serverless deployments.
    server.use('/api', (_req, _res, next) => next());
    server.use('/uploads', express_1.default.static(uploadDir, {
        setHeaders: (res) => {
            (0, missing_upload_response_1.applyUploadResponseHeaders)(res);
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        },
    }));
    server.get(/^\/uploads\/.+$/, (_req, res) => {
        (0, missing_upload_response_1.applyUploadResponseHeaders)(res);
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.type('image/svg+xml').status(200).send(missing_upload_response_1.MISSING_UPLOAD_SVG);
    });
    server.get('/', (_req, res) => {
        res.status(200).send('OK');
    });
    const app = (await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(server)));
    app.use((0, cookie_parser_1.default)());
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use((req, res, next) => {
        const p = req.originalUrl?.split('?')[0] ?? '';
        if (!p.startsWith('/uploads')) {
            res.setHeader('Cache-Control', 'no-store, private, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
        }
        next();
    });
    app.enableCors({
        origin: parseCorsOrigins(),
        credentials: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        maxAge: 600,
        allowedHeaders: [
            'Content-Type',
            'Accept',
            'Authorization',
            'Cache-Control',
            'Pragma',
            'x-device-fingerprint',
            'x-trip-guest-token',
        ],
    });
    // Swagger for serverless entry (enable with ENABLE_SWAGGER=true in production)
    const enableSwagger = process.env.NODE_ENV !== 'production' ||
        process.env.ENABLE_SWAGGER === 'true';
    if (enableSwagger) {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('Waynest API')
            .setDescription('REST API documentation for the Waynest travel platform')
            .setVersion('1.0')
            .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
            .addApiKey({ type: 'apiKey', in: 'header', name: 'x-device-fingerprint' }, 'device-fingerprint')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
        swagger_1.SwaggerModule.setup('docs', app, document, {
            swaggerOptions: {
                persistAuthorization: true,
                tagsSorter: 'alpha',
                operationsSorter: 'alpha',
            },
        });
        common_1.Logger.log(`Swagger UI enabled at /docs and /api/docs (serverless)`);
    }
    else {
        common_1.Logger.log(`Swagger UI disabled for serverless (NODE_ENV=${process.env.NODE_ENV}). Set ENABLE_SWAGGER=true to enable.`);
    }
    await app.init();
    cachedServer = server;
    return cachedServer;
}
const handler = async (req, res) => {
    if (handlePreflight(req, res)) {
        return;
    }
    const server = await bootstrapServer();
    return server(req, res);
};
exports.default = handler;
module.exports = handler;
//# sourceMappingURL=index.js.map