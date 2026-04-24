export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly details: any;

    constructor(message: string, statusCode: number, isOperational = true, details?: any) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;
        Error.captureStackTrace(this)
    }
}

// NOT Found Error
export class NotFoundError extends AppError {
    constructor(message = "Resources Not Found!") {
        super(message, 404)
    }
}

// Validation Error (use for Joi/zod/react-hook-form validation error)
export class ValidationError extends AppError {
    constructor(message = "Invalid request data", details ? : any) {
        super(message, 400, true, details)
    }
}

// Authentication Error 
export class AuthError extends AppError {
    constructor(message = "Authentication failed") {
        super(message, 404)
    }
}

// Forbidden Error(For Insufficient Permissions) 
export class ForbiddenError extends AppError {
    constructor(message = "Forbidden access") {
        super(message, 403)
    }
}

// Database Error (For MongoDB/Postgres Error)
export class DatabaseError extends AppError {
    constructor(message = "Database Error", details? : any) {
        super(message, 500, true, details)
    }
}

// RateLimitting Error 
export class RateLimitError extends AppError {
    constructor(message = "Too many requests, please try again later") {
        super(message, 429)
    }
}