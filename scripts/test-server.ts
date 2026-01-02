import * as crypto from "crypto";
import * as fs from "fs";

import { PATHS } from "../src/config";
import { ReviewServer } from "../src/review-server/index.ts";
import type { Review } from "../src/review-server/types";

const server = new ReviewServer();
const url = await server.start();
console.log("✅ Server running at:", url);

const testDocPath = "/tmp/test-architecture.md";
const testDoc = `# Architecture Plan

## Overview
This is a test document for the review system.

## Components

### 1. API Layer
- REST endpoints for CRUD operations
- Authentication middleware
- Rate limiting

### 2. Database
- PostgreSQL for persistence
- Redis for caching

## Next Steps
1. Implement the API
2. Set up CI/CD
3. Deploy to staging
`;

fs.writeFileSync(testDocPath, testDoc);

const response = await fetch(`${url}/api/reviews`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    documentPath: testDocPath,
    title: "Test Architecture Plan",
  }),
});

const review = (await response.json()) as Review;
console.log("📝 Test review created!");
console.log("🔗 Open in browser:", `${url}/review/${review.id}`);
console.log("\nPress Ctrl+C to stop");

await new Promise(() => {});
