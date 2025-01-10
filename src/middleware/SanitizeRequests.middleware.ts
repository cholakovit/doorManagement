import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import * as DOMPurify from 'dompurify';
import { JSDOM } from "jsdom";

const window = new JSDOM("").window;
const purify = DOMPurify(window as unknown as typeof globalThis);

@Injectable()
export class SanitizeRequestsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (req.body && typeof req.body === "object") {
      Object.keys(req.body).forEach((key) => {
        if (typeof req.body[key] === "string") {
          req.body[key] = purify.sanitize(req.body[key]);
        }
      });
    }

    if (req.query) {
      Object.keys(req.query).forEach((key) => {
        const value = req.query[key];
        if (typeof value === "string") {
          req.query[key] = purify.sanitize(value);
        } else if (Array.isArray(value)) {
          req.query[key] = value.map((item) =>
            typeof item === "string" ? purify.sanitize(item) : item
          ) as string[];
        }
      });
    }

    next();
  }
}